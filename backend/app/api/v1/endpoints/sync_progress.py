from __future__ import annotations

from datetime import datetime, timezone
import hashlib
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from sqlalchemy import text
from app.db.session import SessionLocal
from app.services.user_state_store import _read_state

router = APIRouter(prefix="/progress", tags=["progress"])


# -----------------------------
# Pydantic схемы
# -----------------------------
class ProgressItemIn(BaseModel):
    device_id: str = Field(..., min_length=1)
    module_id: str = Field(..., min_length=1)
    lesson_id: str = Field(default="")
    task_id: str = Field(..., min_length=1)

    completed: int = Field(default=0, ge=0, le=1)
    score: float = Field(default=0.0, ge=0.0, le=1.0)
    last_answer: Optional[str] = None

    # Время обновления на клиенте (лучше отправлять ISO8601 с таймзоной)
    # примеры:
    # - 2025-12-16T01:57:26+01:00
    # - 2025-12-16T00:57:26Z
    # - 2025-12-16 00:57:26   (без TZ -> считаем UTC)
    updated_at: Optional[str] = None

    # Метаданные о "времени пользователя"
    # Берлин зимой: +60, Москва: +180
    client_offset_min: Optional[int] = None
    # например: "Europe/Berlin"
    client_tz: Optional[str] = None


class ProgressSyncIn(BaseModel):
    device_id: str = Field(..., min_length=1)
    items: List[ProgressItemIn] = Field(default_factory=list)


class ProgressSyncOut(BaseModel):
    accepted_task_ids: List[str] = Field(default_factory=list)


class ProgressRowOut(BaseModel):
    device_id: str
    module_id: str
    lesson_id: str
    task_id: str
    completed: int
    score: float
    last_answer: Optional[str] = None
    updated_at_utc: str
    answer_json: Optional[Dict[str, Any]] = None


# -----------------------------
# Helpers
# -----------------------------
def _parse_ts_to_utc(ts: Optional[str]) -> Optional[datetime]:
    """
    Возвращает timezone-aware datetime в UTC.

    - ISO с offset / Z -> переводим в UTC
    - строка без TZ -> считаем UTC (чтобы не было сюрпризов)
    - если не распарсили -> None
    """
    if not ts:
        return None

    s = ts.strip()
    if not s:
        return None

    # поддержка "...Z"
    s = s.replace("Z", "+00:00")

    # поддержка sqlite "YYYY-MM-DD HH:MM:SS" (без 'T')
    # datetime.fromisoformat() это понимает, но сделаем явнее:
    try:
        dt = datetime.fromisoformat(s)
    except Exception:
        return None

    # naive -> трактуем как UTC
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)

    # aware -> конвертим в UTC
    return dt.astimezone(timezone.utc)


def _build_answer_json(existing: Optional[dict], item: ProgressItemIn) -> dict:
    """
    Складываем метаданные о клиентском времени в answer_json,
    не ломая уже существующий JSON.
    """
    base: dict = {}
    if isinstance(existing, dict):
        base.update(existing)

    # сохраняем, что реально прислал клиент
    if item.updated_at is not None:
        base["client_updated_at_raw"] = item.updated_at

    # timezone info
    if item.client_offset_min is not None:
        base["client_offset_min"] = int(item.client_offset_min)

    if item.client_tz is not None:
        base["client_tz"] = item.client_tz

    return base


