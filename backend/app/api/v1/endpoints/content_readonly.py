# /root/synapse/backend/app/api/v1/endpoints/content_readonly.py
from __future__ import annotations

import hashlib
import json
import os
import glob
from pathlib import Path
from collections import Counter
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Header, HTTPException, Query, Request, Response
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy import text

from app.db.session import SessionLocal
from app.security.policies import can, normalize_role
from app.services.ui_labels import status_label
from app.services.user_state_store import resolve_access_token

router = APIRouter(prefix="/content", tags=["content-readonly"])

PACKS_DIR = os.getenv("CONTENT_PACKS_DIR", "/content_packs").strip() or "/content_packs"
APK_CDN_BASE_URL = os.getenv("APK_CDN_BASE_URL", "").strip().rstrip("/")


PLATFORM_CATALOG_UPDATED_AT = "2026-05-20T00:00:00Z"

PLATFORM_CATALOG_SUBJECTS: list[dict[str, Any]] = [
    {
        "subject": "chemistry",
        "titleRu": "Химия",
        "grades": "7-11",
        "levels": ["school", "exam", "university_intro"],
        "programs": ["Базовый курс", "ОГЭ", "ЕГЭ", "стартовый вузовский уровень"],
        "sections": [
            {
                "titleRu": "Химический двойной взгляд",
                "topicRu": "Ионные реакции в растворах",
                "contentTypes": ["theory", "scheme", "reaction", "lab_mode", "molecular_mode", "tasks", "test", "ai"],
                "difficulty": "basic",
                "statusRu": "проверяемый базовый сценарий",
            },
            {
                "titleRu": "Периодический закон",
                "topicRu": "Положение элемента и свойства атома",
                "contentTypes": ["periodic_table", "flashcards", "mini_quiz", "mnemonics"],
                "difficulty": "basic",
                "statusRu": "готовится тренажёр",
            },
        ],
        "featureRu": "Лабораторный и молекулярный режимы внутри темы",
        "assetKeys": ["module_chemistry", "icon_chemistry", "chemistry_lab_hero", "periodic_table_trainer"],
    },
    {
        "subject": "physics",
        "titleRu": "Физика",
        "grades": "7-11",
        "levels": ["school", "exam", "university_intro"],
        "programs": ["Базовый курс", "ОГЭ", "ЕГЭ", "лабораторные"],
        "sections": [
            {
                "titleRu": "Живой симулятор закона",
                "topicRu": "Закон Ома для участка цепи",
                "contentTypes": ["theory", "experiment", "model", "formula", "graph", "tasks", "test"],
                "difficulty": "basic",
                "statusRu": "формулы и единицы требуют QA перед публикацией",
            }
        ],
        "featureRu": "Параметры, сцена, формула и график связаны в одном сценарии",
        "assetKeys": ["module_physics", "icon_physics", "physics_simulator_hero"],
    },
    {
        "subject": "biology",
        "titleRu": "Биология",
        "grades": "5-11",
        "levels": ["school", "exam", "university_intro"],
        "programs": ["Базовый курс", "ОГЭ", "ЕГЭ", "микроскопия"],
        "sections": [
            {
                "titleRu": "Живой биологический слой",
                "topicRu": "Клетка и органоиды",
                "contentTypes": ["theory", "organism_layer", "cell_layer", "microscope", "observation_questions", "report", "ai"],
                "difficulty": "basic",
                "statusRu": "готовится виртуальный микроскоп",
            }
        ],
        "featureRu": "Переход от организма к клетке, органоиду и молекулярному уровню",
        "assetKeys": ["module_biology", "icon_biology", "biology_microscope_hero"],
    },
    {
        "subject": "ai_mentor",
        "titleRu": "AI-помощник",
        "grades": "5-11 и стартовый вузовский уровень",
        "levels": ["assistant", "teacher_review", "offline_limited"],
        "programs": ["Коротко", "Понятно", "Подробно", "разбор ошибок", "план повторения"],
        "sections": [
            {
                "titleRu": "Предметный помощник",
                "topicRu": "Вопрос, подсказка, разбор ошибки и похожая задача",
                "contentTypes": ["ai_answer", "hint", "mistake_review", "next_task", "exam_ticket_plan"],
                "difficulty": "adaptive",
                "statusRu": "онлайн-режим, офлайн только по скачанным материалам",
            }
        ],
        "featureRu": "AI не ставит финальную оценку, а предлагает предварительный разбор",
        "assetKeys": ["module_ai", "icon_ai"],
    },
]

PLATFORM_CATALOG_QA: dict[str, Any] = {
    "workflowRu": ["Черновик", "Автор", "Научный редактор", "Методист", "Content QA", "Юридическая проверка", "Публикация", "Версионирование"],
    "requiredMetadata": [
        "subject", "level", "grade", "program_type", "textbook_reference_type", "section", "topic", "content_type",
        "difficulty", "source_list", "license_status", "verified_by", "reviewed_by", "updated_at", "version",
        "content_hash", "publication_status",
    ],
    "publishGateRu": "Контент нельзя публиковать без источников, лицензии, проверки и даты обновления.",
}

PLATFORM_CATALOG_SOURCES: list[dict[str, Any]] = [
    {
        "titleRu": "ФГОС/ФОП и примерные образовательные программы",
        "organizationRu": "Официальные образовательные документы РФ",
        "licenseStatus": "reference_only",
        "usageRu": "Использовать как структуру и требования, не копировать авторские тексты учебников.",
        "trustLevel": "high",
    },
    {
        "titleRu": "Собственные авторские материалы методистов",
        "organizationRu": "Allchemist content team",
        "licenseStatus": "owned_or_commissioned",
        "usageRu": "Основной источник объяснений, задач, иллюстраций и методических разборов.",
        "trustLevel": "high_after_review",
    },
    {
        "titleRu": "Открытые справочники и датасеты с разрешённой лицензией",
        "organizationRu": "Проверяемые научные и образовательные источники",
        "licenseStatus": "license_required_per_source",
        "usageRu": "Фиксировать ссылку, лицензию, дату доступа и допустимость использования для каждого блока.",
        "trustLevel": "medium_to_high_after_verification",
    },
]

EXAM_BLUEPRINTS: dict[str, dict[str, Any]] = {
    "oge": {
        "titleRu": "ОГЭ",
        "descriptionRu": "Тренировочная подборка по школьным темам с разбором ошибок и повторением слабых мест.",
        "defaultCount": 8,
        "allowedSubjects": ["chemistry", "physics", "biology"],
    },
    "ege": {
        "titleRu": "ЕГЭ",
        "descriptionRu": "Вариант с базовыми и повышенными заданиями, источниками и планом повторения.",
        "defaultCount": 10,
        "allowedSubjects": ["chemistry", "physics", "biology"],
    },
    "mcko": {
        "titleRu": "МЦКО",
        "descriptionRu": "Диагностическая работа по темам программы без недавних повторов.",
        "defaultCount": 6,
        "allowedSubjects": ["chemistry", "physics", "biology"],
    },
    "vpr": {
        "titleRu": "ВПР",
        "descriptionRu": "Короткий вариант для проверки понимания темы и типовых ошибок.",
        "defaultCount": 6,
        "allowedSubjects": ["chemistry", "physics", "biology"],
    },
    "ticket": {
        "titleRu": "Билеты",
        "descriptionRu": "План подготовки по списку вопросов или тексту билета.",
        "defaultCount": 5,
        "allowedSubjects": ["chemistry", "physics", "biology"],
    },
}

