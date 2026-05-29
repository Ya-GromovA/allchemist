from __future__ import annotations

import os
import re
import json
import random
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Optional, Literal, Dict, Any, List, Tuple

from fastapi import APIRouter
from pydantic import BaseModel, Field

from sqlalchemy import text
from app.db.session import SessionLocal

router = APIRouter(prefix="/ai-mentor", tags=["ai"])


# -----------------------------
# Models
# -----------------------------
class MentorRequest(BaseModel):
    question: str = Field(..., min_length=1)
    subject: Optional[str] = None
    language: Literal["ru", "en"] = "ru"
    mode: Literal["auto", "online", "offline"] = "auto"


class MentorResponse(BaseModel):
    answer: str
    source: str
    debug: Optional[Dict[str, Any]] = None


class NextTaskRequest(BaseModel):
    device_id: str = Field(..., min_length=1)
    subject: Optional[Literal["physics", "chemistry"]] = None
    language: Literal["ru", "en"] = "ru"


class GeneratedTaskRequest(BaseModel):
    subject: Literal["physics", "chemistry"]
    topic: Optional[str] = None
    difficulty: Literal[1, 2, 3] = 2
    language: Literal["ru", "en"] = "ru"
    save_to_db: bool = False


# -----------------------------
# Helpers: text normalization
# -----------------------------
def _norm(s: str) -> str:
    s = (s or "").lower().replace("ё", "е")
    s = re.sub(r"[^a-zа-я0-9\s]+", " ", s, flags=re.IGNORECASE)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _tokens(s: str) -> List[str]:
    return [w for w in _norm(s).split(" ") if len(w) >= 3]


def _simple_score(q: str, doc: str) -> int:
    qset = set(_tokens(q))
    if not qset:
        return 0
    dset = set(_tokens(doc))
    return sum(1 for w in qset if w in dset)


def _safe_tags(val: Any) -> List[str]:
    # tags в Postgres у нас jsonb-массив.
    if isinstance(val, list):
        return [str(x) for x in val]
    return []


def _basic_stem_answer(question: str, subject: Optional[str], lang: str) -> Optional[str]:
    q = _norm(question)
    subj = (subject or "").strip().lower()

    chemistry_triggers = ["что такое химия", "что изучает химия", "объясни химию", "what is chemistry"]
    if subj == "chemistry" or any(trigger in q for trigger in chemistry_triggers):
        if lang == "ru":
            return (
                "Химия — это наука о веществах, их составе, строении, свойствах и превращениях. "
                "Она помогает понять, из чего состоят вещества, как они взаимодействуют и почему из одних веществ получаются другие.\n\n"
                "Ключевые идеи:\n"
                "1. Все вещества состоят из атомов, молекул или ионов.\n"
                "2. Свойства вещества зависят от его состава и строения.\n"
                "3. В химических реакциях одни вещества превращаются в другие, но атомы не исчезают, а только перераспределяются.\n\n"
                "Пример: водород реагирует с кислородом и образует воду. Это химическая реакция, потому что исходные вещества превращаются в новое вещество с другими свойствами."
            )
        return (
            "Chemistry is the science of substances: their composition, structure, properties, and transformations. "
            "It explains what matter is made of, how substances interact, and why one substance can turn into another."
        )
    return None


