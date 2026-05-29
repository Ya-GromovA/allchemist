from datetime import datetime, timezone
from typing import Any, Dict, List
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, Query

from app.schemas.content import ChildProgressOut, ParentCabinetOut, TeacherCabinetOut
from app.security.policies import can, normalize_role
from app.services.user_state_store import _read_state, _write_state, resolve_access_token, reset_user_devices
from app.services.push_provider import dispatch_push_notifications

router = APIRouter()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _risk_from_score(score: float, medium: float = 0.4, high: float = 0.72) -> str:
    if score >= high:
        return "high"
    if score >= medium:
        return "medium"
    return "low"


def _teacher_live_store() -> Dict[str, Any]:
    state = _read_state()
    store = state.setdefault("teacher_live", {})
    store.setdefault("sessions", {})
    store.setdefault("events", [])
    return state


def _notifications_store() -> Dict[str, Any]:
    state = _read_state()
    state.setdefault("push_tokens", {})
    state.setdefault("notifications", {"inbox": {}, "events": []})
    return state


def _collect_user_push_tokens(state: Dict[str, Any], user_id: str) -> List[Dict[str, Any]]:
    rows = state.setdefault("push_tokens", {}).get(user_id, [])
    out: List[Dict[str, Any]] = []
    if not isinstance(rows, list):
        return out
    for row in rows:
        if not isinstance(row, dict):
            continue
        if bool(row.get("revoked")):
            continue
        token = str(row.get("token") or "").strip()
        if not token:
            continue
        out.append({
            "token": token,
            "platform": str(row.get("platform") or "unknown"),
            "deviceId": row.get("deviceId"),
        })
    return out