# -----------------------------
# API
# -----------------------------
@router.post("/sync", response_model=ProgressSyncOut)
def sync_progress(payload: ProgressSyncIn) -> ProgressSyncOut:
    """
    Мобильное приложение отправляет пачку локальных изменений.
    Мы делаем UPSERT в user_progress_server по ключу (device_id, task_id).

    В БД храним updated_at как TIMESTAMPTZ (UTC).
    Доп. инфо о локальном времени/таймзоне пользователя кладём в answer_json.
    """
    if not payload.items:
        return ProgressSyncOut(accepted_task_ids=[])

    db = SessionLocal()
    accepted: list[str] = []

    # ВАЖНО: таблица должна быть создана init_synapse_pg_full_v2.sql
    # и иметь уникальный constraint/индекс на (device_id, task_id).
    upsert_sql = text(
        """
        INSERT INTO user_progress_server
          (device_id, module_id, lesson_id, task_id, completed, score, last_answer, updated_at, answer_json)
        VALUES
          (:device_id, :module_id, :lesson_id, :task_id, :completed, :score, :last_answer,
           COALESCE(:updated_at, NOW()),
           :answer_json::jsonb)
        ON CONFLICT (device_id, task_id) DO UPDATE SET
          module_id   = EXCLUDED.module_id,
          lesson_id   = EXCLUDED.lesson_id,
          completed   = GREATEST(user_progress_server.completed, EXCLUDED.completed),
          score       = GREATEST(user_progress_server.score, EXCLUDED.score),
          last_answer = EXCLUDED.last_answer,
          updated_at  = GREATEST(user_progress_server.updated_at, EXCLUDED.updated_at),
          answer_json = COALESCE(user_progress_server.answer_json, '{}'::jsonb) || EXCLUDED.answer_json
        ;
        """
    )

    try:
        for item in payload.items:
            if item.device_id != payload.device_id:
                raise HTTPException(status_code=400, detail="device_id mismatch in items")

            # нормализуем updated_at -> UTC aware
            dt_utc = _parse_ts_to_utc(item.updated_at)

            # соберём answer_json метаданные
            # берём existing как пустое — при upsert оно склеится через ||
            meta = _build_answer_json(None, item)

            db.execute(
                upsert_sql,
                {
                    "device_id": item.device_id,
                    "module_id": item.module_id,
                    "lesson_id": item.lesson_id or "",
                    "task_id": item.task_id,
                    "completed": int(item.completed),
                    "score": float(item.score),
                    "last_answer": item.last_answer,
                    "updated_at": dt_utc,  # если None -> COALESCE(..., NOW())
                    "answer_json": meta,
                },
            )
            accepted.append(item.task_id)

        db.commit()
        # уберём дубликаты, но сохраним порядок
        seen = set()
        accepted_unique = []
        for t in accepted:
            if t not in seen:
                seen.add(t)
                accepted_unique.append(t)
        return ProgressSyncOut(accepted_task_ids=accepted_unique)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB error: {e}")
    finally:
        db.close()


@router.get("/pull/{device_id}", response_model=List[ProgressRowOut])
def pull_progress(device_id: str, limit: int = 5000) -> List[ProgressRowOut]:
    """
    Восстановление прогресса с сервера (например, переустановка, новый телефон).

    updated_at_utc отдаём в ISO с Z (UTC),
    а answer_json возвращаем как есть (там client_offset_min/client_tz).
    """
    if limit < 1 or limit > 20000:
        raise HTTPException(status_code=400, detail="limit must be 1..20000")

    db = SessionLocal()
    try:
        rows = db.execute(
            text(
                """
                SELECT
                  device_id,
                  module_id,
                  lesson_id,
                  task_id,
                  completed,
                  score,
                  last_answer,
                  to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at_utc,
                  answer_json
                FROM user_progress_server
                WHERE device_id = :device_id
                ORDER BY updated_at DESC
                LIMIT :limit;
                """
            ),
            {"device_id": device_id, "limit": limit},
        ).mappings().all()

        return [ProgressRowOut(**dict(r)) for r in rows]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")
    finally:
        db.close()