EXAM_TOPIC_BANK: dict[str, list[dict[str, Any]]] = {
    "chemistry": [
        {"topicRu": "Ионные реакции в растворах", "sectionRu": "Общая химия", "skillRu": "распознавать ионный обмен", "difficulty": "basic"},
        {"topicRu": "Периодический закон", "sectionRu": "Строение атома", "skillRu": "связывать положение элемента и свойства", "difficulty": "basic"},
        {"topicRu": "Окислительно-восстановительные реакции", "sectionRu": "Химические реакции", "skillRu": "определять степени окисления", "difficulty": "medium"},
        {"topicRu": "Кислоты, основания и соли", "sectionRu": "Неорганическая химия", "skillRu": "прогнозировать продукты реакции", "difficulty": "medium"},
    ],
    "physics": [
        {"topicRu": "Закон Ома", "sectionRu": "Электродинамика", "skillRu": "рассчитывать силу тока, напряжение и сопротивление", "difficulty": "basic"},
        {"topicRu": "Равномерное движение", "sectionRu": "Механика", "skillRu": "читать графики движения", "difficulty": "basic"},
        {"topicRu": "Линзы", "sectionRu": "Оптика", "skillRu": "строить изображение и применять формулу тонкой линзы", "difficulty": "medium"},
        {"topicRu": "Тепловые процессы", "sectionRu": "Термодинамика", "skillRu": "работать с количеством теплоты", "difficulty": "medium"},
    ],
    "biology": [
        {"topicRu": "Клетка и органоиды", "sectionRu": "Цитология", "skillRu": "связывать органоид и функцию", "difficulty": "basic"},
        {"topicRu": "Фотосинтез", "sectionRu": "Ботаника", "skillRu": "объяснять уровни процесса", "difficulty": "medium"},
        {"topicRu": "Наследование признаков", "sectionRu": "Генетика", "skillRu": "решать простые генетические задачи", "difficulty": "medium"},
        {"topicRu": "Пищеварение", "sectionRu": "Анатомия и физиология", "skillRu": "связывать орган, фермент и функцию", "difficulty": "basic"},
    ],
}


def _catalog_hash() -> str:
    payload = json.dumps(
        {
            "subjects": PLATFORM_CATALOG_SUBJECTS,
            "qa": PLATFORM_CATALOG_QA,
            "sources": PLATFORM_CATALOG_SOURCES,
            "updated_at": PLATFORM_CATALOG_UPDATED_AT,
        },
        ensure_ascii=False,
        sort_keys=True,
    ).encode("utf-8")
    return _sha256_bytes(payload)


def _normalize_subject(subject: str | None) -> str:
    value = (subject or "chemistry").strip().lower()
    return value if value in EXAM_TOPIC_BANK else "chemistry"


def _normalize_exam_type(exam_type: str | None) -> str:
    value = (exam_type or "oge").strip().lower()
    return value if value in EXAM_BLUEPRINTS else "oge"


def _build_exam_variant(subject: str, exam_type: str, count: int, user_seed: str | None = None, exclude_recent: list[str] | None = None) -> dict[str, Any]:
    subject = _normalize_subject(subject)
    exam_type = _normalize_exam_type(exam_type)
    blueprint = EXAM_BLUEPRINTS[exam_type]
    bank = EXAM_TOPIC_BANK[subject]
    exclude = set(exclude_recent or [])
    seed_raw = f"{subject}:{exam_type}:{user_seed or datetime.utcnow().strftime('%Y-%m-%d')}"
    offset = int(hashlib.sha256(seed_raw.encode("utf-8")).hexdigest()[:8], 16) % len(bank)
    selected: list[dict[str, Any]] = []

    for idx in range(max(1, min(count, 20)) + len(bank)):
        topic = bank[(offset + idx) % len(bank)]
        task_id = f"{exam_type}_{subject}_{idx + 1}_{hashlib.sha256((seed_raw + topic['topicRu'] + str(idx)).encode('utf-8')).hexdigest()[:8]}"
        if task_id in exclude:
            continue
        selected.append({
            "id": task_id,
            "number": len(selected) + 1,
            "subject": subject,
            "sectionRu": topic["sectionRu"],
            "topicRu": topic["topicRu"],
            "difficulty": topic["difficulty"],
            "format": "short_answer" if len(selected) % 3 else "multiple_choice",
            "promptRu": f"Проверьте навык: {topic['skillRu']}. Задание авторское, опубликовано как тренировочный шаблон до методической проверки.",
            "skillRu": topic["skillRu"],
            "sourcePolicyRu": "Авторский тренировочный шаблон; перед публикацией финального варианта нужны verified_by, reviewed_by и license_status.",
            "publicationStatus": "draft_training_template",
        })
        if len(selected) >= max(1, min(count, 20)):
            break

    return {
        "examType": exam_type,
        "examTitleRu": blueprint["titleRu"],
        "subject": subject,
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "variantId": hashlib.sha256((seed_raw + str(count)).encode("utf-8")).hexdigest()[:16],
        "questions": selected,
        "rulesRu": [
            "Задания можно решать в любом порядке до завершения варианта.",
            "Недавние повторы исключаются, если клиент передал excludeRecentIds.",
            "После сдачи возврат возможен только по правилу учителя или режима работы.",
        ],
        "analysisPolicyRu": "После попытки система должна связать ошибки с темами и предложить повторение слабых мест.",
        "qa": PLATFORM_CATALOG_QA,
    }


def _analyze_ticket_text(text_value: str, subject: str) -> dict[str, Any]:
    subject = _normalize_subject(subject)
    normalized = text_value.lower()
    matches: list[dict[str, Any]] = []
    for topic in EXAM_TOPIC_BANK[subject]:
        words = [w for w in topic["topicRu"].lower().replace(",", " ").split() if len(w) > 3]
        section_words = [w for w in topic["sectionRu"].lower().split() if len(w) > 3]
        score = sum(1 for word in words + section_words if word in normalized)
        if score:
            matches.append({**topic, "matchScore": score})

    if not matches:
        matches = [{**topic, "matchScore": 0} for topic in EXAM_TOPIC_BANK[subject][:2]]

    return {
        "subject": subject,
        "detectedTopics": matches[:6],
        "repeatPlanRu": [
            f"Повторить тему: {item['topicRu']} ({item['sectionRu']})" for item in matches[:4]
        ],
        "practicePlanRu": [
            "Пройти краткую теорию по найденным темам.",
            "Решить 3-5 авторских задач с разбором ошибок.",
            "Попросить AI объяснить непонятный шаг в режиме 'Понятно'.",
            "Собрать мини-вариант без недавних повторов.",
        ],
        "sourcePolicyRu": "Текст билета используется только для определения тем и построения плана; он не публикуется как учебный контент.",
        "publicationStatus": "user_private_analysis",
    }


def _require_auth_user(authorization: str | None) -> Dict[str, Any]:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is required")
    prefix = "Bearer "
    if not authorization.startswith(prefix):
        raise HTTPException(status_code=401, detail="Bearer token is required")
    token = authorization[len(prefix):].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Bearer token is required")
    try:
        return resolve_access_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e


def _require_content_manager(authorization: str | None) -> Dict[str, Any]:
    auth_user = _require_auth_user(authorization)
    role = normalize_role(auth_user.get("role"))
    if not can(role, "content:manage"):
        raise HTTPException(status_code=403, detail="Недостаточно прав для управления контентом.")
    return auth_user


def _safe_id(prefix: str, value: str) -> str:
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]
    return f"{prefix}_{digest}"


def _json_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []
    return []