# -----------------------------
# Offline search (server knowledge)
# -----------------------------
def _offline_search(question: str, subject: Optional[str], lang: str) -> Dict[str, Any]:
    sess = SessionLocal()
    try:
        candidates: List[Dict[str, str]] = []

        # ai_knowledge
        try:
            if subject:
                rows = sess.execute(
                    text("SELECT title, body FROM ai_knowledge WHERE subject=:s LIMIT 300"),
                    {"s": subject},
                ).fetchall()
            else:
                rows = sess.execute(text("SELECT title, body FROM ai_knowledge LIMIT 300")).fetchall()

            for t, b in rows:
                t = str(t or "")
                b = str(b or "")
                if b:
                    candidates.append({"title": t, "body": b})
        except Exception:
            pass

        # ai_docs (опционально)
        try:
            if subject:
                rows = sess.execute(
                    text("SELECT title, body FROM ai_docs WHERE subject=:s LIMIT 300"),
                    {"s": subject},
                ).fetchall()
            else:
                rows = sess.execute(text("SELECT title, body FROM ai_docs LIMIT 300")).fetchall()

            for t, b in rows:
                t = str(t or "")
                b = str(b or "")
                if b:
                    candidates.append({"title": t, "body": b})
        except Exception:
            pass

        if not candidates:
            msg_ru = "Локальные материалы на сервере не найдены (ai_knowledge/ai_docs пусто). Добавь знания или включи онлайн-LLM."
            msg_en = "No server knowledge materials found (ai_knowledge/ai_docs empty). Add knowledge or enable online LLM."
            return {"answer": msg_ru if lang == "ru" else msg_en, "debug": {"found": 0, "subject": subject}}

        scored = sorted(
            [{"c": c, "s": _simple_score(question, c["title"] + " " + c["body"])} for c in candidates],
            key=lambda x: x["s"],
            reverse=True,
        )
        top = [x["c"] for x in scored[:5] if x["s"] > 0] or [x["c"] for x in scored[:3]]

        blocks = []
        used = 0
        for c in top:
            block = f"# {c['title']}\n{c['body']}".strip()
            if used + len(block) > 6000:
                break
            blocks.append(block)
            used += len(block)

        header = "Вот что я нашёл в базе знаний:\n\n" if lang == "ru" else "Here's what I found in the knowledge base:\n\n"
        return {"answer": header + "\n\n".join(blocks), "debug": {"found": len(candidates), "used": len(blocks), "subject": subject}}
    finally:
        sess.close()


def _build_prompt_messages(question: str, subject: Optional[str], lang: str, context: Optional[str]) -> List[Dict[str, str]]:
    if lang == "ru":
        sys = (
            "Ты — AI-наставник по STEM (физика/химия/биология). "
            "Отвечай по-русски, структурировано: определение -> ключевые идеи/формулы -> пример или применение. "
            "Если данных не хватает, скажи об этом прямо и не выдумывай факты."
        )
        subj_line = f"Предмет: {subject}." if subject else "Предмет: общий."
        user = f"{subj_line}\n\nВопрос: {question}"
        if context:
            user += f"\n\nКонтекст из базы знаний:\n{context}"
    else:
        sys = (
            "You are a STEM tutor (physics/chemistry/biology). "
            "Answer in a structured way: definition -> key ideas/formulas -> example or application. "
            "If the data is insufficient, say so explicitly and do not invent facts."
        )
        subj_line = f"Subject: {subject}." if subject else "Subject: general."
        user = f"{subj_line}\n\nQuestion: {question}"
        if context:
            user += f"\n\nKnowledge base context:\n{context}"

    return [
        {"role": "system", "content": sys},
        {"role": "user", "content": user},
    ]


def _configured_model(provider: str) -> str:
    normalized = (provider or "").strip().lower()
    if normalized == "ollama":
        return (os.getenv("OLLAMA_MODEL") or os.getenv("LLM_MODEL") or "qwen2.5:7b-instruct").strip()
    if normalized == "openai":
        model = (os.getenv("OPENAI_MODEL") or os.getenv("LLM_MODEL") or "gpt-4o-mini").strip()
        return model if model.startswith("gpt") else "gpt-4o-mini"
    if normalized == "groq":
        return (os.getenv("GROQ_MODEL") or os.getenv("LLM_MODEL") or "llama-3.1-8b-instant").strip()
    return (os.getenv("LLM_MODEL") or "").strip()


def _split_csv_list(raw: str) -> List[str]:
    seen: set[str] = set()
    values: List[str] = []
    for item in str(raw or "").split(","):
        value = item.strip()
        if value and value not in seen:
            seen.add(value)
            values.append(value)
    return values