async def _push_notify_users(state: Dict[str, Any], user_ids: List[str], title: str, message: str, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    notif = state.setdefault("notifications", {"inbox": {}, "events": []})
    inbox = notif.setdefault("inbox", {})
    events = notif.setdefault("events", [])
    now = _now_iso()
    sent: List[Dict[str, Any]] = []

    for uid in user_ids:
        if not uid:
            continue
        item = {
            "id": f"ntf_{secrets.token_hex(8)}",
            "userId": uid,
            "title": title,
            "message": message,
            "payload": payload,
            "createdAt": now,
            "readAt": None,
            "delivery": "queued",
        }
        rows = inbox.setdefault(uid, [])
        rows.append(item)
        inbox[uid] = rows[-80:]

        tokens = _collect_user_push_tokens(state, uid)
        if tokens:
            try:
                push_res = await dispatch_push_notifications(tokens=tokens, title=title, body=message, data=payload)
                item["delivery"] = "sent" if push_res.get("ok") else "provider_error"
                item["providerResponse"] = push_res
            except Exception as exc:
                item["delivery"] = "provider_error"
                item["providerResponse"] = {"ok": False, "error": str(exc)}
        else:
            item["delivery"] = "queued_no_token"
        sent.append(item)

    events.append({"at": now, "event": "push_dispatch", "count": len(sent), "payload": payload})
    notif["events"] = events[-2000:]
    return sent


def _build_heatmap(session: Dict[str, Any]) -> List[Dict[str, Any]]:
    attempts = session.get("attempts", {}) if isinstance(session.get("attempts"), dict) else {}
    buckets: Dict[str, Dict[str, Any]] = {}

    for key, stats in attempts.items():
        task_id, _sep, lesson_id = str(key).partition("::")
        ok = int(stats.get("ok") or 0)
        wrong = int(stats.get("wrong") or 0)
        pending = max(0, int(stats.get("pending") or 0))

        bucket = buckets.setdefault(lesson_id or "general", {"lessonId": lesson_id or "general", "cells": [], "riskScore": 0.0})
        risk_score = round((wrong * 1.2 + pending * 0.8) / max(1, ok + wrong + pending), 3)
        risk = _risk_from_score(risk_score, medium=0.4, high=0.75)

        bucket["cells"].append({"taskId": task_id or "unknown", "ok": ok, "wrong": wrong, "pending": pending, "risk": risk, "riskScore": risk_score})

    rows = list(buckets.values())
    for row in rows:
        scores = [float(c.get("riskScore") or 0.0) for c in row.get("cells", [])]
        row["riskScore"] = round(sum(scores) / max(1, len(scores)), 3)
        row["cells"] = sorted(row["cells"], key=lambda c: c.get("riskScore", 0.0), reverse=True)
    rows.sort(key=lambda r: r.get("riskScore", 0.0), reverse=True)
    return rows


def _build_topic_heatmap(session: Dict[str, Any]) -> List[Dict[str, Any]]:
    attempts = session.get("attempts", {}) if isinstance(session.get("attempts"), dict) else {}
    buckets: Dict[str, Dict[str, Any]] = {}

    for key, stats in attempts.items():
        _task, _sep, lesson_id = str(key).partition("::")
        lesson = lesson_id or "general"
        topic = lesson.split("_")[0] if "_" in lesson else lesson
        row = buckets.setdefault(topic, {"topic": topic, "ok": 0, "wrong": 0, "pending": 0})
        row["ok"] += int(stats.get("ok") or 0)
        row["wrong"] += int(stats.get("wrong") or 0)
        row["pending"] += int(stats.get("pending") or 0)

    out: List[Dict[str, Any]] = []
    for row in buckets.values():
        total = max(1, row["ok"] + row["wrong"] + row["pending"])
        score = round((row["wrong"] * 1.3 + row["pending"] * 0.7) / total, 3)
        out.append({**row, "riskScore": score, "risk": _risk_from_score(score)})
    out.sort(key=lambda x: x.get("riskScore", 0.0), reverse=True)
    return out


def _infer_mistake_tag(task_id: str, lesson_id: str) -> str:
    base = f"{task_id} {lesson_id}".lower()
    if any(k in base for k in ["stoich", "mole", "mass"]):
        return "stoichiometry"
    if any(k in base for k in ["balance", "equation"]):
        return "equation_balance"
    if any(k in base for k in ["formula", "ion"]):
        return "formula_ionic"
    if any(k in base for k in ["graph", "chart", "plot"]):
        return "graph_reading"
    if any(k in base for k in ["lab", "safety"]):
        return "lab_safety"
    return "general_concept"


def _build_classroom_heatmap(session: Dict[str, Any]) -> List[Dict[str, Any]]:
    events = session.get("events", []) if isinstance(session.get("events"), list) else []
    buckets: Dict[str, Dict[str, Any]] = {}
    for event in events:
        name = str(event.get("event") or "")
        if name not in {"correct", "wrong", "pending"}:
            continue
        classroom = str(event.get("classroom") or "general")
        row = buckets.setdefault(classroom, {"classroom": classroom, "ok": 0, "wrong": 0, "pending": 0, "tasks": set()})
        if name == "correct":
            row["ok"] += 1
        elif name == "wrong":
            row["wrong"] += 1
        else:
            row["pending"] += 1
        task_id = str(event.get("taskId") or "")
        if task_id:
            row["tasks"].add(task_id)

    out: List[Dict[str, Any]] = []
    for row in buckets.values():
        total = max(1, row["ok"] + row["wrong"] + row["pending"])
        score = round((row["wrong"] * 1.25 + row["pending"] * 0.75) / total, 3)
        out.append(
            {
                "classroom": row["classroom"],
                "ok": row["ok"],
                "wrong": row["wrong"],
                "pending": row["pending"],
                "tasksTracked": len(row["tasks"]),
                "riskScore": score,
                "risk": _risk_from_score(score),
            }
        )
    out.sort(key=lambda x: x.get("riskScore", 0.0), reverse=True)
    return out


def _build_mistake_taxonomy(session: Dict[str, Any]) -> List[Dict[str, Any]]:
    events = session.get("events", []) if isinstance(session.get("events"), list) else []
    buckets: Dict[str, Dict[str, Any]] = {}
    for event in events:
        name = str(event.get("event") or "")
        if name not in {"correct", "wrong", "pending"}:
            continue
        task_id = str(event.get("taskId") or "")
        lesson_id = str(event.get("lessonId") or "general")
        tag = str(event.get("mistakeTag") or _infer_mistake_tag(task_id, lesson_id))
        row = buckets.setdefault(tag, {"tag": tag, "correct": 0, "wrong": 0, "pending": 0})
        if name == "correct":
            row["correct"] += 1
        elif name == "wrong":
            row["wrong"] += 1
        else:
            row["pending"] += 1

    out: List[Dict[str, Any]] = []
    for row in buckets.values():
        total = max(1, row["correct"] + row["wrong"] + row["pending"])
        score = round((row["wrong"] * 1.35 + row["pending"] * 0.65) / total, 3)
        out.append({**row, "total": total, "riskScore": score, "risk": _risk_from_score(score, medium=0.33, high=0.66)})
    out.sort(key=lambda x: x.get("riskScore", 0.0), reverse=True)
    return out


def _build_roster_map(session: Dict[str, Any]) -> List[Dict[str, Any]]:
    participants = session.get("participants", {}) if isinstance(session.get("participants"), dict) else {}
    roster = session.get("roster", {}) if isinstance(session.get("roster"), dict) else {}

    by_class: Dict[str, Dict[str, Any]] = {}
    for uid, meta in participants.items():
        classroom = str(meta.get("classroom") or "general")
        row = by_class.setdefault(classroom, {"classroom": classroom, "participants": [], "expectedIds": set(roster.get(classroom, []))})
        row["participants"].append(
            {
                "userId": uid,
                "joinedAt": meta.get("joinedAt"),
                "role": meta.get("role", "student"),
                "rosterMatched": uid in row["expectedIds"] if row["expectedIds"] else None,
            }
        )

    for classroom, ids in roster.items():
        if classroom not in by_class:
            by_class[classroom] = {"classroom": classroom, "participants": [], "expectedIds": set(ids if isinstance(ids, list) else [])}

    out: List[Dict[str, Any]] = []
    for row in by_class.values():
        expected = sorted(list(row["expectedIds"]))
        joined_ids = [p["userId"] for p in row["participants"]]
        joined_set = set(joined_ids)
        missing = [uid for uid in expected if uid not in joined_set]
        matched = sum(1 for uid in joined_ids if uid in row["expectedIds"]) if expected else len(joined_ids)
        out.append(
            {
                "classroom": row["classroom"],
                "expectedTotal": len(expected),
                "joinedTotal": len(joined_ids),
                "matchedTotal": matched,
                "missingPreview": missing[:12],
                "participants": sorted(row["participants"], key=lambda p: str(p.get("joinedAt") or ""), reverse=True),
            }
        )
    out.sort(key=lambda x: x.get("classroom", ""))
    return out


def _session_summary(session: Dict[str, Any]) -> Dict[str, Any]:
    participants = session.get("participants", {}) if isinstance(session.get("participants"), dict) else {}
    preview = []
    for uid, meta in list(participants.items())[:30]:
        preview.append({"userId": uid, "role": meta.get("role", "student"), "classroom": meta.get("classroom", "general"), "joinedAt": meta.get("joinedAt")})
    return {"participantsTotal": len(participants), "participantsPreview": preview}


def _require_auth_user(authorization: str | None = Header(default=None)) -> Dict[str, Any]:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is required")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer token is required")
    token = authorization[len("Bearer ") :].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Bearer token is required")
    try:
        return resolve_access_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e