# -----------------------------
# Analytics (teacher/parent)
# -----------------------------
@router.get("/analytics/{device_id}")
def progress_analytics(
    device_id: str,
    lang: Optional[str] = None,
    module_id: Optional[str] = None,
    days: int = 14,
) -> Dict[str, Any]:
    """
    Отчет по прогрессу для родителя/учителя.

    Возвращает:
    - totals: выполнено/всего, средний score, последняя активность
    - per_module: разбивка по модулям
    - weak_topics: топ тегов, где есть невыполненные/низкий score
    - activity: сколько задач закрыто по дням (UTC)
    - last_items: последние попытки/выполнения
    """
    if days < 1 or days > 120:
        raise HTTPException(status_code=400, detail="days must be 1..120")

    if lang is not None and lang not in ("ru", "en"):
        raise HTTPException(status_code=400, detail="lang must be ru|en")

    db = SessionLocal()
    try:
        params: Dict[str, Any] = {
            "device_id": device_id,
            "lang": lang,
            "id_lang": f"%_{lang}" if lang else None,
            "module_id": module_id,
            "days": days,
        }

        # totals per module
        rows = db.execute(
            text(
                """
                WITH filtered_tasks AS (
                  SELECT id, module_id
                  FROM tasks
                  WHERE ((:module_id)::text IS NULL OR module_id = (:module_id)::text)
                    AND (
                      ((:lang)::text IS NULL)
                      OR (tags ? (:lang)::text OR id LIKE :id_lang)
                    )
                )
                SELECT
                  ft.module_id,
                  COUNT(*) AS tasks_total,
                  COUNT(*) FILTER (WHERE p.completed = 1) AS tasks_completed,
                  AVG(COALESCE(p.score, 0.0)) FILTER (WHERE p.completed = 1) AS avg_score_completed,
                  MAX(p.updated_at) AS last_active
                FROM filtered_tasks ft
                LEFT JOIN user_progress_server p
                  ON p.task_id = ft.id AND p.device_id = :device_id
                GROUP BY ft.module_id
                ORDER BY ft.module_id
                """
            ),
            params,
        ).mappings().all()

        per_module = []
        total_tasks = 0
        total_completed = 0
        last_active = None
        scores = []

        for r in rows:
            mod = r["module_id"]
            t_total = int(r["tasks_total"] or 0)
            t_done = int(r["tasks_completed"] or 0)
            avg_score = float(r["avg_score_completed"] or 0.0)
            la = r.get("last_active")

            total_tasks += t_total
            total_completed += t_done
            if la and (last_active is None or la > last_active):
                last_active = la
            if t_done > 0:
                scores.append(avg_score)

            per_module.append(
                {
                    "module_id": mod,
                    "tasks_total": t_total,
                    "tasks_completed": t_done,
                    "progress_pct": int(round((t_done / t_total) * 100)) if t_total else 0,
                    "avg_score_completed": round(avg_score, 3),
                    "last_active_utc": la.astimezone(timezone.utc).isoformat() if la else None,
                }
            )

        avg_score_all = round(sum(scores) / len(scores), 3) if scores else 0.0

        # weak topics via tags
        weak_rows = db.execute(
            text(
                """
                WITH filtered_tasks AS (
                  SELECT id, tags
                  FROM tasks
                  WHERE ((:module_id)::text IS NULL OR module_id = (:module_id)::text)
                    AND (
                      ((:lang)::text IS NULL)
                      OR (tags ? (:lang)::text OR id LIKE :id_lang)
                    )
                ),
                joined AS (
                  SELECT ft.id, ft.tags, COALESCE(p.completed,0) AS completed, COALESCE(p.score,0.0) AS score
                  FROM filtered_tasks ft
                  LEFT JOIN user_progress_server p
                    ON p.task_id = ft.id AND p.device_id = :device_id
                )
                SELECT tag, COUNT(*) AS cnt
                FROM (
                  SELECT jsonb_array_elements_text(tags) AS tag
                  FROM joined
                  WHERE completed = 0 OR score < 0.7
                ) s
                WHERE tag NOT IN ('ru','en','generated')
                GROUP BY tag
                ORDER BY cnt DESC
                LIMIT 10
                """
            ),
            params,
        ).mappings().all()

        weak_topics = [{"tag": r["tag"], "count": int(r["cnt"])} for r in weak_rows]


        # -----------------------------
        # Skill graph (by tags)
        # -----------------------------
        skill_rows = db.execute(
            text(
                """
                WITH filtered_tasks AS (
                  SELECT id, tags
                  FROM tasks
                  WHERE ((:module_id)::text IS NULL OR module_id = (:module_id)::text)
                    AND (
                      ((:lang)::text IS NULL)
                      OR (tags ? (:lang)::text OR id LIKE :id_lang)
                    )
                ),
                joined AS (
                  SELECT ft.id, ft.tags, p.completed, p.score, p.updated_at
                  FROM filtered_tasks ft
                  LEFT JOIN user_progress_server p
                    ON p.task_id = ft.id AND p.device_id = :device_id
                )
                SELECT
                  tag,
                  COUNT(*) AS tasks_total,
                  COUNT(*) FILTER (WHERE updated_at IS NOT NULL) AS attempted,
                  COUNT(*) FILTER (WHERE COALESCE(completed,0) = 1) AS completed,
                  AVG(COALESCE(score, 0.0)) FILTER (WHERE COALESCE(completed,0) = 1) AS avg_score_completed
                FROM (
                  SELECT jsonb_array_elements_text(tags) AS tag, completed, score, updated_at
                  FROM joined
                ) s
                WHERE tag NOT IN ('ru','en','generated')
                GROUP BY tag
                ORDER BY attempted DESC, tasks_total DESC
                LIMIT 40
                """
            ),
            params,
        ).mappings().all()

        skills: List[Dict[str, Any]] = []
        for r in skill_rows:
            tag = str(r.get("tag") or "")
            tasks_total = int(r.get("tasks_total") or 0)
            attempted = int(r.get("attempted") or 0)
            completed = int(r.get("completed") or 0)
            avg_score = float(r.get("avg_score_completed") or 0.0)

            completion_rate = (completed / tasks_total) if tasks_total else 0.0
            mastery = (0.65 * avg_score) + (0.35 * completion_rate)
            mastery = max(0.0, min(1.0, mastery))

            if tasks_total >= 5 and mastery < 0.45:
                risk = "high"
            elif tasks_total >= 3 and mastery < 0.6:
                risk = "medium"
            else:
                risk = "low"

            skills.append(
                {
                    "tag": tag,
                    "tasks_total": tasks_total,
                    "attempted": attempted,
                    "completed": completed,
                    "avg_score_completed": round(avg_score, 3),
                    "completion_rate": round(completion_rate, 3),
                    "mastery": round(mastery, 3),
                    "risk": risk,
                }
            )

        # слабые навыки сначала
        skills.sort(key=lambda x: (x.get("mastery", 0.0), -x.get("attempted", 0)))
        recommend_next = [s["tag"] for s in skills[:5] if s.get("tag")]
        skill_graph = {"skills": skills[:25], "recommend_next": recommend_next}

        # -----------------------------
        # Lessons/sections report
        # -----------------------------
        lesson_rows = db.execute(
            text(
                """
                WITH filtered_tasks AS (
                  SELECT id, module_id, lesson_id, title, tags
                  FROM tasks
                  WHERE lesson_id IS NOT NULL
                    AND ((:module_id)::text IS NULL OR module_id = (:module_id)::text)
                    AND (
                      ((:lang)::text IS NULL)
                      OR (tags ? (:lang)::text OR id LIKE :id_lang)
                    )
                ),
                joined AS (
                  SELECT
                    ft.lesson_id,
                    ft.module_id,
                    p.completed,
                    p.score,
                    p.updated_at
                  FROM filtered_tasks ft
                  LEFT JOIN user_progress_server p
                    ON p.task_id = ft.id AND p.device_id = :device_id
                ),
                agg AS (
                  SELECT
                    lesson_id,
                    module_id,
                    COUNT(*) AS tasks_total,
                    COUNT(*) FILTER (WHERE COALESCE(completed,0) = 1) AS tasks_completed,
                    AVG(COALESCE(score,0.0)) FILTER (WHERE COALESCE(completed,0) = 1) AS avg_score_completed,
                    MAX(updated_at) AS last_active
                  FROM joined
                  GROUP BY lesson_id, module_id
                )
                SELECT
                  a.lesson_id,
                  a.module_id,
                  a.tasks_total,
                  a.tasks_completed,
                  a.avg_score_completed,
                  a.last_active,
                  lb.title AS lesson_title,
                  lb.difficulty,
                  lb.sort_order
                FROM agg a
                LEFT JOIN lesson_blocks lb ON lb.id = a.lesson_id
                ORDER BY (a.tasks_total - a.tasks_completed) DESC, a.avg_score_completed ASC NULLS FIRST
                LIMIT 30
                """
            ),
            params,
        ).mappings().all()

        # слабые/застрявшие задачи (для подсказок в отчете)
        weak_task_rows = db.execute(
            text(
                """
                WITH filtered_tasks AS (
                  SELECT id, lesson_id, title, tags
                  FROM tasks
                  WHERE lesson_id IS NOT NULL
                    AND ((:module_id)::text IS NULL OR module_id = (:module_id)::text)
                    AND (
                      ((:lang)::text IS NULL)
                      OR (tags ? (:lang)::text OR id LIKE :id_lang)
                    )
                )
                SELECT
                  ft.lesson_id,
                  ft.id AS task_id,
                  ft.title,
                  COALESCE(p.completed,0) AS completed,
                  COALESCE(p.score,0.0) AS score,
                  p.updated_at
                FROM filtered_tasks ft
                LEFT JOIN user_progress_server p
                  ON p.task_id = ft.id AND p.device_id = :device_id
                WHERE p.updated_at IS NOT NULL
                  AND (COALESCE(p.completed,0) = 0 OR COALESCE(p.score,0.0) < 0.7)
                ORDER BY p.updated_at DESC
                LIMIT 80
                """
            ),
            params,
        ).mappings().all()

        repeat_task_rows = db.execute(
            text(
                """
                WITH filtered_tasks AS (
                  SELECT id, lesson_id, title, tags
                  FROM tasks
                  WHERE lesson_id IS NOT NULL
                    AND ((:module_id)::text IS NULL OR module_id = (:module_id)::text)
                    AND (
                      ((:lang)::text IS NULL)
                      OR (tags ? (:lang)::text OR id LIKE :id_lang)
                    )
                )
                SELECT
                  ft.lesson_id,
                  ft.id AS task_id,
                  ft.title,
                  COALESCE(p.score,0.0) AS score,
                  p.updated_at
                FROM filtered_tasks ft
                JOIN user_progress_server p
                  ON p.task_id = ft.id AND p.device_id = :device_id
                WHERE COALESCE(p.completed,0) = 1
                  AND COALESCE(p.score,0.0) < 0.75
                ORDER BY p.updated_at DESC
                LIMIT 80
                """
            ),
            params,
        ).mappings().all()

        weak_by_lesson: Dict[str, List[Dict[str, Any]]] = {}
        for r in weak_task_rows:
            lid = str(r.get("lesson_id"))
            weak_by_lesson.setdefault(lid, []).append(
                {
                    "task_id": r.get("task_id"),
                    "title": r.get("title"),
                    "completed": int(r.get("completed") or 0),
                    "score": float(r.get("score") or 0.0),
                }
            )

        repeat_by_lesson: Dict[str, List[Dict[str, Any]]] = {}
        for r in repeat_task_rows:
            lid = str(r.get("lesson_id"))
            repeat_by_lesson.setdefault(lid, []).append(
                {
                    "task_id": r.get("task_id"),
                    "title": r.get("title"),
                    "score": float(r.get("score") or 0.0),
                }
            )

        lessons_report: List[Dict[str, Any]] = []
        for r in lesson_rows:
            lid = str(r.get("lesson_id"))
            t_total = int(r.get("tasks_total") or 0)
            t_done = int(r.get("tasks_completed") or 0)
            avg = float(r.get("avg_score_completed") or 0.0)
            la = r.get("last_active")

            missing = max(0, t_total - t_done)
            if t_total >= 6 and (missing >= 4 or avg < 0.55):
                risk = "high"
            elif t_total >= 4 and (missing >= 2 or avg < 0.7):
                risk = "medium"
            else:
                risk = "low"

            lessons_report.append(
                {
                    "lesson_id": int(r.get("lesson_id") or 0),
                    "module_id": r.get("module_id"),
                    "title": r.get("lesson_title") or f"Lesson {lid}",
                    "difficulty": int(r.get("difficulty") or 1),
                    "sort_order": int(r.get("sort_order") or 0),
                    "tasks_total": t_total,
                    "tasks_completed": t_done,
                    "progress_pct": int(round((t_done / t_total) * 100)) if t_total else 0,
                    "avg_score_completed": round(avg, 3),
                    "last_active_utc": la.astimezone(timezone.utc).isoformat() if la else None,
                    "risk": risk,
                    "stuck": weak_by_lesson.get(lid, [])[:5],
                    "needs_repeat": repeat_by_lesson.get(lid, [])[:5],
                }
            )

        # -----------------------------
        # Teacher demo (templated)
        # -----------------------------
        def _teacher_demo_for(tag: str, module_hint: Optional[str]) -> Dict[str, Any]:
            # Шаблонные мини-сценарии для учителя/родителя:
            # формула/идея -> частые ошибки -> пример -> быстрые вопросы.
            tag_n = (tag or "").lower()
            module = module_hint or (
                "chemistry"
                if tag_n
                in {
                    "stoichiometry",
                    "moles",
                    "mole",
                    "balancing",
                    "acids",
                    "bases",
                    "ph",
                    "redox",
                    "periodic",
                    "bonds",
                    "organic",
                }
                else "physics"
            )

            if lang == "ru":
                # -------- Physics
                if module == "physics" and tag_n in ("electricity", "ohm", "circuits"):
                    return {
                        "tag": tag,
                        "module_id": "physics",
                        "formula": "U = I * R (закон Ома)",
                        "common_mistakes": [
                            "Путают Ом и Ампер",
                            "Не переводят мА в А",
                            "Складывают сопротивления не по схеме",
                        ],
                        "example": {"problem": "U=12 В, R=4 Ом. Найти I.", "solution": "I = U/R = 12/4 = 3 А"},
                        "quick_questions": [
                            "Если R выросло в 2 раза, что с I?",
                            "Что измеряют в Омах?",
                            "Какая формула для R?",
                        ],
                    }

                if module == "physics" and tag_n in ("kinematics", "motion"):
                    return {
                        "tag": tag,
                        "module_id": "physics",
                        "formula": "v = s/t,  s = v*t (равномерное движение)",
                        "common_mistakes": [
                            "Не переводят км/ч в м/с",
                            "Берут t в минутах без перевода",
                            "Путают путь и перемещение",
                        ],
                        "example": {"problem": "s=120 м за 30 с. Найти v.", "solution": "v = 120/30 = 4 м/с"},
                        "quick_questions": [
                            "Что такое скорость?",
                            "Как найти путь по скорости?",
                            "Как перевести 36 км/ч в м/с?",
                        ],
                    }

                if module == "physics" and tag_n in ("dynamics", "newton"):
                    return {
                        "tag": tag,
                        "module_id": "physics",
                        "formula": "F = m * a (2-й закон Ньютона)",
                        "common_mistakes": [
                            "Путают массу и вес",
                            "Не переводят граммы в килограммы",
                            "Складывают силы без направления",
                        ],
                        "example": {"problem": "m=2 кг, a=3 м/с^2. Найти F.", "solution": "F = m*a = 2*3 = 6 Н"},
                        "quick_questions": [
                            "Чем масса отличается от веса?",
                            "Какая единица силы?",
                            "Что будет с a при увеличении m при той же F?",
                        ],
                    }

                if module == "physics" and tag_n in ("energy", "work", "power"):
                    return {
                        "tag": tag,
                        "module_id": "physics",
                        "formula": "A = F*s,  P = A/t,  E_k = m*v^2/2",
                        "common_mistakes": [
                            "Путают работу и мощность",
                            "Не учитывают направление силы",
                            "Смешивают Дж и Вт",
                        ],
                        "example": {"problem": "F=10 Н, s=3 м. Найти работу A.", "solution": "A=F*s=10*3=30 Дж"},
                        "quick_questions": [
                            "Что измеряют в Ваттах?",
                            "Как связаны работа и мощность?",
                            "Когда работа равна нулю?",
                        ],
                    }

                # -------- Chemistry
                if module == "chemistry" and tag_n in ("stoichiometry", "moles", "mole"):
                    return {
                        "tag": tag,
                        "module_id": "chemistry",
                        "formula": "n = m/M,  N = n * N_A",
                        "common_mistakes": [
                            "Путают молярную массу и массу",
                            "Не ставят коэффициенты в уравнении",
                            "Забывают про единицы",
                        ],
                        "example": {"problem": "m=18 г H2O. Найти n.", "solution": "M(H2O)=18 г/моль, n=m/M=18/18=1 моль"},
                        "quick_questions": [
                            "Что такое 1 моль?",
                            "Как найти M(H2O)?",
                            "Почему важны коэффициенты?",
                        ],
                    }

                if module == "chemistry" and tag_n in ("balancing", "reaction_balancing"):
                    return {
                        "tag": tag,
                        "module_id": "chemistry",
                        "formula": "Сохраняем число атомов каждого элемента (коэффициенты перед формулами)",
                        "common_mistakes": [
                            "Меняют индексы в формуле вместо коэффициентов",
                            "Не проверяют все элементы",
                            "Путают коэффициенты и индексы",
                        ],
                        "example": {"problem": "Уравнять: H2 + O2 -> H2O", "solution": "2H2 + O2 -> 2H2O"},
                        "quick_questions": [
                            "Что можно менять при уравнивании?",
                            "Почему нельзя менять индексы?",
                            "Как быстро проверить уравнение?",
                        ],
                    }

                if module == "chemistry" and tag_n in ("acids", "bases", "ph"):
                    return {
                        "tag": tag,
                        "module_id": "chemistry",
                        "formula": "pH = -log10[H+],  pH + pOH = 14 (в воде при 25C)",
                        "common_mistakes": [
                            "Путают pH и концентрацию",
                            "Забывают, что шкала логарифмическая",
                            "Неправильно сравнивают кислотность",
                        ],
                        "example": {"problem": "Какая среда при pH=3?", "solution": "Кислая, потому что pH<7"},
                        "quick_questions": [
                            "Что означает pH=7?",
                            "Почему pH=3 намного кислее pH=4?",
                            "Как меняется pH при разбавлении кислоты?",
                        ],
                    }

                if module == "chemistry" and tag_n in ("redox", "oxidation", "reduction"):
                    return {
                        "tag": tag,
                        "module_id": "chemistry",
                        "formula": "Окисление: отдача e-, восстановление: прием e-; степень окисления меняется", 
                        "common_mistakes": [
                            "Путают окислитель и восстановитель",
                            "Не отслеживают электроны",
                            "Ошибаются в степенях окисления",
                        ],
                        "example": {"problem": "Кто окислитель в реакции: Zn + Cu2+ -> Zn2+ + Cu?", "solution": "Окислитель Cu2+ (принимает e-)"},
                        "quick_questions": [
                            "Что происходит со степенью окисления при восстановлении?",
                            "Кто принимает электроны?",
                            "Зачем уравнивают e-?",
                        ],
                    }

                # fallback
                return {
                    "tag": tag,
                    "module_id": module,
                    "formula": "Определение -> формула/идея -> подстановка",
                    "common_mistakes": [
                        "Не проверяют единицы",
                        "Пропускают шаги решения",
                        "Не делают проверку результата",
                    ],
                    "example": {
                        "problem": "Сформулируйте простую задачу по теме и выпишите данные.",
                        "solution": "Шаги: данные -> формула -> подстановка -> проверка здравого смысла.",
                    },
                    "quick_questions": [
                        "Какая величина основная?",
                        "Какие единицы измерения?",
                        "Как проверить ответ?",
                    ],
                }

            # EN fallback (MVP)
            return {
                "tag": tag,
                "module_id": module,
                "formula": "Definition -> formula/idea -> substitution",
                "common_mistakes": ["Unit conversion", "Skipping steps", "No sanity check"],
                "example": {"problem": "Create a simple problem for this topic.", "solution": "Givens -> formula -> substitution -> sanity check."},
                "quick_questions": ["Main variable?", "Units?", "How to validate?"],
            }

        # Привязка teacher_demo к lesson_id/lesson_title:
        # берем самые рискованные уроки (если есть), иначе fallback на слабые теги.
        def _lesson_sort_key(x: Dict[str, Any]):
            risk = str(x.get("risk") or "low")
            r = 2 if risk == "high" else 1 if risk == "medium" else 0
            total = int(x.get("tasks_total") or 0)
            done = int(x.get("tasks_completed") or 0)
            missing = max(0, total - done)
            avg = float(x.get("avg_score_completed") or 0.0)
            # больше missing и меньше avg => выше приоритет
            return (-r, -missing, avg)

        teacher_items: List[Dict[str, Any]] = []
        lessons_sorted = sorted(lessons_report, key=_lesson_sort_key)
        for l in lessons_sorted[:3]:
            lesson_id_val = int(l.get("lesson_id") or 0)
            if not lesson_id_val:
                continue
            lmod = str(l.get("module_id") or "")
            ltitle = str(l.get("title") or "")

            # top weak tag inside this lesson
            tag_row = db.execute(
                text(
                    """
                    WITH filtered_tasks AS (
                      SELECT id, tags
                      FROM tasks
                      WHERE lesson_id = :lesson_id
                        AND ((:module_id)::text IS NULL OR module_id = (:module_id)::text)
                        AND (
                          ((:lang)::text IS NULL)
                          OR (tags ? (:lang)::text OR id LIKE :id_lang)
                        )
                    ),
                    joined AS (
                      SELECT ft.id, ft.tags, COALESCE(p.completed,0) AS completed, COALESCE(p.score,0.0) AS score
                      FROM filtered_tasks ft
                      LEFT JOIN user_progress_server p
                        ON p.task_id = ft.id AND p.device_id = :device_id
                    )
                    SELECT tag, COUNT(*) AS cnt
                    FROM (
                      SELECT jsonb_array_elements_text(tags) AS tag
                      FROM joined
                      WHERE completed = 0 OR score < 0.7
                    ) s
                    WHERE tag NOT IN ('ru','en','generated')
                    GROUP BY tag
                    ORDER BY cnt DESC
                    LIMIT 1
                    """
                ),
                {**params, "lesson_id": lesson_id_val},
            ).mappings().first()

            best_tag = str(tag_row.get("tag")) if tag_row and tag_row.get("tag") else (recommend_next[0] if recommend_next else "")
            item = _teacher_demo_for(best_tag, lmod)

            # attach first weak task for one-tap opening
            st = weak_by_lesson.get(str(lesson_id_val), [])
            if st:
                item["first_stuck_task_id"] = st[0].get("task_id")
                item["first_stuck_task_title"] = st[0].get("title")

            item["lesson_id"] = lesson_id_val
            item["lesson_title"] = ltitle
            teacher_items.append(item)

        if not teacher_items:
            teacher_items = [_teacher_demo_for(tg, module_id) for tg in recommend_next[:3]]

        teacher_demo = {
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "items": teacher_items,
        }

        risk_lessons = [x for x in lessons_report if str(x.get("risk")) in {"high", "medium"}]
        parent_insights = {
            "daily_plan": [
                {
                    "step": 1,
                    "title": "Повтор слабой темы",
                    "topic": (recommend_next[0] if recommend_next else "general"),
                    "durationMin": 15,
                },
                {
                    "step": 2,
                    "title": "5 задач по рисковому уроку",
                    "lesson": (risk_lessons[0].get("title") if risk_lessons else "next lesson"),
                    "durationMin": 20,
                },
                {
                    "step": 3,
                    "title": "Мини-рефлексия",
                    "prompt": "Где была основная ошибка и как ее избежать завтра?",
                    "durationMin": 5,
                },
            ],
            "weekly_goal": {
                "targetTasks": 35,
                "targetCompletionPct": 80,
                "currentCompletionPct": int(round((total_completed / total_tasks) * 100)) if total_tasks else 0,
            },
        }

        teacher_insights = {
            "intervention_queue": [
                {
                    "lessonId": row.get("lesson_id"),
                    "moduleId": row.get("module_id"),
                    "title": row.get("title"),
                    "risk": row.get("risk"),
                    "reason": f"progress {row.get('progress_pct')}% / avg {row.get('avg_score_completed')}",
                }
                for row in risk_lessons[:6]
            ],
            "top_focus_topics": weak_topics[:5],
            "recommended_live_tags": recommend_next[:3],
        }

        # -----------------------------
        # Learning effectiveness (real backend payload)
        # -----------------------------
        le_rows = db.execute(
            text(
                """
                SELECT
                  COALESCE(completed, 0) AS completed,
                  COALESCE(score, 0.0) AS score,
                  updated_at,
                  answer_json
                FROM user_progress_server
                WHERE device_id = :device_id
                  AND ((:module_id)::text IS NULL OR module_id = (:module_id)::text)
                ORDER BY updated_at DESC
                LIMIT 160
                """
            ),
            params,
        ).mappings().all()

        learning_effectiveness: Optional[Dict[str, Any]] = None
        if le_rows:
            attempts = [dict(r) for r in le_rows if r.get("updated_at") is not None]
            if len(attempts) >= 4:
                split = max(2, len(attempts) // 2)
                after_part = attempts[:split]
                before_part = attempts[split:]
                if not before_part:
                    before_part = attempts[-split:]

                def _avg_score(rows_local: List[Dict[str, Any]]) -> float:
                    if not rows_local:
                        return 0.0
                    return float(sum(float(x.get("score") or 0.0) for x in rows_local) / len(rows_local))

                def _completion_rate(rows_local: List[Dict[str, Any]]) -> float:
                    if not rows_local:
                        return 0.0
                    done = 0
                    for x in rows_local:
                        completed = int(x.get("completed") or 0)
                        score = float(x.get("score") or 0.0)
                        if completed >= 1 or score >= 0.99:
                            done += 1
                    return float(done / len(rows_local))

                before_avg = _avg_score(before_part)
                after_avg = _avg_score(after_part)
                before_comp = _completion_rate(before_part)
                after_comp = _completion_rate(after_part)

                too_fast = 0
                for x in attempts:
                    aj = x.get("answer_json")
                    if isinstance(aj, dict):
                        if str(aj.get("integrity_flag") or "") == "too_fast_answer":
                            too_fast += 1
                        elif bool(aj.get("too_fast_answer")):
                            too_fast += 1

                ab_hash = hashlib.sha1(device_id.encode("utf-8")).hexdigest()
                bucket = "A" if (int(ab_hash[:8], 16) % 2 == 0) else "B"
                variant = "spaced_feedback" if bucket == "A" else "concept_first"

                learning_effectiveness = {
                    "before": {
                        "attempts": len(before_part),
                        "completionRate": round(before_comp, 3),
                        "avgScore": round(before_avg, 3),
                    },
                    "after": {
                        "attempts": len(after_part),
                        "completionRate": round(after_comp, 3),
                        "avgScore": round(after_avg, 3),
                    },
                    "uplift": {
                        "completionRateDelta": round(after_comp - before_comp, 3),
                        "avgScoreDelta": round(after_avg - before_avg, 3),
                    },
                    "ab": {"bucket": bucket, "variant": variant},
                    "integrity": {
                        "totalTaskEvents": len(attempts),
                        "tooFastAnswers": int(too_fast),
                        "tooFastSharePct": round((too_fast / len(attempts)) * 100, 1) if attempts else 0.0,
                    },
                }


        # activity per day
        act_rows = db.execute(
            text(
                """
                SELECT
                  to_char(date_trunc('day', updated_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
                  COUNT(*) FILTER (WHERE completed = 1) AS completed_count,
                  AVG(score) FILTER (WHERE completed = 1) AS avg_score
                FROM user_progress_server
                WHERE device_id = :device_id
                  AND updated_at > (NOW() AT TIME ZONE 'UTC') - (:days || ' days')::interval
                  AND ((:module_id)::text IS NULL OR module_id = (:module_id)::text)
                GROUP BY 1
                ORDER BY 1
                """
            ),
            params,
        ).mappings().all()

        activity = [
            {
                "day": r["day"],
                "completed": int(r["completed_count"] or 0),
                "avg_score": round(float(r["avg_score"] or 0.0), 3),
            }
            for r in act_rows
        ]

        # last items
        last_rows = db.execute(
            text(
                """
                SELECT
                  p.task_id,
                  p.module_id,
                  p.lesson_id,
                  p.completed,
                  p.score,
                  p.updated_at,
                  t.title
                FROM user_progress_server p
                LEFT JOIN tasks t ON t.id = p.task_id
                WHERE p.device_id = :device_id
                  AND ((:module_id)::text IS NULL OR p.module_id = (:module_id)::text)
                ORDER BY p.updated_at DESC
                LIMIT 20
                """
            ),
            params,
        ).mappings().all()

        last_items = []
        for r in last_rows:
            dt = r.get("updated_at")
            last_items.append(
                {
                    "task_id": r.get("task_id"),
                    "title": r.get("title"),
                    "module_id": r.get("module_id"),
                    "lesson_id": r.get("lesson_id"),
                    "completed": int(r.get("completed") or 0),
                    "score": float(r.get("score") or 0.0),
                    "updated_at_utc": dt.astimezone(timezone.utc).isoformat() if dt else None,
                }
            )

        return {
            "device_id": device_id,
            "filters": {"lang": lang, "module_id": module_id, "days": days},
            "totals": {
                "tasks_total": total_tasks,
                "tasks_completed": total_completed,
                "progress_pct": int(round((total_completed / total_tasks) * 100)) if total_tasks else 0,
                "avg_score_completed": avg_score_all,
                "last_active_utc": last_active.astimezone(timezone.utc).isoformat() if last_active else None,
            },
            "per_module": per_module,
            "weak_topics": weak_topics,
            "skill_graph": skill_graph,
            "lessons_report": lessons_report,
            "learning_effectiveness": learning_effectiveness,
            "teacher_demo": teacher_demo,
            "parent_insights": parent_insights,
            "teacher_insights": teacher_insights,
            "activity": activity,
            "last_items": last_items,
        }
    finally:
        db.close()