def _ollama_model_sequence() -> List[str]:
    primary = _configured_model("ollama")
    fallbacks = _split_csv_list(os.getenv("OLLAMA_FALLBACK_MODELS", ""))
    models = [primary] if primary else []
    for item in fallbacks:
        if item not in models:
            models.append(item)
    return models


def _resolve_chat_url(raw: str, default_url: str) -> str:
    value = (raw or "").strip().rstrip("/")
    if not value:
        return default_url
    if value.endswith("/chat/completions"):
        return value
    return value + "/chat/completions"


def _extract_openai_compatible_answer(doc: Dict[str, Any], provider: str) -> str:
    choices = doc.get("choices")
    if not isinstance(choices, list) or not choices:
        raise RuntimeError(f"{provider} returned no choices")

    first = choices[0] if isinstance(choices[0], dict) else {}
    message = first.get("message") if isinstance(first, dict) else {}
    content = message.get("content") if isinstance(message, dict) else None

    if isinstance(content, list):
        parts: List[str] = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                parts.append(str(item.get("text") or ""))
        content = "\n".join(x for x in parts if x).strip()

    answer = str(content or (first.get("text") if isinstance(first, dict) else "") or "").strip()
    if not answer:
        raise RuntimeError(f"empty response from {provider}")
    return answer


def _openai_compatible_chat(
    *,
    provider: str,
    url: str,
    api_key: str,
    model: str,
    messages: List[Dict[str, str]],
    temperature: float,
    max_tokens: int,
    timeout_s: int,
) -> Dict[str, Any]:
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    req = urllib.request.Request(
        url=url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"{provider} http {e.code}: {body[:300]}") from e
    except Exception as e:
        raise RuntimeError(f"{provider} request failed: {e}") from e

    try:
        doc = json.loads(raw)
    except Exception as e:
        raise RuntimeError(f"{provider} invalid json: {e}") from e

    if isinstance(doc, dict) and isinstance(doc.get("error"), dict):
        err = doc["error"]
        raise RuntimeError(f"{provider} api error: {str(err.get('message') or err)[:300]}")

    answer = _extract_openai_compatible_answer(doc if isinstance(doc, dict) else {}, provider)
    return {"answer": answer, "debug": {"provider": provider, "model": model, "base_url": url}}