def _require_scope(auth_user: Dict[str, Any], scope: str) -> str:
    role = normalize_role(auth_user.get("role"))
    if not can(role, scope):
        raise HTTPException(status_code=403, detail="Insufficient role scope")
    return role


def _count_events(user_id: str) -> Dict[str, int]:
    state = _read_state()
    telemetry = [e for e in state.get("telemetry", []) if e.get("userId") == user_id]
    return {
        "assignHomework": sum(1 for e in telemetry if e.get("name") in {"assign_homework", "teacher_assign_homework"}),
        "liveDemo": sum(1 for e in telemetry if e.get("name") in {"open_live_demo", "teacher_live_demo_start"}),
        "childProgress": sum(1 for e in telemetry if e.get("name") in {"child_progress_open", "risk_zone_view"}),
        "solved": sum(1 for e in telemetry if e.get("name") in {"task_completed", "practice_completed"}),
        "examStart": sum(1 for e in telemetry if e.get("name") in {"mini_exam_start", "exam_started"}),
    }


@router.get("/cabinet/teacher/overview", response_model=TeacherCabinetOut, tags=["cabinet"])
async def teacher_overview(auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "cabinet:teacher")
    user_id = auth_user["userId"]
    state = _read_state()
    sync = state.get("device_sync", {}).get(user_id, {})
    prefs = sync.get("preferences", {})
    classes = prefs.get("classrooms") if isinstance(prefs.get("classrooms"), list) else []
    counts = _count_events(user_id)

    class_rows: List[Dict[str, Any]] = []
    for idx, room in enumerate(classes or ["8A", "9B"]):
        name = room if isinstance(room, str) else f"class-{idx+1}"
        class_rows.append({"id": f"cls_{idx+1}", "name": name, "students": 25 + idx})

    return TeacherCabinetOut(userId=user_id, role="teacher", classes=class_rows, homeworkSummary={"assigned": counts["assignHomework"], "pendingCheck": max(0, counts["assignHomework"] * 3 - counts["solved"])}, analytics={"liveDemos": counts["liveDemo"], "avgCompletionPct": 72})