def _content_block_hash(payload: Dict[str, Any]) -> str:
    keys = [
        "subject", "level", "grade", "programType", "textbookReferenceType", "section", "topic",
        "contentType", "difficulty", "titleRu", "bodyRu", "sourceList", "licenseStatus",
    ]
    compact = {key: payload.get(key) for key in keys}
    return hashlib.sha256(json.dumps(compact, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()


def _publish_gate_missing(row: Dict[str, Any]) -> list[str]:
    source_list = _json_list(row.get("source_list"))
    missing: list[str] = []
    checks = {
        "source_list": bool(source_list),
        "license_status": str(row.get("license_status") or "") in {"approved", "owned_or_commissioned", "open_license", "reference_only"},
        "verified_by": bool(str(row.get("verified_by") or "").strip()),
        "reviewed_by": bool(str(row.get("reviewed_by") or "").strip()),
        "legal_status": str(row.get("legal_status") or "") in {"approved", "reference_only", "owned_or_commissioned"},
        "content_hash": bool(str(row.get("content_hash") or "").strip()),
    }
    for key, ok in checks.items():
        if not ok:
            missing.append(key)
    return missing


def _existing_source_ids(sess, source_list: list[Any]) -> set[str]:
    ids = [str(item).strip() for item in source_list if str(item or "").strip()]
    if not ids:
        return set()
    rows = sess.execute(
        text("SELECT id FROM content_sources WHERE id = ANY(:ids)"),
        {"ids": ids},
    ).mappings().all()
    return {str(row.get("id")) for row in rows}


def _source_reference_missing(sess, source_list: list[Any]) -> list[str]:
    ids = [str(item).strip() for item in source_list if str(item or "").strip()]
    existing = _existing_source_ids(sess, ids)
    return [source_id for source_id in ids if source_id not in existing]


def _content_block_out(row: Dict[str, Any]) -> Dict[str, Any]:
    missing = _publish_gate_missing(row)
    return {
        "id": row.get("id"),
        "titleRu": row.get("title_ru"),
        "bodyRu": row.get("body_ru"),
        "subject": row.get("subject"),
        "section": row.get("section"),
        "topic": row.get("topic"),
        "contentType": row.get("content_type"),
        "difficulty": row.get("difficulty"),
        "version": row.get("version"),
        "publishStatus": row.get("publish_status"),
        "licenseStatus": row.get("license_status"),
        "legalStatus": row.get("legal_status"),
        "verifiedBy": row.get("verified_by"),
        "reviewedBy": row.get("reviewed_by"),
        "sourceList": _json_list(row.get("source_list")),
        "contentHash": row.get("content_hash"),
        "updatedAt": row.get("updated_at").isoformat() if hasattr(row.get("updated_at"), "isoformat") else row.get("updated_at"),
        "publishGate": {
            "ready": not missing,
            "missingFields": missing,
            "messageRu": "Готово к публикации." if not missing else "Нельзя публиковать: не хватает источников, лицензии или проверки.",
        },
    }


def _content_queue_out(row: Dict[str, Any]) -> Dict[str, Any]:
    out = _content_block_out(row)
    status = str(out.get("publishStatus") or "draft")
    gate = out.get("publishGate") or {}
    out["queueLabelRu"] = {
        "draft": "Черновики",
        "author_review": "Авторская проверка",
        "scientific_review": "Научный редактор",
        "methodist_review": "Методист",
        "content_qa": "Content QA",
        "legal_review": "Юридическая проверка",
        "published": "Опубликовано",
        "archived": "Архив",
    }.get(status, status)
    out["nextActionRu"] = "Можно публиковать после финального подтверждения." if gate.get("ready") else "Закрыть publish gate: " + ", ".join(gate.get("missingFields") or [])
    return out


def _content_source_out(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": row.get("id"),
        "titleRu": row.get("title_ru"),
        "organizationRu": row.get("organization_ru"),
        "url": row.get("url"),
        "licenseStatus": row.get("license_status"),
        "usageRu": row.get("usage_ru"),
        "trustLevel": row.get("trust_level"),
        "updatedAt": row.get("updated_at").isoformat() if hasattr(row.get("updated_at"), "isoformat") else row.get("updated_at"),
    }


def _bounded_limit(value: int, default: int = 20, maximum: int = 100) -> int:
    try:
        parsed = int(value)
    except Exception:
        parsed = default
    return max(1, min(maximum, parsed))


def _read_apk_release_metadata() -> dict[str, Any]:
    for root in [Path(PACKS_DIR), Path("/root/synapse/content_packs")]:
        path = root / "allchemist-apk-latest.json"
        if path.exists() and path.is_file():
            try:
                parsed = json.loads(path.read_text(encoding="utf-8"))
                return parsed if isinstance(parsed, dict) else {}
            except Exception:
                return {}
    return {}


def _resolve_latest_layer_a_apk() -> tuple[str, str]:
    metadata = _read_apk_release_metadata()
    search_roots = [Path(PACKS_DIR), Path("/root/synapse/content_packs")]
    metadata_apk = str(metadata.get("apkFile") or "").strip()
    if metadata_apk:
        for root in search_roots:
            path = root / metadata_apk
            if path.exists() and path.is_file():
                return str(path), path.name

    patterns = ["allchemist-*.apk", "synapse-layer-a-debug-*.apk", "synapse-arm64-release-*.apk", "*.apk"]

    candidates: list[Path] = []
    seen: set[str] = set()
    for root in search_roots:
        if not root.exists():
            continue
        for pattern in patterns:
            for path in root.glob(pattern):
                if not path.is_file():
                    continue
                key = str(path.resolve())
                if key in seen:
                    continue
                seen.add(key)
                candidates.append(path)

    if not candidates:
        raise FileNotFoundError("layer-a apk not found")

    latest = max(candidates, key=lambda p: p.stat().st_mtime)
    return str(latest), latest.name


def _latest_apk_metadata(apk_path: str, apk_name: str) -> dict[str, Any]:
    st = os.stat(apk_path)
    metadata = _read_apk_release_metadata()

    version_name = str(metadata.get("versionName") or "1.0.0")
    version_code = int(metadata.get("versionCode") or 1)
    notes = metadata.get("releaseNotes") if isinstance(metadata.get("releaseNotes"), list) else []
    local_download_url = "/api/v1/content/downloads/apk/latest"
    cdn_download_url = f"{APK_CDN_BASE_URL}/{apk_name}" if APK_CDN_BASE_URL else ""
    return {
        "appName": "Алхимик",
        "platform": "android",
        "versionName": version_name,
        "versionCode": version_code,
        "releaseTitle": metadata.get("releaseTitle") or f"Версия {version_name}",
        "releaseDate": metadata.get("releaseDate") or datetime.utcfromtimestamp(st.st_mtime).strftime("%Y-%m-%d"),
        "releaseNotes": notes,
        "downloadUrl": cdn_download_url or local_download_url,
        "localDownloadUrl": local_download_url,
        "cdnDownloadUrl": cdn_download_url or None,
        "legacyDownloadUrl": "/api/v1/content/downloads/apk/layer-a-debug",
        "fileName": apk_name,
        "sizeBytes": st.st_size,
        "sha256": hashlib.sha256(Path(apk_path).read_bytes()).hexdigest(),
        "installAdviceRu": "Если Алхимик уже установлен с production-подписью, устанавливайте новую версию поверх старой. Так локальные данные приложения сохранятся.",
        "debugReinstallNoticeRu": "Если стояла ранняя тестовая версия, Android может попросить удалить старое приложение из-за другой подписи. Перед удалением войдите в аккаунт и выполните синхронизацию в кабинете.",
    }


def _sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def _file_etag(path: str) -> str:
    st = os.stat(path)
    raw = f"{st.st_size}:{int(st.st_mtime)}:{os.path.basename(path)}".encode("utf-8")
    return '"' + _sha256_bytes(raw)[:32] + '"'


def _file_last_modified_http(path: str) -> str:
    st = os.stat(path)
    dt = datetime.utcfromtimestamp(st.st_mtime)
    return dt.strftime("%a, %d %b %Y %H:%M:%S GMT")


def _load_pack(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _find_pack_file(pack_id: str) -> str:
    # поддержка вариантов имён: core_pack_v1.json / core_v1.json / core_pack_v2.json etc
    candidates = sorted(glob.glob(os.path.join(PACKS_DIR, "*.json")))
    # приоритет: pack_id в начале имени
    for p in candidates:
        base = os.path.basename(p)
        if base.startswith(pack_id) and "_v" in base:
            return p
    # fallback: pack_id содержится
    for p in candidates:
        if pack_id in os.path.basename(p):
            return p
    raise FileNotFoundError(pack_id)


def _pack_content_hash(doc: Dict[str, Any]) -> str:
    # "конфликт-политика": если version не увеличили, но контент менялся
    payload = json.dumps(doc, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return _sha256_bytes(payload)


def _infer_lang_from_id(s: str) -> Optional[str]:
    if not s:
        return None
    if s.endswith("_ru"):
        return "ru"
    if s.endswith("_en"):
        return "en"
    return None


@router.get("/packs")
def list_packs() -> Dict[str, Any]:
    # индексируем файлы в CONTENT_PACKS_DIR
    packs: List[Dict[str, Any]] = []
    for path in sorted(glob.glob(os.path.join(PACKS_DIR, "*.json"))):
        base = os.path.basename(path)
        if "_pack_" not in base and not base.startswith("core"):
            continue
        try:
            doc = _load_pack(path)
            pack_id = doc.get("pack_id") or doc.get("id") or "content_pack"
            version = int(doc.get("version") or 1)
            updated_at = doc.get("updated_at") or doc.get("generated_at")
            etag = _file_etag(path)
            last_modified = _file_last_modified_http(path)
            content_hash = _pack_content_hash(doc)
            size_bytes = os.stat(path).st_size
            packs.append({
                "pack_id": str(pack_id),
                "version": version,
                "updated_at": updated_at,
                "etag": etag,
                "last_modified": last_modified,
                "content_hash": content_hash,
                "size_bytes": size_bytes,
                "file": base,
            })
        except Exception:
            continue

    return {"packs": packs, "dir": PACKS_DIR}


@router.get("/platform-catalog")
def platform_catalog() -> Dict[str, Any]:
    """Public structured catalog for the web/mobile learning clients.

    The endpoint describes what can be shown safely to users: subject structure,
    module scenarios, source policy, and QA gates. It does not publish unverified
    lesson text as finished educational content.
    """
    return {
        "catalogVersion": "2026.05.20-web-learning-client",
        "updatedAt": PLATFORM_CATALOG_UPDATED_AT,
        "contentHash": _catalog_hash(),
        "language": "ru",
        "publicationStatus": "structured_plan_with_verified_gates",
        "publicationStatusLabelRu": status_label("structured_plan_with_verified_gates"),
        "subjects": PLATFORM_CATALOG_SUBJECTS,
        "exams": ["ОГЭ", "ЕГЭ", "МЦКО", "ВПР", "итоговая контрольная", "зачёт", "билеты"],
        "aiStatuses": ["AI онлайн", "AI офлайн", "AI отключён учителем", "AI отключён для этой работы", "AI недоступен"],
        "offlinePolicyRu": "Сначала загружаются metadata; медиа, лабораторные, модели и офлайн AI-индекс скачиваются только по выбору пользователя или по осторожной настройке.",
        "accessPolicyRu": "Итоговый доступ пользователя является объединением школьной лицензии, личных покупок, семейного доступа, AI-пакетов и ручных выдач.",
        "qa": PLATFORM_CATALOG_QA,
        "sources": PLATFORM_CATALOG_SOURCES,
    }


@router.get("/exams/blueprints")
def exam_blueprints() -> Dict[str, Any]:
    return {
        "examTypes": EXAM_BLUEPRINTS,
        "subjects": list(EXAM_TOPIC_BANK.keys()),
        "rulesRu": [
            "Варианты собираются из банка тем и задач с учётом сложности и истории пользователя.",
            "Одинаковый вариант не должен выдаваться каждый раз; клиент может передать seed и excludeRecentIds.",
            "Финальные опубликованные задания требуют источников, лицензии, verified_by и reviewed_by.",
        ],
        "qa": PLATFORM_CATALOG_QA,
    }


@router.post("/exams/generate")
def generate_exam_variant(payload: Dict[str, Any] = Body(default_factory=dict)) -> Dict[str, Any]:
    subject = _normalize_subject(str(payload.get("subject") or "chemistry"))
    exam_type = _normalize_exam_type(str(payload.get("examType") or payload.get("exam_type") or "oge"))
    blueprint = EXAM_BLUEPRINTS[exam_type]
    count = int(payload.get("count") or blueprint["defaultCount"])
    user_seed = str(payload.get("seed") or payload.get("userId") or payload.get("user_id") or "") or None
    exclude_recent = payload.get("excludeRecentIds") or payload.get("exclude_recent_ids") or []
    if not isinstance(exclude_recent, list):
        exclude_recent = []
    if subject not in blueprint["allowedSubjects"]:
        raise HTTPException(status_code=400, detail="Этот тип экзамена недоступен для выбранного предмета.")
    return _build_exam_variant(subject, exam_type, count, user_seed=user_seed, exclude_recent=[str(x) for x in exclude_recent])


@router.post("/tickets/analyze")
def analyze_ticket(payload: Dict[str, Any] = Body(default_factory=dict)) -> Dict[str, Any]:
    text_value = str(payload.get("text") or payload.get("ticket") or "").strip()
    if len(text_value) < 5:
        raise HTTPException(status_code=400, detail="Добавьте текст билета или список вопросов.")
    subject = _normalize_subject(str(payload.get("subject") or "chemistry"))
    result = _analyze_ticket_text(text_value, subject)
    result["ticketHash"] = hashlib.sha256(text_value.encode("utf-8")).hexdigest()[:16]
    result["updatedAt"] = datetime.utcnow().isoformat() + "Z"
    return result


@router.get("/qa/summary")
def content_qa_summary() -> Dict[str, Any]:
    sess = SessionLocal()
    try:
        rows = sess.execute(
            text(
                """
                SELECT publish_status, COUNT(*) AS count
                FROM content_blocks
                GROUP BY publish_status
                ORDER BY publish_status
                """
            )
        ).mappings().all()
        latest = sess.execute(
            text(
                """
                SELECT id, title_ru, body_ru, subject, section, topic, content_type, difficulty, publish_status,
                       license_status, legal_status, verified_by, reviewed_by, source_list, content_hash, version, updated_at
                FROM content_blocks
                ORDER BY updated_at DESC
                LIMIT 8
                """
            )
        ).mappings().all()
        return {
            "workflowRu": PLATFORM_CATALOG_QA["workflowRu"],
            "publishGateRu": PLATFORM_CATALOG_QA["publishGateRu"],
            "requiredMetadata": PLATFORM_CATALOG_QA["requiredMetadata"],
            "statusCounts": {str(row["publish_status"]): int(row["count"] or 0) for row in rows},
            "latestBlocks": [_content_block_out(dict(row)) for row in latest],
        }
    finally:
        sess.close()


@router.get("/qa/sources")
def list_content_sources(
    q: str | None = Query(default=None, max_length=120),
    license_status: str | None = Query(default=None, alias="licenseStatus", max_length=64),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    authorization: str | None = Header(default=None),
) -> Dict[str, Any]:
    _require_content_manager(authorization)
    needle = f"%{(q or '').strip()}%"
    license_filter = (license_status or "").strip()
    bounded_limit = _bounded_limit(limit)
    sess = SessionLocal()
    try:
        rows = sess.execute(
            text(
                """
                SELECT id, title_ru, organization_ru, url, license_status, usage_ru, trust_level, updated_at
                FROM content_sources
                WHERE (:q = '%%' OR id ILIKE :q OR title_ru ILIKE :q OR COALESCE(organization_ru, '') ILIKE :q)
                  AND (:license_status = '' OR license_status = :license_status)
                ORDER BY updated_at DESC
                LIMIT :limit OFFSET :offset
                """
            ),
            {"q": needle, "license_status": license_filter, "limit": bounded_limit, "offset": offset},
        ).mappings().all()
        total = sess.execute(
            text(
                """
                SELECT COUNT(*) AS count
                FROM content_sources
                WHERE (:q = '%%' OR id ILIKE :q OR title_ru ILIKE :q OR COALESCE(organization_ru, '') ILIKE :q)
                  AND (:license_status = '' OR license_status = :license_status)
                """
            ),
            {"q": needle, "license_status": license_filter},
        ).mappings().first()
        return {"items": [_content_source_out(dict(row)) for row in rows], "total": int((total or {}).get("count") or 0), "limit": bounded_limit, "offset": offset}
    finally:
        sess.close()


@router.get("/qa/blocks")
def list_content_blocks(
    q: str | None = Query(default=None, max_length=120),
    subject: str | None = Query(default=None, max_length=40),
    publish_status: str | None = Query(default=None, alias="publishStatus", max_length=64),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    authorization: str | None = Header(default=None),
) -> Dict[str, Any]:
    _require_content_manager(authorization)
    needle = f"%{(q or '').strip()}%"
    subject_filter = (subject or "").strip()
    status_filter = (publish_status or "").strip()
    bounded_limit = _bounded_limit(limit)
    sess = SessionLocal()
    try:
        rows = sess.execute(
            text(
                """
                SELECT id, title_ru, body_ru, subject, section, topic, content_type, difficulty, publish_status,
                       license_status, legal_status, verified_by, reviewed_by, source_list, content_hash, version, updated_at
                FROM content_blocks
                WHERE (:q = '%%' OR id ILIKE :q OR title_ru ILIKE :q OR section ILIKE :q OR topic ILIKE :q)
                  AND (:subject = '' OR subject = :subject)
                  AND (:publish_status = '' OR publish_status = :publish_status)
                ORDER BY updated_at DESC
                LIMIT :limit OFFSET :offset
                """
            ),
            {"q": needle, "subject": subject_filter, "publish_status": status_filter, "limit": bounded_limit, "offset": offset},
        ).mappings().all()
        total = sess.execute(
            text(
                """
                SELECT COUNT(*) AS count
                FROM content_blocks
                WHERE (:q = '%%' OR id ILIKE :q OR title_ru ILIKE :q OR section ILIKE :q OR topic ILIKE :q)
                  AND (:subject = '' OR subject = :subject)
                  AND (:publish_status = '' OR publish_status = :publish_status)
                """
            ),
            {"q": needle, "subject": subject_filter, "publish_status": status_filter},
        ).mappings().first()
        return {"items": [_content_block_out(dict(row)) for row in rows], "total": int((total or {}).get("count") or 0), "limit": bounded_limit, "offset": offset}
    finally:
        sess.close()


@router.get("/qa/blocks/{content_id}/events")
def list_content_block_events(
    content_id: str,
    limit: int = Query(default=50, ge=1, le=100),
    authorization: str | None = Header(default=None),
) -> Dict[str, Any]:
    _require_content_manager(authorization)
    bounded_limit = _bounded_limit(limit, default=50)
    sess = SessionLocal()
    try:
        exists = sess.execute(text("SELECT id FROM content_blocks WHERE id = :id"), {"id": content_id}).mappings().first()
        if not exists:
            raise HTTPException(status_code=404, detail="Контентный блок не найден.")
        rows = sess.execute(
            text(
                """
                SELECT id, content_id, from_status, to_status, actor, comment, created_at
                FROM content_qa_events
                WHERE content_id = :content_id
                ORDER BY created_at DESC, id DESC
                LIMIT :limit
                """
            ),
            {"content_id": content_id, "limit": bounded_limit},
        ).mappings().all()
        return {
            "contentId": content_id,
            "items": [
                {
                    "id": row.get("id"),
                    "contentId": row.get("content_id"),
                    "fromStatus": row.get("from_status"),
                    "toStatus": row.get("to_status"),
                    "actor": row.get("actor"),
                    "comment": row.get("comment"),
                    "createdAt": row.get("created_at").isoformat() if hasattr(row.get("created_at"), "isoformat") else row.get("created_at"),
                }
                for row in rows
            ],
            "limit": bounded_limit,
        }
    finally:
        sess.close()


@router.get("/qa/queues")
def content_qa_queues(
    subject: str | None = Query(default=None, max_length=40),
    limit: int = Query(default=12, ge=1, le=50),
    authorization: str | None = Header(default=None),
) -> Dict[str, Any]:
    _require_content_manager(authorization)
    subject_filter = (subject or "").strip()
    statuses = ["draft", "author_review", "scientific_review", "methodist_review", "content_qa", "legal_review", "published", "archived"]
    bounded_limit = _bounded_limit(limit, default=12, maximum=50)
    sess = SessionLocal()
    try:
        counts = sess.execute(
            text(
                """
                SELECT publish_status, COUNT(*) AS count
                FROM content_blocks
                WHERE (:subject = '' OR subject = :subject)
                GROUP BY publish_status
                """
            ),
            {"subject": subject_filter},
        ).mappings().all()
        count_map = {str(row.get("publish_status") or "draft"): int(row.get("count") or 0) for row in counts}
        queues = []
        for status in statuses:
            rows = sess.execute(
                text(
                    """
                    SELECT id, title_ru, body_ru, subject, section, topic, content_type, difficulty, publish_status,
                           license_status, legal_status, verified_by, reviewed_by, source_list, content_hash, version, updated_at
                    FROM content_blocks
                    WHERE publish_status = :status
                      AND (:subject = '' OR subject = :subject)
                    ORDER BY updated_at DESC
                    LIMIT :limit
                    """
                ),
                {"status": status, "subject": subject_filter, "limit": bounded_limit},
            ).mappings().all()
            queues.append({
                "status": status,
                "labelRu": _content_queue_out({"publish_status": status}).get("queueLabelRu"),
                "count": count_map.get(status, 0),
                "items": [_content_queue_out(dict(row)) for row in rows],
            })
        return {
            "workflowRu": PLATFORM_CATALOG_QA["workflowRu"],
            "noAutopublishGateRu": "Публикация не выполняется автоматически: блок должен пройти review-маршрут и publish gate.",
            "subject": subject_filter or None,
            "queues": queues,
        }
    finally:
        sess.close()


@router.post("/qa/sources")
def upsert_content_source(
    payload: Dict[str, Any] = Body(default_factory=dict),
    authorization: str | None = Header(default=None),
) -> Dict[str, Any]:
    _require_content_manager(authorization)
    title = str(payload.get("titleRu") or payload.get("title") or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Укажите название источника.")
    source_id = str(payload.get("id") or _safe_id("src", title + str(payload.get("url") or "")))
    sess = SessionLocal()
    try:
        duplicate = sess.execute(
            text(
                """
                SELECT id, title_ru, organization_ru, url, license_status, usage_ru, trust_level, updated_at
                FROM content_sources
                WHERE id <> :id
                  AND (
                    (:url <> '' AND COALESCE(url, '') = :url)
                    OR (LOWER(title_ru) = LOWER(:title_ru) AND LOWER(COALESCE(organization_ru, '')) = LOWER(:organization_ru))
                  )
                ORDER BY updated_at DESC
                LIMIT 1
                """
            ),
            {
                "id": source_id,
                "title_ru": title,
                "organization_ru": str(payload.get("organizationRu") or payload.get("organization") or "").strip(),
                "url": str(payload.get("url") or "").strip(),
            },
        ).mappings().first()
        if duplicate:
            raise HTTPException(
                status_code=409,
                detail={
                    "messageRu": "Похожий источник уже есть в реестре. Выберите существующий источник вместо создания дубля.",
                    "duplicate": _content_source_out(dict(duplicate)),
                },
            )
        sess.execute(
            text(
                """
                INSERT INTO content_sources (id, title_ru, organization_ru, url, license_status, usage_ru, trust_level, accessed_at, updated_at)
                VALUES (:id, :title_ru, :organization_ru, :url, :license_status, :usage_ru, :trust_level, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE SET
                    title_ru = EXCLUDED.title_ru,
                    organization_ru = EXCLUDED.organization_ru,
                    url = EXCLUDED.url,
                    license_status = EXCLUDED.license_status,
                    usage_ru = EXCLUDED.usage_ru,
                    trust_level = EXCLUDED.trust_level,
                    updated_at = NOW()
                """
            ),
            {
                "id": source_id,
                "title_ru": title,
                "organization_ru": payload.get("organizationRu") or payload.get("organization"),
                "url": payload.get("url"),
                "license_status": payload.get("licenseStatus") or "unknown",
                "usage_ru": payload.get("usageRu") or "Требуется проверка допустимости использования.",
                "trust_level": payload.get("trustLevel") or "unverified",
            },
        )
        sess.commit()
        return {"id": source_id, "titleRu": title, "statusLabelRu": "Источник сохранён"}
    finally:
        sess.close()


@router.post("/qa/blocks")
def upsert_content_block(
    payload: Dict[str, Any] = Body(default_factory=dict),
    authorization: str | None = Header(default=None),
) -> Dict[str, Any]:
    auth_user = _require_content_manager(authorization)
    title = str(payload.get("titleRu") or "").strip()
    body = str(payload.get("bodyRu") or "").strip()
    subject = _normalize_subject(str(payload.get("subject") or "chemistry"))
    section = str(payload.get("section") or "").strip()
    topic = str(payload.get("topic") or "").strip()
    content_type = str(payload.get("contentType") or "theory").strip()
    if not title or not body or not section or not topic:
        raise HTTPException(status_code=400, detail="Нужны titleRu, bodyRu, section и topic.")
    content_id = str(payload.get("id") or _safe_id("cnt", subject + section + topic + content_type + title))
    source_list = payload.get("sourceList") if isinstance(payload.get("sourceList"), list) else []
    content_hash = _content_block_hash({**payload, "subject": subject, "sourceList": source_list})
    sess = SessionLocal()
    try:
        duplicate = sess.execute(
            text(
                """
                SELECT id, title_ru, body_ru, subject, section, topic, content_type, difficulty, publish_status,
                       license_status, legal_status, verified_by, reviewed_by, source_list, content_hash, version, updated_at
                FROM content_blocks
                WHERE id <> :id AND content_hash = :content_hash
                ORDER BY updated_at DESC
                LIMIT 1
                """
            ),
            {"id": content_id, "content_hash": content_hash},
        ).mappings().first()
        if duplicate:
            raise HTTPException(
                status_code=409,
                detail={
                    "messageRu": "Такой контентный блок уже есть. Откройте существующий блок вместо создания дубля.",
                    "duplicate": _content_block_out(dict(duplicate)),
                },
            )
        sess.execute(
            text(
                """
                INSERT INTO content_blocks (
                    id, subject, level, grade, program_type, textbook_reference_type, section, topic,
                    content_type, difficulty, title_ru, body_ru, source_list, license_status, legal_status,
                    verified_by, reviewed_by, created_by, publish_status, version, content_hash, updated_at
                ) VALUES (
                    :id, :subject, :level, :grade, :program_type, :textbook_reference_type, :section, :topic,
                    :content_type, :difficulty, :title_ru, :body_ru, CAST(:source_list AS jsonb), :license_status, :legal_status,
                    :verified_by, :reviewed_by, :created_by, :publish_status, :version, :content_hash, NOW()
                )
                ON CONFLICT (id) DO UPDATE SET
                    subject = EXCLUDED.subject,
                    level = EXCLUDED.level,
                    grade = EXCLUDED.grade,
                    program_type = EXCLUDED.program_type,
                    textbook_reference_type = EXCLUDED.textbook_reference_type,
                    section = EXCLUDED.section,
                    topic = EXCLUDED.topic,
                    content_type = EXCLUDED.content_type,
                    difficulty = EXCLUDED.difficulty,
                    title_ru = EXCLUDED.title_ru,
                    body_ru = EXCLUDED.body_ru,
                    source_list = EXCLUDED.source_list,
                    license_status = EXCLUDED.license_status,
                    legal_status = EXCLUDED.legal_status,
                    verified_by = EXCLUDED.verified_by,
                    reviewed_by = EXCLUDED.reviewed_by,
                    content_hash = EXCLUDED.content_hash,
                    version = content_blocks.version + 1,
                    publish_status = CASE WHEN content_blocks.publish_status = 'published' THEN 'draft' ELSE content_blocks.publish_status END,
                    updated_at = NOW()
                """
            ),
            {
                "id": content_id,
                "subject": subject,
                "level": payload.get("level") or "school",
                "grade": payload.get("grade"),
                "program_type": payload.get("programType") or "base",
                "textbook_reference_type": payload.get("textbookReferenceType") or "none",
                "section": section,
                "topic": topic,
                "content_type": content_type,
                "difficulty": payload.get("difficulty") or "basic",
                "title_ru": title,
                "body_ru": body,
                "source_list": json.dumps(source_list, ensure_ascii=False),
                "license_status": payload.get("licenseStatus") or "unknown",
                "legal_status": payload.get("legalStatus") or "pending",
                "verified_by": payload.get("verifiedBy"),
                "reviewed_by": payload.get("reviewedBy"),
                "created_by": auth_user.get("userId") or auth_user.get("user_id") or "content_manager",
                "publish_status": payload.get("publishStatus") or "draft",
                "version": int(payload.get("version") or 1),
                "content_hash": content_hash,
            },
        )
        sess.commit()
        row = sess.execute(
            text("SELECT * FROM content_blocks WHERE id = :id"),
            {"id": content_id},
        ).mappings().first()
        return _content_block_out(dict(row))
    finally:
        sess.close()


@router.post("/qa/blocks/{content_id}/transition")
def transition_content_block(
    content_id: str,
    payload: Dict[str, Any] = Body(default_factory=dict),
    authorization: str | None = Header(default=None),
) -> Dict[str, Any]:
    auth_user = _require_content_manager(authorization)
    to_status = str(payload.get("toStatus") or payload.get("to_status") or "").strip()
    if to_status not in {"draft", "author_review", "scientific_review", "methodist_review", "content_qa", "legal_review", "published", "archived"}:
        raise HTTPException(status_code=400, detail="Недопустимый статус workflow.")
    actor = str(payload.get("actor") or auth_user.get("userId") or "content_manager")
    sess = SessionLocal()
    try:
        row = sess.execute(text("SELECT * FROM content_blocks WHERE id = :id"), {"id": content_id}).mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Контентный блок не найден.")
        row_dict = dict(row)
        if to_status == "published":
            from_status = str(row_dict.get("publish_status") or "draft")
            if from_status != "legal_review":
                raise HTTPException(
                    status_code=400,
                    detail={
                        "messageRu": "Нельзя публиковать автоматически: сначала переведите блок в юридическую проверку.",
                        "missingFields": ["workflow_status:legal_review"],
                    },
                )
            missing = _publish_gate_missing(row_dict)
            missing_sources = _source_reference_missing(sess, _json_list(row_dict.get("source_list")))
            if missing_sources:
                missing.append("source_registry:" + ",".join(missing_sources))
            if missing:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "messageRu": "Нельзя публиковать контент без источников, лицензии, проверки и даты обновления.",
                        "missingFields": missing,
                    },
                )
        from_status = str(row_dict.get("publish_status") or "draft")
        sess.execute(
            text("UPDATE content_blocks SET publish_status = :to_status, updated_at = NOW() WHERE id = :id"),
            {"id": content_id, "to_status": to_status},
        )
        sess.execute(
            text(
                """
                INSERT INTO content_qa_events (content_id, from_status, to_status, actor, comment)
                VALUES (:content_id, :from_status, :to_status, :actor, :comment)
                """
            ),
            {
                "content_id": content_id,
                "from_status": from_status,
                "to_status": to_status,
                "actor": actor,
                "comment": payload.get("comment"),
            },
        )
        sess.commit()
        updated = sess.execute(text("SELECT * FROM content_blocks WHERE id = :id"), {"id": content_id}).mappings().first()
        return _content_block_out(dict(updated))
    finally:
        sess.close()




LAYER_PACKS_CHEMISTRY = [
    {"layer_id": "A", "layer_ru": "Слой A", "pack_id": "chemistry_molecules_layer_a"},
    {"layer_id": "B", "layer_ru": "Слой B", "pack_id": "chemistry_molecules_layer_b"},
]


def _format_size_mb(size_bytes: int) -> float:
    return round(size_bytes / (1024 * 1024), 3)


def _quantile(sorted_values: List[int], q: float) -> int:
    if not sorted_values:
        return 0
    idx = int(len(sorted_values) * q) - 1
    if idx < 0:
        idx = 0
    if idx >= len(sorted_values):
        idx = len(sorted_values) - 1
    return sorted_values[idx]


def _pack_layer_report(layer_id: str, layer_ru: str, pack_id: str) -> Dict[str, Any]:
    try:
        path = _find_pack_file(pack_id)
    except FileNotFoundError:
        return {
            "layer_id": layer_id,
            "layer_ru": layer_ru,
            "pack_id": pack_id,
            "status": "missing",
            "status_ru": "не найден",
            "version": None,
            "updated_at": None,
            "file": None,
            "size_bytes": 0,
            "size_mb": 0.0,
            "molecules_count": 0,
            "branch_stats": {},
            "atoms_stats": {"min": 0, "median": 0, "p95": 0, "max": 0},
        }

    try:
        doc = _load_pack(path)
        molecules = doc.get("molecules") or []
        if not isinstance(molecules, list):
            molecules = []

        branch_counter: Counter[str] = Counter()
        atom_counts: List[int] = []

        for m in molecules:
            if not isinstance(m, dict):
                continue
            branch = str(m.get("branch") or "не_указана")
            branch_counter[branch] += 1
            atoms = m.get("atoms") or []
            atom_counts.append(len(atoms) if isinstance(atoms, list) else 0)

        atom_counts_sorted = sorted(atom_counts)
        median = atom_counts_sorted[len(atom_counts_sorted) // 2] if atom_counts_sorted else 0

        size_bytes = os.stat(path).st_size
        return {
            "layer_id": layer_id,
            "layer_ru": layer_ru,
            "pack_id": str(doc.get("pack_id") or pack_id),
            "status": "ok",
            "status_ru": "готов",
            "version": int(doc.get("version") or 1),
            "updated_at": doc.get("updated_at") or doc.get("generated_at"),
            "file": os.path.basename(path),
            "size_bytes": size_bytes,
            "size_mb": _format_size_mb(size_bytes),
            "molecules_count": len(molecules),
            "branch_stats": dict(sorted(branch_counter.items())),
            "atoms_stats": {
                "min": atom_counts_sorted[0] if atom_counts_sorted else 0,
                "median": median,
                "p95": _quantile(atom_counts_sorted, 0.95),
                "max": atom_counts_sorted[-1] if atom_counts_sorted else 0,
            },
            "etag": _file_etag(path),
            "last_modified": _file_last_modified_http(path),
            "content_hash": _pack_content_hash(doc),
        }
    except Exception as e:
        return {
            "layer_id": layer_id,
            "layer_ru": layer_ru,
            "pack_id": pack_id,
            "status": "error",
            "status_ru": "ошибка",
            "error": f"{type(e).__name__}: {e}",
            "version": None,
            "updated_at": None,
            "file": os.path.basename(path),
            "size_bytes": 0,
            "size_mb": 0.0,
            "molecules_count": 0,
            "branch_stats": {},
            "atoms_stats": {"min": 0, "median": 0, "p95": 0, "max": 0},
        }


@router.get("/layers/chemistry/report")
def chemistry_layers_report() -> Dict[str, Any]:
    layers: List[Dict[str, Any]] = []
    for layer in LAYER_PACKS_CHEMISTRY:
        layers.append(_pack_layer_report(layer["layer_id"], layer["layer_ru"], layer["pack_id"]))

    total_molecules = 0
    combined_branch: Counter[str] = Counter()
    all_ok = True

    for layer in layers:
        if layer.get("status") != "ok":
            all_ok = False
            continue
        total_molecules += int(layer.get("molecules_count") or 0)
        for k, v in (layer.get("branch_stats") or {}).items():
            combined_branch[str(k)] += int(v)

    target_total = 5000
    return {
        "title_ru": "Отчет по слоям A/B (химия)",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "packs_dir": PACKS_DIR,
        "status": "ok" if all_ok else "degraded",
        "status_ru": "готов" if all_ok else "неполный",
        "target_total_molecules": target_total,
        "total_molecules": total_molecules,
        "total_molecules_match_target": total_molecules == target_total,
        "layers": layers,
        "combined_branch_stats": dict(sorted(combined_branch.items())),
        "notes_ru": [
            "Разбиение выполнено на русском: Слой A и Слой B.",
            "Слой A и Слой B вместе должны давать 5000 молекул.",
            "Статусы используются для админки и мониторинга."
        ],
    }


@router.get("/pack/{pack_id}")
def get_pack(pack_id: str, request: Request) -> Response:
    try:
        path = _find_pack_file(pack_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Not Found")

    etag = _file_etag(path)
    last_modified = _file_last_modified_http(path)

    inm = request.headers.get("if-none-match")
    ims = request.headers.get("if-modified-since")

    # 304 support
    if inm and inm.strip() == etag:
        return Response(status_code=304, headers={"ETag": etag, "Last-Modified": last_modified})
    if ims and ims.strip() == last_modified:
        return Response(status_code=304, headers={"ETag": etag, "Last-Modified": last_modified})

    doc = _load_pack(path)
    # добавим content_hash для клиента
    doc["content_hash"] = _pack_content_hash(doc)

    return JSONResponse(
        content=doc,
        headers={
            "ETag": etag,
            "Last-Modified": last_modified,
            "Cache-Control": "public, max-age=0, must-revalidate",
        },
    )


@router.get("/tasks")
def get_tasks(
    module_id: Optional[str] = Query(default=None),
    lang: Optional[str] = Query(default=None, regex="^(ru|en)$"),
    limit: int = Query(default=500, ge=1, le=5000),
    offset: int = Query(default=0, ge=0),
) -> Dict[str, Any]:
    sess = SessionLocal()
    try:
        # tags is jsonb array on server; filter by tags ? 'ru'
        where = []
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        if module_id:
            where.append("module_id = :module_id")
            params["module_id"] = module_id
        if lang:
            where.append("(tags ? :lang OR id LIKE :id_lang)")
            params["lang"] = lang
            params["id_lang"] = f"%_{lang}"

        wsql = "WHERE " + " AND ".join(where) if where else ""
        rows = sess.execute(
            text(f"""
              SELECT id, module_id, lesson_id, title, description, type, estimated_minutes, payload, tags
              FROM tasks
              {wsql}
              ORDER BY lesson_id NULLS LAST, id
              LIMIT :limit OFFSET :offset
            """),
            params,
        ).mappings().all()

        out = []
        for r in rows:
            out.append({
                "id": r["id"],
                "module_id": r["module_id"],
                "lesson_id": r.get("lesson_id"),
                "title": r.get("title"),
                "description": r.get("description"),
                "type": r.get("type"),
                "estimated_minutes": r.get("estimated_minutes"),
                "payload": r.get("payload") or {},
                "tags": r.get("tags") or [],
            })
        return {"tasks": out, "count": len(out), "limit": limit, "offset": offset}
    finally:
        sess.close()


@router.get("/lesson-blocks")
def get_lesson_blocks(
    module_id: Optional[str] = Query(default=None),
    lang: Optional[str] = Query(default=None, regex="^(ru|en)$"),
    limit: int = Query(default=200, ge=1, le=2000),
    offset: int = Query(default=0, ge=0),
) -> Dict[str, Any]:
    sess = SessionLocal()
    try:
        where = []
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        if module_id:
            where.append("module_id = :module_id")
            params["module_id"] = module_id

        wsql = "WHERE " + " AND ".join(where) if where else ""

        rows = sess.execute(
            text(f"""
              SELECT id, module_id, title, description, sort_order, tasks_json
              FROM lesson_blocks
              {wsql}
              ORDER BY sort_order NULLS LAST, id
              LIMIT :limit OFFSET :offset
            """),
            params,
        ).mappings().all()

        out = []
        for r in rows:
            tasks = r.get("tasks_json") or []
            if isinstance(tasks, str):
                try:
                    tasks = json.loads(tasks)
                except Exception:
                    tasks = []

            out.append({
                "id": r["id"],
                "module_id": r["module_id"],
                "title": r.get("title"),
                "description": r.get("description") or "",
                "order_index": r.get("sort_order") or 0,
                "tasks": tasks,
                "payload": {},
            })

        return {"lesson_blocks": out, "count": len(out), "limit": limit, "offset": offset}
    finally:
        sess.close()


@router.get("/molecules")
def get_molecules(limit: int = Query(default=500, ge=1, le=5000)) -> Dict[str, Any]:
    sess = SessionLocal()
    try:
        rows = sess.execute(
            text("SELECT id, name, formula, data_json FROM molecules ORDER BY id LIMIT :limit"),
            {"limit": limit},
        ).mappings().all()
        out = []
        for r in rows:
            data = r.get("data_json") or {}
            if isinstance(data, str):
                try:
                    data = json.loads(data)
                except Exception:
                    data = {}
            out.append({
                "id": r["id"],
                "name": r.get("name"),
                "formula": r.get("formula"),
                "atoms": data.get("atoms") or [],
            })
        return {"molecules": out, "count": len(out)}
    finally:
        sess.close()


@router.get("/reactions")
def get_reactions(limit: int = Query(default=500, ge=1, le=5000)) -> Dict[str, Any]:
    sess = SessionLocal()
    try:
        rows = sess.execute(
            text("SELECT id, title, equation, data_json FROM reactions ORDER BY id LIMIT :limit"),
            {"limit": limit},
        ).mappings().all()
        out = []
        for r in rows:
            data = r.get("data_json") or {}
            if isinstance(data, str):
                try:
                    data = json.loads(data)
                except Exception:
                    data = {}
            out.append({
                "id": r["id"],
                "title": r.get("title"),
                "equation": r.get("equation"),
                "conditions": data.get("conditions"),
                "reactants": data.get("reactants") or [],
                "products": data.get("products") or [],
            })
        return {"reactions": out, "count": len(out)}
    finally:
        sess.close()


@router.get("/ai/search")
def ai_search(
    q: str = Query(..., min_length=2),
    subject: Optional[str] = Query(default=None),
    lang: Optional[str] = Query(default=None, regex="^(ru|en)$"),
    limit: int = Query(default=50, ge=1, le=200),
) -> Dict[str, Any]:
    sess = SessionLocal()
    try:
        where = ["(title ILIKE :qq OR content ILIKE :qq OR COALESCE(body,'') ILIKE :qq)"]
        params: Dict[str, Any] = {"qq": f"%{q}%", "limit": limit}
        if subject:
            where.append("subject = :subject")
            params["subject"] = subject
        if lang:
            where.append("lang = :lang")
            params["lang"] = lang

        wsql = "WHERE " + " AND ".join(where)
        rows = sess.execute(
            text(f"""
              SELECT id, title, COALESCE(body, content) AS body, subject, lang, tags
              FROM ai_knowledge
              {wsql}
              ORDER BY id DESC
              LIMIT :limit
            """),
            params,
        ).mappings().all()

        return {"results": [dict(r) for r in rows], "count": len(rows)}
    finally:
        sess.close()

def _apk_head_response() -> Response:
    try:
        apk_path, apk_name = _resolve_latest_layer_a_apk()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="APK file not found")

    st = os.stat(apk_path)
    return Response(
        status_code=200,
        headers={
            "Content-Length": str(st.st_size),
            "Content-Type": "application/vnd.android.package-archive",
            "Content-Disposition": f'attachment; filename="{apk_name}"',
            "Accept-Ranges": "bytes",
        },
    )


def _apk_file_response() -> FileResponse:
    try:
        apk_path, apk_name = _resolve_latest_layer_a_apk()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="APK file not found")

    return FileResponse(
        path=apk_path,
        media_type="application/vnd.android.package-archive",
        filename=apk_name,
    )


@router.head("/downloads/apk/latest")
def download_latest_apk_head() -> Response:
    return _apk_head_response()


@router.get("/downloads/apk/latest")
def download_latest_apk() -> FileResponse:
    return _apk_file_response()


@router.get("/downloads/apk/latest/metadata")
def download_latest_apk_metadata() -> dict[str, Any]:
    try:
        apk_path, apk_name = _resolve_latest_layer_a_apk()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="APK file not found")
    return _latest_apk_metadata(apk_path, apk_name)


@router.head("/downloads/apk/layer-a-debug")
def download_layer_a_apk_head() -> Response:
    return _apk_head_response()


@router.get("/downloads/apk/layer-a-debug")
def download_layer_a_apk() -> FileResponse:
    return _apk_file_response()