def _online_groq(question: str, subject: Optional[str], lang: str, context: Optional[str]) -> Dict[str, Any]:
    api_key = (os.getenv("GROQ_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set")

    model = _configured_model("groq")
    temperature = float(os.getenv("GROQ_TEMPERATURE", "0.2"))
    max_tokens = int(os.getenv("GROQ_MAX_TOKENS", "900"))
    timeout_s = int(os.getenv("GROQ_TIMEOUT", os.getenv("LLM_TIMEOUT", "60")))
    url = _resolve_chat_url(os.getenv("GROQ_BASE_URL", ""), "https://api.groq.com/openai/v1/chat/completions")
    messages = _build_prompt_messages(question, subject, lang, context)

    return _openai_compatible_chat(
        provider="groq",
        url=url,
        api_key=api_key,
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        timeout_s=timeout_s,
    )


def _online_openai(question: str, subject: Optional[str], lang: str, context: Optional[str]) -> Dict[str, Any]:
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")

    model = _configured_model("openai")

    temperature = float(os.getenv("OPENAI_TEMPERATURE", os.getenv("GROQ_TEMPERATURE", "0.2")))
    max_tokens = int(os.getenv("OPENAI_MAX_TOKENS", os.getenv("GROQ_MAX_TOKENS", "900")))
    timeout_s = int(os.getenv("OPENAI_TIMEOUT", os.getenv("LLM_TIMEOUT", "60")))
    url = _resolve_chat_url(os.getenv("OPENAI_BASE_URL", ""), "https://api.openai.com/v1/chat/completions")
    messages = _build_prompt_messages(question, subject, lang, context)

    return _openai_compatible_chat(
        provider="openai",
        url=url,
        api_key=api_key,
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        timeout_s=timeout_s,
    )


def _online_ollama(
    question: str,
    subject: Optional[str],
    lang: str,
    context: Optional[str],
    *,
    model_override: Optional[str] = None,
) -> Dict[str, Any]:
    base = (os.getenv("OLLAMA_BASE_URL") or "http://host.docker.internal:11434").strip().rstrip("/")
    model = str(model_override or _configured_model("ollama") or "qwen2.5:7b-instruct").strip()

    temperature = float(os.getenv("OLLAMA_TEMPERATURE", os.getenv("GROQ_TEMPERATURE", "0.2")))
    timeout_s = int(os.getenv("OLLAMA_TIMEOUT", "120"))
    max_tokens = int(os.getenv("OLLAMA_MAX_TOKENS", os.getenv("GROQ_MAX_TOKENS", "400")))

    if lang == "ru":
        sys = (
            "Ты — AI-наставник по STEM (физика/химия/биология). "
            "Отвечай по-русски, структурировано: определение -> ключевые идеи/формулы -> пример или применение. "
            "Если данных не хватает, скажи об этом прямо и не выдумывай факты."
        )
        subj_line = f"Предмет: {subject}." if subject else "Предмет: общий."
        user = f"{subj_line}\n\nВопрос: {question}"
        if context:
            user += f"\n\nКонтекст из базы знаний:\n{context}"
    else:
        sys = (
            "You are a STEM tutor (physics/chemistry/biology). "
            "Answer in a structured way: definition -> key ideas/formulas -> example or application. "
            "If the data is insufficient, say so explicitly and do not invent facts."
        )
        subj_line = f"Subject: {subject}." if subject else "Subject: general."
        user = f"{subj_line}\n\nQuestion: {question}"
        if context:
            user += f"\n\nKnowledge base context:\n{context}"

    payload = {
        "model": model,
        "stream": False,
        "messages": [
            {"role": "system", "content": sys},
            {"role": "user", "content": user},
        ],
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }

    req = urllib.request.Request(
        url=f"{base}/api/chat",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            raw = resp.read().decode("utf-8")
    except Exception as e:
        raise RuntimeError(f"ollama request failed: {e}") from e

    try:
        doc = json.loads(raw)
    except Exception as e:
        raise RuntimeError(f"ollama invalid json: {e}") from e

    ans = ""
    if isinstance(doc, dict):
        msg = doc.get("message") or {}
        if isinstance(msg, dict):
            ans = str(msg.get("content") or "").strip()
        if not ans:
            ans = str(doc.get("response") or "").strip()

    if not ans:
        raise RuntimeError("empty response from ollama")

    return {"answer": ans, "debug": {"provider": "ollama", "model": model, "base_url": base}}


def _online_ollama_with_fallback(question: str, subject: Optional[str], lang: str, context: Optional[str]) -> Dict[str, Any]:
    attempted_models: List[str] = []
    model_errors: Dict[str, str] = {}

    for model in _ollama_model_sequence():
        attempted_models.append(model)
        try:
            online = _online_ollama(question, subject, lang, context, model_override=model)
            dbg = {
                **(online.get("debug") or {}),
                "attempted_models": attempted_models,
                "model_errors": model_errors,
            }
            return {"answer": online["answer"], "debug": dbg}
        except Exception as e:
            model_errors[model] = str(e)

    raise RuntimeError(f"ollama model sequence failed: {model_errors}")


def _http_get_json(url: str, timeout_s: int = 5) -> Dict[str, Any]:
    req = urllib.request.Request(url=url, headers={"Accept": "application/json"}, method="GET")
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        raw = resp.read().decode("utf-8")
    doc = json.loads(raw)
    return doc if isinstance(doc, dict) else {}


def _ollama_health() -> Dict[str, Any]:
    base = (os.getenv("OLLAMA_BASE_URL") or "http://host.docker.internal:11434").strip().rstrip("/")
    wanted = _ollama_model_sequence()
    try:
        doc = _http_get_json(f"{base}/api/tags", timeout_s=5)
        rows = doc.get("models") if isinstance(doc, dict) else []
        names = sorted(
            str(item.get("name") or "").strip()
            for item in rows
            if isinstance(item, dict) and str(item.get("name") or "").strip()
        )
        installed = [name for name in wanted if name in names]
        missing = [name for name in wanted if name not in names]
        return {
            "ok": bool(installed),
            "base_url": base,
            "configured_model": wanted[0] if wanted else "",
            "fallback_models": wanted[1:],
            "selected_model": installed[0] if installed else None,
            "installed_models": installed,
            "missing_models": missing,
            "installed_count": len(names),
        }
    except Exception as e:
        return {
            "ok": False,
            "base_url": base,
            "configured_model": wanted[0] if wanted else "",
            "fallback_models": wanted[1:],
            "selected_model": None,
            "installed_models": [],
            "missing_models": wanted,
            "error": str(e),
        }


def _offline_inventory() -> Dict[str, Any]:
    inventory = {
        "ai_knowledge": {"total": 0, "subjects": {}},
        "ai_docs": {"total": 0, "subjects": {}},
    }

    sess = SessionLocal()
    try:
        for table_name in ("ai_knowledge", "ai_docs"):
            try:
                total = sess.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar() or 0
                rows = sess.execute(
                    text(
                        f"""
                        SELECT COALESCE(NULLIF(TRIM(subject), ''), 'unknown') AS subject, COUNT(*) AS cnt
                        FROM {table_name}
                        GROUP BY COALESCE(NULLIF(TRIM(subject), ''), 'unknown')
                        ORDER BY subject
                        """
                    )
                ).mappings().all()
                inventory[table_name] = {
                    "total": int(total),
                    "subjects": {str(row.get("subject") or "unknown"): int(row.get("cnt") or 0) for row in rows},
                }
            except Exception as e:
                inventory[table_name] = {"total": 0, "subjects": {}, "error": str(e)}
        return inventory
    finally:
        sess.close()


def _provider_sequence(configured_provider: str) -> List[str]:
    preferred = (configured_provider or "groq").strip().lower()
    variants = {
        "ollama": ["ollama", "groq", "openai"],
        "openai": ["openai", "groq", "ollama"],
        "groq": ["groq", "openai", "ollama"],
    }
    seq = variants.get(preferred, variants["groq"])
    deduped: List[str] = []
    for name in seq:
        if name not in deduped:
            deduped.append(name)
    return deduped


def _run_online_provider(provider: str, question: str, subject: Optional[str], lang: str, context: Optional[str]) -> Dict[str, Any]:
    if provider == "groq":
        return _online_groq(question, subject, lang, context=context)
    if provider == "openai":
        return _online_openai(question, subject, lang, context=context)
    if provider == "ollama":
        return _online_ollama_with_fallback(question, subject, lang, context=context)
    raise RuntimeError(f"Unknown provider: {provider}")


# -----------------------------
# Adaptive: next task
# -----------------------------
def _recommend_next_task(device_id: str, subject: Optional[str], language: str) -> Dict[str, Any]:
    sess = SessionLocal()
    try:
        rows = sess.execute(
            text(
                """
                SELECT
                  t.id,
                  t.module_id,
                  t.lesson_id,
                  t.title,
                  t.description,
                  t.type,
                  t.payload,
                  t.tags,
                  p.completed,
                  p.score,
                  p.updated_at
                FROM tasks t
                LEFT JOIN user_progress_server p
                  ON p.task_id = t.id AND p.device_id = :device_id
                WHERE ((:module_id)::text IS NULL OR t.module_id = (:module_id)::text)
                  AND ((:lang)::text IS NULL OR (t.tags ? (:lang)::text OR t.id LIKE :id_lang))
                ORDER BY t.lesson_id NULLS LAST, t.id
                LIMIT 400
                """
            ),
            {"device_id": device_id, "module_id": subject, "lang": language, "id_lang": f"%_{language}"},
        ).mappings().all()

        if not rows:
            return {
                "found": False,
                "reason": "no_tasks",
                "message": "Нет доступных задач для подбора." if language == "ru" else "No tasks available for recommendation.",
            }

        weak_rows = [r for r in rows if (r.get("completed") or 0) == 0 or float(r.get("score") or 0.0) < 0.7]
        weak_tags: Dict[str, int] = {}
        for r in weak_rows:
            for tg in _safe_tags(r.get("tags")):
                if tg in ("ru", "en", "generated"):
                    continue
                weak_tags[tg] = weak_tags.get(tg, 0) + 1

        scored: List[Tuple[int, Any]] = []
        for r in rows:
            tags = _safe_tags(r.get("tags"))
            completed = int(r.get("completed") or 0)
            score = float(r.get("score") or 0.0)

            val = 0
            if r.get("completed") is None:
                val += 5
            if completed == 0:
                val += 3
            if score < 0.7:
                val += 2
            if completed == 1 and score >= 0.9:
                val -= 4

            overlap = sum(weak_tags.get(t, 0) for t in tags)
            val += min(overlap, 6)

            scored.append((val, r))

        scored.sort(key=lambda x: x[0], reverse=True)
        best = scored[0][1]

        weak_top = sorted(weak_tags.items(), key=lambda x: x[1], reverse=True)[:5]
        weak_topic_labels = [w[0] for w in weak_top]

        reason = (
            "Следующая задача подобрана по текущему прогрессу: приоритет незавершённым темам и слабым тегам."
            if language == "ru"
            else "Next task is selected from your progress: unfinished items and weak tags are prioritized."
        )

        return {
            "found": True,
            "task": {
                "id": best.get("id"),
                "module_id": best.get("module_id"),
                "lesson_id": best.get("lesson_id"),
                "title": best.get("title"),
                "description": best.get("description"),
                "type": best.get("type"),
                "payload": best.get("payload") or {},
            },
            "weak_topics": weak_topic_labels,
            "reason": reason,
        }
    finally:
        sess.close()


# -----------------------------
# Generator: tasks
# -----------------------------
def _pick_default_lesson_id(subject: str) -> int:
    sess = SessionLocal()
    try:
        row = sess.execute(
            text("SELECT id FROM lesson_blocks WHERE module_id=:m ORDER BY sort_order ASC, id ASC LIMIT 1"),
            {"m": subject},
        ).mappings().first()
        if not row:
            return 0
        return int(row["id"])
    finally:
        sess.close()


def _gen_task(subject: str, topic: str, difficulty: int, language: str) -> Dict[str, Any]:
    rng = random.Random()
    rng.seed(f"{subject}:{topic}:{difficulty}:{datetime.now(timezone.utc).strftime('%Y%m%d%H')}")

    if subject == "physics":
        tnorm = _norm(topic)
        if any(k in tnorm for k in ["ом", "ohm", "ток", "элект"]):
            u = rng.choice([6, 9, 12, 24, 36])
            r = rng.choice([2, 3, 4, 6, 8, 12])
            i = round(u / r, 2)
            if language == "ru":
                title = "Генератор: закон Ома"
                desc = f"Напряжение U={u} В, сопротивление R={r} Ом. Найдите силу тока I."
                solution = f"I = U/R = {u}/{r} = {i} А"
                unit = "А"
            else:
                title = "Generator: Ohm's law"
                desc = f"Voltage U={u} V, resistance R={r} Ohm. Find current I."
                solution = f"I = U/R = {u}/{r} = {i} A"
                unit = "A"

            return {
                "title": title,
                "description": desc,
                "type": "numeric",
                "estimated_minutes": 4,
                "payload": {
                    "answer": {"value": i, "unit": unit},
                    "solution": solution,
                    "rubric": {"type": "numeric", "unit": unit, "tolerance": 0.05},
                },
                "tags": ["generated", "electricity", language],
            }

        s = rng.choice([90, 120, 180, 240])
        t = rng.choice([15, 20, 30, 40, 60])
        v = round(s / t, 2)
        if language == "ru":
            title = "Генератор: равномерное движение"
            desc = f"Тело прошло путь {s} м за {t} с. Найдите скорость v."
            solution = f"v = s/t = {s}/{t} = {v} м/с"
        else:
            title = "Generator: uniform motion"
            desc = f"An object moved {s} m in {t} s. Find speed v."
            solution = f"v = s/t = {s}/{t} = {v} m/s"

        return {
            "title": title,
            "description": desc,
            "type": "numeric",
            "estimated_minutes": 3,
            "payload": {
                "answer": {"value": v, "unit": "m/s"},
                "solution": solution,
                "rubric": {"type": "numeric", "unit": "m/s", "tolerance": 0.05},
            },
            "tags": ["generated", "kinematics", language],
        }

    tnorm = _norm(topic)
    if any(k in tnorm for k in ["моль", "mole", "моляр", "molar"]):
        m = rng.choice([9, 18, 22, 36, 44, 54])
        M = rng.choice([18, 22, 44])
        n = round(m / M, 2)
        if language == "ru":
            title = "Генератор: количество вещества"
            desc = f"Дано: m={m} г, M={M} г/моль. Найдите n."
            solution = f"n = m/M = {m}/{M} = {n} моль"
        else:
            title = "Generator: amount of substance"
            desc = f"Given: m={m} g, M={M} g/mol. Find n."
            solution = f"n = m/M = {m}/{M} = {n} mol"

        return {
            "title": title,
            "description": desc,
            "type": "numeric",
            "estimated_minutes": 4,
            "payload": {
                "answer": {"value": n, "unit": "mol"},
                "solution": solution,
                "rubric": {"type": "numeric", "unit": "mol", "tolerance": 0.05},
            },
            "tags": ["generated", "mole", language],
        }

    options = ["H2 + O2 -> H2O", "2H2 + O2 -> 2H2O", "H2 + 2O2 -> H2O2"]
    if language == "ru":
        title = "Генератор: уравнивание реакции"
        desc = "Выбери корректно уравненную реакцию."
        explain = "Верный вариант: 2H2 + O2 -> 2H2O"
    else:
        title = "Generator: balance reaction"
        desc = "Choose the correctly balanced equation."
        explain = "Correct option: 2H2 + O2 -> 2H2O"

    return {
        "title": title,
        "description": desc,
        "type": "quiz",
        "estimated_minutes": 3,
        "payload": {"options": options, "correct_index": 1, "explain": explain, "rubric": {"type": "quiz"}},
        "tags": ["generated", "balancing", language],
    }


# -----------------------------
# API
# -----------------------------
@router.post("/ask", response_model=MentorResponse)
def ask_mentor(payload: MentorRequest) -> MentorResponse:
    q = payload.question.strip()
    subject = payload.subject.strip() if payload.subject else None
    lang = payload.language
    mode = payload.mode

    provider = (os.getenv("LLM_PROVIDER") or "groq").strip().lower()
    model = _configured_model(provider)

    offline = _offline_search(q, subject, lang)
    context = offline["answer"] if ("Вот что я нашёл" in offline["answer"] or "Here's what I found" in offline["answer"]) else None

    base_debug = {"mode": mode, "provider": provider, "model": model, "subject": subject}

    basic = _basic_stem_answer(q, subject, lang)
    if basic:
        dbg = {**base_debug, "shortcut": "basic_stem_answer"}
        return MentorResponse(answer=basic, source="built_in_answer", debug=dbg)

    if mode == "offline":
        dbg = {**base_debug, **(offline.get("debug") or {})}
        return MentorResponse(answer=offline["answer"], source="offline_search", debug=dbg)

    if mode in ("auto", "online"):
        try:
            attempts: List[str] = []
            attempt_errors: Dict[str, str] = {}

            for current_provider in _provider_sequence(provider):
                attempts.append(current_provider)
                try:
                    online = _run_online_provider(current_provider, q, subject, lang, context=context)
                    dbg = {
                        **base_debug,
                        **(online.get("debug") or {}),
                        "attempted": attempts,
                        "attempt_errors": attempt_errors,
                    }
                    return MentorResponse(answer=online["answer"], source=f"online_{current_provider}", debug=dbg)
                except Exception as e:
                    attempt_errors[current_provider] = str(e)

            dbg = {
                **base_debug,
                **(offline.get("debug") or {}),
                "attempted": attempts,
                "attempt_errors": attempt_errors,
            }
            return MentorResponse(answer=offline["answer"], source="offline_search", debug=dbg)

        except Exception as e:
            dbg = {**base_debug, **(offline.get("debug") or {}), "online_error": str(e)}
            return MentorResponse(answer=offline["answer"], source="offline_search", debug=dbg)

    dbg = {**base_debug, **(offline.get("debug") or {})}
    return MentorResponse(answer=offline["answer"], source="offline_search", debug=dbg)


@router.get("/health")
def ai_health() -> Dict[str, Any]:
    provider = (os.getenv("LLM_PROVIDER") or "groq").strip().lower()
    inventory = _offline_inventory()
    ollama = _ollama_health()
    fallback_chain = _provider_sequence(provider)
    issues: List[str] = []

    if provider == "ollama" and not ollama.get("ok"):
        issues.append("ollama_unreachable_or_models_missing")

    knowledge_total = int(inventory.get("ai_knowledge", {}).get("total") or 0) + int(inventory.get("ai_docs", {}).get("total") or 0)
    if knowledge_total == 0:
        issues.append("offline_knowledge_empty")

    status = "ok" if not issues else "degraded"
    return {
        "status": status,
        "configured_provider": provider,
        "configured_model": _configured_model(provider),
        "fallback_chain": fallback_chain,
        "recommended_provider": "ollama",
        "recommended_model": "qwen2.5:7b-instruct",
        "providers": {
            "ollama": ollama,
            "groq": {
                "configured": bool((os.getenv("GROQ_API_KEY") or "").strip()),
                "model": _configured_model("groq"),
            },
            "openai": {
                "configured": bool((os.getenv("OPENAI_API_KEY") or "").strip()),
                "model": _configured_model("openai"),
            },
        },
        "offline_inventory": inventory,
        "issues": issues,
    }


@router.post("/next-task")
def next_task(payload: NextTaskRequest) -> Dict[str, Any]:
    return _recommend_next_task(payload.device_id, payload.subject, payload.language)


@router.post("/generate-task")
def generate_task(payload: GeneratedTaskRequest) -> Dict[str, Any]:
    topic = payload.topic or ("ом" if payload.subject == "physics" else "моль")
    gen = _gen_task(payload.subject, topic, payload.difficulty, payload.language)

    lesson_id = _pick_default_lesson_id(payload.subject)
    task_id = f"gen_{payload.subject}_{int(datetime.now(timezone.utc).timestamp())}_{random.randint(100,999)}"

    out = {
        "id": task_id,
        "module_id": payload.subject,
        "lesson_id": lesson_id,
        "lang": payload.language,
        **gen,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    if payload.save_to_db:
        sess = SessionLocal()
        try:
            sess.execute(
                text(
                    """
                    INSERT INTO tasks (id, module_id, lesson_id, title, description, type, estimated_minutes, payload, tags)
                    VALUES (:id, :module_id, :lesson_id, :title, :description, :type, :estimated_minutes, CAST(:payload AS jsonb), CAST(:tags AS jsonb))
                    ON CONFLICT (id) DO NOTHING
                    """
                ),
                {
                    "id": task_id,
                    "module_id": payload.subject,
                    "lesson_id": lesson_id if lesson_id else None,
                    "title": out["title"],
                    "description": out["description"],
                    "type": out["type"],
                    "estimated_minutes": out["estimated_minutes"],
                    "payload": json.dumps(out["payload"], ensure_ascii=False),
                    "tags": json.dumps(out["tags"], ensure_ascii=False),
                },
            )
            sess.commit()
            out["saved"] = True
        except Exception as e:
            sess.rollback()
            out["saved"] = False
            out["save_error"] = str(e)
        finally:
            sess.close()
    else:
        out["saved"] = False

    return out