def _teacher_class_ids(state: Dict[str, Any], teacher_user_id: str, role: str | None = None) -> List[str]:
    classes = state.setdefault("school_classes", {})
    memberships = state.setdefault("school_memberships", {})
    out: List[str] = []
    is_homeroom_only = normalize_role(role) == "homeroom_teacher"
    for class_id, row in classes.items():
        if not isinstance(row, dict):
            continue
        members = memberships.get(class_id, {}) if isinstance(memberships.get(class_id), dict) else {}
        member = members.get(teacher_user_id) if isinstance(members.get(teacher_user_id), dict) else {}

        # Классный руководитель видит только классы, где он явно назначен
        # классным руководителем, а не все классы, где он может быть предметником.
        if is_homeroom_only:
            if member.get("role") == "homeroom_teacher" or row.get("homeroomTeacherUserId") == teacher_user_id:
                out.append(str(class_id))
            continue

        if row.get("teacherUserId") == teacher_user_id or row.get("homeroomTeacherUserId") == teacher_user_id or member.get("role") in {"teacher", "homeroom_teacher"}:
            out.append(str(class_id))
    return out


def _subject_label(subject: Any) -> str:
    value = str(subject or "chemistry").strip().lower()
    return {
        "chemistry": "химия",
        "physics": "физика",
        "biology": "биология",
    }.get(value, value or "предмет")


@router.get("/cabinet/teacher/classes", response_model=dict, tags=["cabinet"])
async def teacher_school_classes(auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "cabinet:teacher")
    teacher_user_id = auth_user["userId"]
    teacher_role = normalize_role(auth_user.get("role"))
    state = _read_state()
    classes = state.setdefault("school_classes", {})
    memberships = state.setdefault("school_memberships", {})
    invites = state.setdefault("school_invite_codes", {})
    registry = state.setdefault("device_registry", {})
    class_ids = _teacher_class_ids(state, teacher_user_id, teacher_role)

    rows: List[Dict[str, Any]] = []
    for class_id in class_ids:
        row = classes.get(class_id, {}) if isinstance(classes.get(class_id), dict) else {}
        members = memberships.get(class_id, {}) if isinstance(memberships.get(class_id), dict) else {}
        teacher_member = members.get(teacher_user_id) if isinstance(members.get(teacher_user_id), dict) else {}
        is_homeroom = teacher_member.get("role") == "homeroom_teacher" or row.get("homeroomTeacherUserId") == teacher_user_id
        students: List[Dict[str, Any]] = []
        for user_id, member in members.items():
            if not isinstance(member, dict) or member.get("role") not in {"student", "learner"}:
                continue
            user_registry = registry.get(user_id, {}) if isinstance(registry.get(user_id), dict) else {}
            students.append({
                "userId": user_id,
                "role": member.get("role"),
                "joinedAt": member.get("joinedAt"),
                "deviceCount": len([1 for d in user_registry.values() if isinstance(d, dict) and d.get("active", True)]),
            })
        pending: List[Dict[str, Any]] = []
        for code, invite in invites.items():
            if not isinstance(invite, dict):
                continue
            if invite.get("classId") != class_id or invite.get("role") not in {"student", "learner"}:
                continue
            if str(invite.get("status") or "pending") != "pending":
                continue
            pending.append({
                "code": code,
                "title": invite.get("title"),
                "studentLabel": invite.get("studentLabel"),
                "expiresAt": invite.get("expiresAt"),
                "createdAt": invite.get("createdAt"),
            })
        rows.append({
            "classId": class_id,
            "title": row.get("title") or class_id,
            "subject": row.get("subject"),
            "subjectLabelRu": _subject_label(row.get("subject")),
            "roleLabelRu": "Классный руководитель" if is_homeroom else "Учитель",
            "positionLabelRu": ("Классный руководитель " + str(row.get("title") or class_id)) if is_homeroom else ("Учитель " + _subject_label(row.get("subject"))),
            "schoolId": row.get("schoolId"),
            "siteId": row.get("siteId"),
            "students": sorted(students, key=lambda x: str(x.get("userId") or "")),
            "inactiveStudents": sorted(pending, key=lambda x: str(x.get("createdAt") or ""), reverse=True),
        })
    rows.sort(key=lambda x: str(x.get("title") or ""))
    return {"items": rows}


@router.post("/cabinet/teacher/students/{student_user_id}/devices/reset", response_model=dict, tags=["cabinet"])
async def teacher_reset_student_devices(student_user_id: str, payload: Dict[str, Any], auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "cabinet:teacher")
    class_id = str(payload.get("classId") or "").strip()
    if not class_id:
        raise HTTPException(status_code=400, detail="classId обязателен")
    state = _read_state()
    if class_id not in _teacher_class_ids(state, auth_user["userId"], auth_user.get("role")):
        raise HTTPException(status_code=403, detail="Нет доступа к этому классу")
    member = state.setdefault("school_memberships", {}).get(class_id, {}).get(student_user_id, {})
    if not isinstance(member, dict) or member.get("role") not in {"student", "learner"}:
        raise HTTPException(status_code=404, detail="Ученик не найден в этом классе")
    return reset_user_devices(
        user_id=student_user_id,
        changed_by=auth_user["userId"],
        school_id=str(payload.get("schoolId") or member.get("schoolId") or "").strip() or None,
        class_id=class_id,
    )


@router.get("/cabinet/parent/overview", response_model=ParentCabinetOut, tags=["cabinet"])
async def parent_overview(auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "cabinet:parent")
    user_id = auth_user["userId"]
    state = _read_state()
    sync = state.get("device_sync", {}).get(user_id, {})
    prefs = sync.get("preferences", {})
    children = prefs.get("linkedChildren") if isinstance(prefs.get("linkedChildren"), list) else []
    counts = _count_events(user_id)

    child_rows: List[Dict[str, Any]] = []
    for idx, child in enumerate(children or [{"id": "child_1", "name": "Ученик"}]):
        if isinstance(child, dict):
            child_rows.append({"id": str(child.get("id") or f"child_{idx+1}"), "name": str(child.get("name") or f"Child {idx+1}")})
        else:
            child_rows.append({"id": f"child_{idx+1}", "name": str(child)})

    alerts = []
    if counts["childProgress"] < 1:
        alerts.append({"level": "info", "message": "Откройте отчет прогресса ребенка"})
    alerts.append({"level": "warn", "message": "Проверьте зоны риска по химии"})

    return ParentCabinetOut(userId=user_id, role="parent", children=child_rows, alerts=alerts, recommendations=["20 минут практики в день", "1 мини-экзамен в неделю"])


@router.get("/cabinet/parent/children/{child_id}/progress", response_model=ChildProgressOut, tags=["cabinet"])
async def parent_child_progress(child_id: str, auth_user: Dict[str, Any] = Depends(_require_auth_user), weak_topics: str | None = Query(default=None, alias="weakTopics")):
    _require_scope(auth_user, "cabinet:parent")
    counts = _count_events(auth_user["userId"])
    topics = [t.strip() for t in (weak_topics or "stoichiometry,kinematics").split(",") if t.strip()]
    return ChildProgressOut(childId=child_id, solvedTasks=counts["solved"], examsStarted=counts["examStart"], weakTopics=topics)


@router.post("/cabinet/teacher/live/session/start", response_model=dict, tags=["cabinet"])
async def teacher_live_start(title: str | None = Query(default=None), module_id: str = Query(default="chemistry", alias="moduleId"), lesson_id: str | None = Query(default=None, alias="lessonId"), auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "cabinet:teacher")
    state = _teacher_live_store()
    sessions = state.setdefault("teacher_live", {}).setdefault("sessions", {})
    sid = f"live_{secrets.token_hex(6)}"
    join_code = secrets.token_hex(3).upper()
    now = _now_iso()

    sessions[sid] = {
        "sessionId": sid,
        "teacherUserId": auth_user["userId"],
        "moduleId": module_id,
        "lessonId": lesson_id,
        "title": (title or "Live урок").strip() or "Live урок",
        "joinCode": join_code,
        "joinUrl": f"allchemist://teacher-live/join?code={join_code}",
        "status": "active",
        "createdAt": now,
        "updatedAt": now,
        "attempts": {},
        "participants": {},
        "roster": {},
        "events": [],
        "studentsJoined": 0,
    }
    _write_state(state)

    return {
        "sessionId": sid,
        "joinCode": join_code,
        "joinUrl": sessions[sid]["joinUrl"],
        "qrPayload": sessions[sid]["joinUrl"],
        "status": "active",
        "title": sessions[sid]["title"],
        "moduleId": module_id,
        "lessonId": lesson_id,
        "createdAt": now,
    }


@router.post("/cabinet/teacher/live/session/{session_id}/roster", response_model=dict, tags=["cabinet"])
async def teacher_live_roster_upsert(
    session_id: str,
    classroom: str = Query(...),
    student_ids: str = Query(..., alias="studentIds"),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "cabinet:teacher")
    state = _read_state()
    session = state.setdefault("teacher_live", {}).setdefault("sessions", {}).get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Live session not found")
    if session.get("teacherUserId") != auth_user["userId"]:
        raise HTTPException(status_code=403, detail="Forbidden live session access")

    classroom_key = classroom.strip() or "general"
    ids = [x.strip() for x in student_ids.split(",") if x.strip()]
    roster = session.setdefault("roster", {})
    roster[classroom_key] = sorted(list(dict.fromkeys(ids)))
    session["updatedAt"] = _now_iso()
    _write_state(state)
    return {"ok": True, "sessionId": session_id, "classroom": classroom_key, "expectedTotal": len(roster[classroom_key]), "roster": _build_roster_map(session)}


@router.post("/cabinet/teacher/live/session/{session_id}/notify", response_model=dict, tags=["cabinet"])
async def teacher_live_notify(
    session_id: str,
    classroom: str | None = Query(default=None),
    title: str | None = Query(default=None),
    message: str | None = Query(default=None),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "cabinet:teacher")
    state = _notifications_store()
    sessions = state.setdefault("teacher_live", {}).setdefault("sessions", {})
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Live session not found")
    if session.get("teacherUserId") != auth_user["userId"]:
        raise HTTPException(status_code=403, detail="Forbidden live session access")

    roster = session.get("roster", {}) if isinstance(session.get("roster"), dict) else {}
    if classroom:
        target_ids = roster.get(classroom.strip(), []) if isinstance(roster.get(classroom.strip(), []), list) else []
    else:
        target_ids = []
        for ids in roster.values():
            if isinstance(ids, list):
                target_ids.extend(ids)

    target_ids = sorted(set([str(x).strip() for x in target_ids if str(x).strip()]))
    if not target_ids:
        raise HTTPException(status_code=400, detail="Roster is empty. Add students before notify")

    join_code = str(session.get("joinCode") or "").strip().upper()
    payload = {
        "type": "live_invite",
        "sessionId": session_id,
        "joinCode": join_code,
        "moduleId": session.get("moduleId"),
        "lessonId": session.get("lessonId"),
        "classroom": classroom,
        "joinUrl": session.get("joinUrl"),
    }
    msg_title = (title or "Live-урок готов").strip() or "Live-урок готов"
    msg_text = (message or f"Подключитесь по коду {join_code}").strip() or f"Подключитесь по коду {join_code}"

    sent = await _push_notify_users(state, target_ids, msg_title, msg_text, payload)
    session["updatedAt"] = _now_iso()
    _write_state(state)
    return {"ok": True, "sessionId": session_id, "classroom": classroom, "sent": len(sent), "targetUsers": target_ids}


@router.post("/notifications/push/register-token", response_model=dict, tags=["notifications"])
async def register_push_token(
    token: str = Query(...),
    platform: str = Query(default="android"),
    device_id: str | None = Query(default=None, alias="deviceId"),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "user:profile_self")
    normalized = token.strip()
    if len(normalized) < 8:
        raise HTTPException(status_code=400, detail="token is too short")

    state = _notifications_store()
    uid = auth_user["userId"]
    rows = state.setdefault("push_tokens", {}).setdefault(uid, [])
    now = _now_iso()
    entry = {
        "token": normalized,
        "platform": platform.strip() or "android",
        "deviceId": (device_id or "").strip() or None,
        "updatedAt": now,
        "revoked": False,
    }
    rows = [x for x in rows if str(x.get("token")) != normalized]
    rows.append(entry)
    state["push_tokens"][uid] = rows[-12:]
    _write_state(state)
    return {"ok": True, "userId": uid, "tokens": len(state["push_tokens"][uid])}


@router.get("/notifications/inbox", response_model=dict, tags=["notifications"])
async def notifications_inbox(limit: int = Query(default=20, ge=1, le=100), auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "user:profile_self")
    state = _notifications_store()
    uid = auth_user["userId"]
    items = state.setdefault("notifications", {}).setdefault("inbox", {}).get(uid, [])
    ordered = sorted(items, key=lambda x: str(x.get("createdAt") or ""), reverse=True)
    unread = sum(1 for x in ordered if not x.get("readAt"))
    return {"userId": uid, "unread": unread, "items": ordered[:limit]}


@router.post("/notifications/inbox/{notification_id}/read", response_model=dict, tags=["notifications"])
async def notifications_mark_read(notification_id: str, auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "user:profile_self")
    state = _notifications_store()
    uid = auth_user["userId"]
    items = state.setdefault("notifications", {}).setdefault("inbox", {}).get(uid, [])
    found = False
    now = _now_iso()
    for item in items:
        if str(item.get("id")) == notification_id:
            item["readAt"] = now
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Notification not found")
    _write_state(state)
    return {"ok": True, "id": notification_id, "readAt": now}


@router.post("/cabinet/live/join", response_model=dict, tags=["cabinet"])
async def join_live_by_code(join_code: str = Query(..., alias="joinCode"), classroom: str = Query(default="general"), auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "user:profile_self")
    code = join_code.strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="joinCode is required")

    state = _read_state()
    sessions = state.setdefault("teacher_live", {}).setdefault("sessions", {})
    found = None
    for session in sessions.values():
        if session.get("status") == "active" and str(session.get("joinCode", "")).upper() == code:
            found = session
            break
    if not found:
        raise HTTPException(status_code=404, detail="Live session not found for joinCode")

    participants = found.setdefault("participants", {})
    roster = found.setdefault("roster", {})
    classroom_key = classroom.strip() or "general"
    uid = auth_user.get("userId") or f"guest_{secrets.token_hex(4)}"
    if uid not in participants:
        found["studentsJoined"] = int(found.get("studentsJoined") or 0) + 1

    expected = roster.get(classroom_key, []) if isinstance(roster.get(classroom_key, []), list) else []
    participants[uid] = {
        "joinedAt": _now_iso(),
        "classroom": classroom_key,
        "role": normalize_role(auth_user.get("role")) or "student",
        "rosterMatched": uid in expected if expected else None,
    }
    found["updatedAt"] = _now_iso()

    event_payload = {
        "at": found["updatedAt"],
        "sessionId": found.get("sessionId"),
        "teacherUserId": found.get("teacherUserId"),
        "studentId": uid,
        "event": "joined",
        "taskId": "join_session",
        "lessonId": found.get("lessonId") or "general",
        "classroom": classroom_key,
        "source": "joinCode",
    }
    events = state.setdefault("teacher_live", {}).setdefault("events", [])
    events.append(event_payload)
    state["teacher_live"]["events"] = events[-5000:]

    session_events = found.setdefault("events", [])
    session_events.append(event_payload)
    found["events"] = session_events[-5000:]

    _write_state(state)

    return {
        "ok": True,
        "sessionId": found.get("sessionId"),
        "title": found.get("title"),
        "moduleId": found.get("moduleId"),
        "lessonId": found.get("lessonId"),
        "joinCode": found.get("joinCode"),
        "classroom": classroom_key,
        "joinedAs": uid,
        "rosterMatched": uid in expected if expected else None,
    }


@router.get("/cabinet/teacher/live/session/{session_id}", response_model=dict, tags=["cabinet"])
async def teacher_live_status(session_id: str, auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "cabinet:teacher")
    sessions = _read_state().get("teacher_live", {}).get("sessions", {})
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Live session not found")
    if session.get("teacherUserId") != auth_user["userId"]:
        raise HTTPException(status_code=403, detail="Forbidden live session access")

    heatmap = _build_heatmap(session)
    topic_heatmap = _build_topic_heatmap(session)
    class_heatmap = _build_classroom_heatmap(session)
    taxonomy = _build_mistake_taxonomy(session)
    roster_map = _build_roster_map(session)
    summary = _session_summary(session)
    totals = {
        "studentsJoined": int(session.get("studentsJoined") or 0),
        "tasksTracked": sum(len(row.get("cells", [])) for row in heatmap),
        "highRiskCells": sum(1 for row in heatmap for c in row.get("cells", []) if c.get("risk") == "high"),
    }

    return {
        "sessionId": session.get("sessionId"),
        "status": session.get("status"),
        "title": session.get("title"),
        "moduleId": session.get("moduleId"),
        "lessonId": session.get("lessonId"),
        "joinCode": session.get("joinCode"),
        "joinUrl": session.get("joinUrl"),
        "updatedAt": session.get("updatedAt"),
        "totals": totals,
        "heatmap": heatmap,
        "topicHeatmap": topic_heatmap,
        "classroomHeatmap": class_heatmap,
        "mistakeTaxonomy": taxonomy,
        "rosterMap": roster_map,
        "participants": summary,
    }


@router.post("/cabinet/teacher/live/session/{session_id}/event", response_model=dict, tags=["cabinet"])
async def teacher_live_event(
    session_id: str,
    event: str = Query(...),
    task_id: str = Query(..., alias="taskId"),
    lesson_id: str = Query(default="general", alias="lessonId"),
    student_id: str | None = Query(default=None, alias="studentId"),
    classroom: str = Query(default="general"),
    mistake_tag: str | None = Query(default=None, alias="mistakeTag"),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "cabinet:teacher")
    if event not in {"joined", "correct", "wrong", "pending"}:
        raise HTTPException(status_code=400, detail="Unsupported live event")

    state = _read_state()
    live = state.setdefault("teacher_live", {})
    sessions = live.setdefault("sessions", {})
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Live session not found")
    if session.get("teacherUserId") != auth_user["userId"]:
        raise HTTPException(status_code=403, detail="Forbidden live session access")

    participants = session.setdefault("participants", {})
    classroom_key = classroom.strip() or "general"
    if event == "joined":
        sid = student_id or f"guest_{secrets.token_hex(4)}"
        if sid not in participants:
            session["studentsJoined"] = int(session.get("studentsJoined") or 0) + 1
        participants[sid] = {"joinedAt": _now_iso(), "classroom": classroom_key, "role": "student"}
    else:
        key = f"{task_id}::{lesson_id or 'general'}"
        attempts = session.setdefault("attempts", {})
        stats = attempts.setdefault(key, {"ok": 0, "wrong": 0, "pending": 0})
        if event == "correct":
            stats["ok"] = int(stats.get("ok") or 0) + 1
        elif event == "wrong":
            stats["wrong"] = int(stats.get("wrong") or 0) + 1
        else:
            stats["pending"] = int(stats.get("pending") or 0) + 1

    session["updatedAt"] = _now_iso()
    resolved_mistake_tag = (mistake_tag or _infer_mistake_tag(task_id, lesson_id)).strip()
    payload = {
        "at": session["updatedAt"],
        "sessionId": session_id,
        "teacherUserId": auth_user["userId"],
        "studentId": student_id,
        "event": event,
        "taskId": task_id,
        "lessonId": lesson_id,
        "classroom": classroom_key,
        "mistakeTag": resolved_mistake_tag,
    }

    events = live.setdefault("events", [])
    events.append(payload)
    live["events"] = events[-5000:]

    session_events = session.setdefault("events", [])
    session_events.append(payload)
    session["events"] = session_events[-5000:]

    _write_state(state)

    return {
        "ok": True,
        "sessionId": session_id,
        "event": event,
        "updatedAt": session["updatedAt"],
        "heatmap": _build_heatmap(session),
        "topicHeatmap": _build_topic_heatmap(session),
        "classroomHeatmap": _build_classroom_heatmap(session),
        "mistakeTaxonomy": _build_mistake_taxonomy(session),
    }


@router.post("/cabinet/teacher/live/session/{session_id}/close", response_model=dict, tags=["cabinet"])
async def teacher_live_close(session_id: str, auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "cabinet:teacher")
    state = _read_state()
    sessions = state.setdefault("teacher_live", {}).setdefault("sessions", {})
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Live session not found")
    if session.get("teacherUserId") != auth_user["userId"]:
        raise HTTPException(status_code=403, detail="Forbidden live session access")

    session["status"] = "closed"
    session["updatedAt"] = _now_iso()
    _write_state(state)
    return {"ok": True, "sessionId": session_id, "status": "closed", "updatedAt": session["updatedAt"]}
