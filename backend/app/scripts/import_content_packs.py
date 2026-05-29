from __future__ import annotations

import glob
import hashlib
import json
import os
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Set

from sqlalchemy import text
from app.db.session import SessionLocal


def sha256(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def s(x: Any) -> str:
    return "" if x is None else str(x)


def jd(x: Any) -> str:
    return json.dumps(x, ensure_ascii=False)


@dataclass
class PackMeta:
    pack_id: str
    version: int
    file: str


def load_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def detect_meta(doc: Dict[str, Any], path: str) -> PackMeta:
    pack_id = s(doc.get("pack_id") or doc.get("id") or "content_pack").strip() or "content_pack"
    v = doc.get("version") or 1
    try:
        version = int(v)
    except Exception:
        version = 1
    return PackMeta(pack_id=pack_id, version=version, file=path)


def get_cols(session, table: str, schema: str = "public") -> Dict[str, str]:
    rows = session.execute(
        text(
            """
            SELECT a.attname AS col, a.atttypid::regtype::text AS typ
            FROM pg_attribute a
            JOIN pg_class c ON c.oid = a.attrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname=:schema AND c.relname=:table
              AND a.attnum>0 AND NOT a.attisdropped
            """
        ),
        {"schema": schema, "table": table},
    ).fetchall()
    return {str(r[0]): str(r[1]) for r in rows}


def pick(row: Dict[str, Any], cols: Dict[str, str]) -> Dict[str, Any]:
    return {k: v for k, v in row.items() if k in cols}


def chunked(lst: List[Any], n: int) -> List[List[Any]]:
    return [lst[i : i + n] for i in range(0, len(lst), n)]


# ------------------------- TASKS type normalization -------------------------

_ALLOWED_TASK_TYPES_CACHE: Optional[Set[str]] = None

def _get_allowed_task_types(session) -> Set[str]:
    """
    Reads tasks_type_check constraint and extracts allowed literals if it is an IN (...) check.
    Falls back to a conservative set if not found / not parseable.
    """
    global _ALLOWED_TASK_TYPES_CACHE
    if _ALLOWED_TASK_TYPES_CACHE is not None:
        return _ALLOWED_TASK_TYPES_CACHE

    allowed: Set[str] = set()
    try:
        row = session.execute(
            text(
                """
                SELECT pg_get_constraintdef(oid) AS def
                FROM pg_constraint
                WHERE conrelid='public.tasks'::regclass
                  AND conname='tasks_type_check'
                LIMIT 1
                """
            )
        ).fetchone()

        if row and row[0]:
            d = str(row[0])
            # example: CHECK ((type = ANY (ARRAY['numeric'::text, 'open'::text, 'choice'::text])))
            # or: CHECK ((type = ANY (ARRAY['numeric','open','choice'])))
            # Extract '...' literals:
            lits = re.findall(r"'([^']+)'", d)
            for v in lits:
                allowed.add(v.strip())
    except Exception:
        allowed = set()

    if not allowed:
        # fallback safe defaults (won't be used if constraint exists and parseable)
        allowed = {"numeric", "open", "choice", "mcq", "text"}

    _ALLOWED_TASK_TYPES_CACHE = allowed
    return allowed


def _normalize_task_type(raw: str, allowed: Set[str]) -> str:
    t = (raw or "").strip().lower()

    if t in allowed:
        return t

    # common aliases
    alias_map = {
        "test": ["choice", "mcq", "quiz"],
        "quiz": ["choice", "mcq", "test"],
        "mcq": ["choice", "quiz", "test"],
        "multiple_choice": ["choice", "mcq", "quiz"],
        "single_choice": ["choice", "mcq", "quiz"],
        "number": ["numeric"],
        "calc": ["numeric"],
        "free": ["open", "text"],
        "essay": ["open", "text"],
        "text": ["open"],
    }

    for cand in alias_map.get(t, []):
        if cand in allowed:
            return cand

    # last resort: pick a reasonable allowed type
    for pref in ["choice", "mcq", "quiz", "open", "numeric", "text"]:
        if pref in allowed:
            return pref

    # absolute fallback (should not happen)
    return next(iter(allowed))


# ------------------------- UPSERT: modules -------------------------

def upsert_modules(session, doc: Dict[str, Any]) -> int:
    items = doc.get("modules") or []
    if not isinstance(items, list) or not items:
        return 0

    cols = get_cols(session, "modules")
    if not cols:
        return 0

    rows = []
    for it in items:
        if not isinstance(it, dict) or not it.get("id"):
            continue
        rows.append({
            "id": s(it.get("id")),
            "title": s(it.get("title") or ""),
            "description": s(it.get("description") or ""),
            "available": bool(it.get("available", True)),
        })

    sql = text("""
        INSERT INTO modules (id, title, description, available)
        VALUES (:id, :title, :description, :available)
        ON CONFLICT (id) DO UPDATE SET
          title=EXCLUDED.title,
          description=EXCLUDED.description,
          available=EXCLUDED.available
    """)
    session.execute(sql, rows)
    return len(rows)


# ------------------------- UPSERT: lesson_blocks -------------------------

def upsert_lesson_blocks(session, doc: Dict[str, Any]) -> int:
    items = doc.get("lesson_blocks") or []
    if not isinstance(items, list) or not items:
        return 0

    cols = get_cols(session, "lesson_blocks")
    if not cols:
        return 0

    payload_is_jsonb = cols.get("payload") == "jsonb"
    tasks_is_jsonb = cols.get("tasks_json") == "jsonb"

    params = []
    for it in items:
        if not isinstance(it, dict) or it.get("id") is None:
            continue

        r = dict(it)

        if "description" not in r and "content" in r:
            r["description"] = r.get("content")

        if "order_index" not in r and "order" in r:
            r["order_index"] = r.get("order")
        if "type" not in r and "block_type" in r:
            r["type"] = r.get("block_type")

        if payload_is_jsonb and "payload" in cols:
            r["payload_json"] = jd(r.get("payload") or {})
        if tasks_is_jsonb and "tasks_json" in cols:
            tasks = r.get("tasks") or r.get("task_ids") or r.get("tasks_json") or []
            if not isinstance(tasks, list):
                tasks = []
            r["tasks_json"] = jd(tasks)

        params.append(r)

    insert_cols = [c for c in ["id", "module_id", "title", "description", "content", "type", "order_index"] if c in cols]
    if payload_is_jsonb and "payload" in cols:
        insert_cols.append("payload")
    if tasks_is_jsonb and "tasks_json" in cols:
        insert_cols.append("tasks_json")

    if not insert_cols:
        return 0

    col_list = ", ".join(insert_cols)
    val_list = ", ".join([f":{c}" if c != "payload" else "CAST(:payload_json AS jsonb)" for c in insert_cols])
    set_clause = ", ".join([f"{c}=EXCLUDED.{c}" for c in insert_cols if c != "id"]) or "id=EXCLUDED.id"

    sql = text(f"""
        INSERT INTO lesson_blocks ({col_list})
        VALUES ({val_list})
        ON CONFLICT (id) DO UPDATE SET {set_clause}
    """)

    total = 0
    for ch in chunked(params, 500):
        exec_params = []
        for r in ch:
            p = pick(r, cols)
            if payload_is_jsonb and "payload" in cols:
                p["payload_json"] = r.get("payload_json") or "{}"
            if tasks_is_jsonb and "tasks_json" in cols:
                p["tasks_json"] = r.get("tasks_json") or "[]"
            exec_params.append(p)
        session.execute(sql, exec_params)
        total += len(exec_params)
    return total


# ------------------------- UPSERT: tasks -------------------------

def upsert_tasks(session, doc: Dict[str, Any]) -> int:
    items = doc.get("tasks") or []
    if not isinstance(items, list) or not items:
        return 0

    cols = get_cols(session, "tasks")
    if not cols:
        return 0

    allowed_types = _get_allowed_task_types(session)

    payload_is_jsonb = cols.get("payload") == "jsonb"
    tags_is_jsonb = cols.get("tags") == "jsonb"
    tags_is_text_array = cols.get("tags") == "text[]"

    params = []
    for it in items:
        if not isinstance(it, dict) or not it.get("id"):
            continue
        r = dict(it)

        # lesson_id bigint
        if "lesson_id" in r and r["lesson_id"] is not None:
            try:
                r["lesson_id"] = int(r["lesson_id"])
            except Exception:
                pass

        # normalize type (fix tasks_type_check)
        if "type" in r:
            r["type"] = _normalize_task_type(s(r.get("type")), allowed_types)

        if payload_is_jsonb and "payload" in cols:
            r["payload_json"] = jd(r.get("payload") or {})

        if "tags" in cols:
            tags = r.get("tags") or []
            if not isinstance(tags, list):
                tags = [s(tags)]
            if tags_is_jsonb:
                r["tags_json"] = jd(tags)
            elif tags_is_text_array:
                r["tags_arr"] = tags

        params.append(r)

    insert_cols = [c for c in ["id", "module_id", "lesson_id", "title", "description", "type", "estimated_minutes"] if c in cols]
    if payload_is_jsonb and "payload" in cols:
        insert_cols.append("payload")
    if "tags" in cols:
        insert_cols.append("tags")

    if not insert_cols:
        return 0

    col_list = ", ".join(insert_cols)

    values_parts = []
    for c in insert_cols:
        if c == "payload":
            values_parts.append("CAST(:payload_json AS jsonb)")
        elif c == "tags":
            if tags_is_jsonb:
                values_parts.append("CAST(:tags_json AS jsonb)")
            elif tags_is_text_array:
                values_parts.append(":tags_arr")
            else:
                values_parts.append(":tags")
        else:
            values_parts.append(f":{c}")
    val_list = ", ".join(values_parts)

    set_clause = ", ".join([f"{c}=EXCLUDED.{c}" for c in insert_cols if c != "id"]) or "id=EXCLUDED.id"

    sql = text(f"""
        INSERT INTO tasks ({col_list})
        VALUES ({val_list})
        ON CONFLICT (id) DO UPDATE SET {set_clause}
    """)

    total = 0
    for ch in chunked(params, 500):
        exec_params = []
        for r in ch:
            p = pick(r, cols)
            if payload_is_jsonb and "payload" in cols:
                p["payload_json"] = r.get("payload_json") or "{}"
            if "tags" in cols:
                if tags_is_jsonb:
                    p["tags_json"] = r.get("tags_json") or "[]"
                elif tags_is_text_array:
                    p["tags_arr"] = r.get("tags_arr") or []
            exec_params.append(p)
        session.execute(sql, exec_params)
        total += len(exec_params)
    return total


# ------------------------- UPSERT: molecules -------------------------

def upsert_molecules(session, doc: Dict[str, Any]) -> int:
    items = doc.get("molecules") or []
    if not isinstance(items, list) or not items:
        return 0

    cols = get_cols(session, "molecules")
    if not cols:
        return 0

    data_is_jsonb = cols.get("data_json") == "jsonb"
    atoms_col = "atoms" if "atoms" in cols else ("payload" if "payload" in cols else None)
    atoms_is_jsonb = atoms_col is not None and cols.get(atoms_col) == "jsonb"

    params = []
    for it in items:
        if not isinstance(it, dict) or not it.get("id"):
            continue
        r = dict(it)
        if "name" not in r and "title" in r:
            r["name"] = r.get("title")
        if data_is_jsonb and "data_json" in cols:
            r["data_json"] = jd(r)
        if atoms_col and atoms_is_jsonb:
            r["atoms_json"] = jd(r.get("atoms") or r.get("payload") or [])
        params.append(r)

    insert_cols = [c for c in ["id", "name", "formula"] if c in cols]
    if data_is_jsonb and "data_json" in cols:
        insert_cols.append("data_json")
    if atoms_col and atoms_is_jsonb:
        insert_cols.append(atoms_col)
    if not insert_cols:
        return 0

    col_list = ", ".join(insert_cols)
    val_parts = []
    for c in insert_cols:
        if c == "data_json":
            val_parts.append("CAST(:data_json AS jsonb)")
        elif atoms_col and c == atoms_col:
            val_parts.append("CAST(:atoms_json AS jsonb)")
        else:
            val_parts.append(f":{c}")
    val_list = ", ".join(val_parts)
    set_clause = ", ".join([f"{c}=EXCLUDED.{c}" for c in insert_cols if c != "id"]) or "id=EXCLUDED.id"

    sql = text(f"""
        INSERT INTO molecules ({col_list})
        VALUES ({val_list})
        ON CONFLICT (id) DO UPDATE SET {set_clause}
    """)

    total = 0
    for ch in chunked(params, 500):
        exec_params = []
        for r in ch:
            p = pick(r, cols)
            if data_is_jsonb and "data_json" in cols:
                p["data_json"] = r.get("data_json") or "{}"
            if atoms_col and atoms_is_jsonb:
                p["atoms_json"] = r.get("atoms_json") or "[]"
            exec_params.append(p)
        session.execute(sql, exec_params)
        total += len(exec_params)
    return total


# ------------------------- UPSERT: reactions -------------------------

def upsert_reactions(session, doc: Dict[str, Any]) -> int:
    items = doc.get("reactions") or []
    if not isinstance(items, list) or not items:
        return 0

    cols = get_cols(session, "reactions")
    if not cols:
        return 0

    data_is_jsonb = cols.get("data_json") == "jsonb"
    react_col = "reactants" if "reactants" in cols else ("lhs" if "lhs" in cols else None)
    prod_col = "products" if "products" in cols else ("rhs" if "rhs" in cols else None)
    react_is_jsonb = react_col is not None and cols.get(react_col) == "jsonb"
    prod_is_jsonb = prod_col is not None and cols.get(prod_col) == "jsonb"

    params = []
    for it in items:
        if not isinstance(it, dict) or not it.get("id"):
            continue
        r = dict(it)
        if data_is_jsonb and "data_json" in cols:
            r["data_json"] = jd(r)
        if react_col and react_is_jsonb:
            r["reactants_json"] = jd(r.get("reactants") or [])
        if prod_col and prod_is_jsonb:
            r["products_json"] = jd(r.get("products") or [])
        params.append(r)

    insert_cols = [c for c in ["id", "title", "equation", "conditions"] if c in cols]
    if data_is_jsonb and "data_json" in cols:
        insert_cols.append("data_json")
    if react_col and react_is_jsonb:
        insert_cols.append(react_col)
    if prod_col and prod_is_jsonb:
        insert_cols.append(prod_col)
    if not insert_cols:
        return 0

    col_list = ", ".join(insert_cols)
    val_parts = []
    for c in insert_cols:
        if c == "data_json":
            val_parts.append("CAST(:data_json AS jsonb)")
        elif react_col and c == react_col:
            val_parts.append("CAST(:reactants_json AS jsonb)")
        elif prod_col and c == prod_col:
            val_parts.append("CAST(:products_json AS jsonb)")
        else:
            val_parts.append(f":{c}")
    val_list = ", ".join(val_parts)
    set_clause = ", ".join([f"{c}=EXCLUDED.{c}" for c in insert_cols if c != "id"]) or "id=EXCLUDED.id"

    sql = text(f"""
        INSERT INTO reactions ({col_list})
        VALUES ({val_list})
        ON CONFLICT (id) DO UPDATE SET {set_clause}
    """)

    total = 0
    for ch in chunked(params, 500):
        exec_params = []
        for r in ch:
            p = pick(r, cols)
            if data_is_jsonb and "data_json" in cols:
                p["data_json"] = r.get("data_json") or "{}"
            if react_col and react_is_jsonb:
                p["reactants_json"] = r.get("reactants_json") or "[]"
            if prod_col and prod_is_jsonb:
                p["products_json"] = r.get("products_json") or "[]"
            exec_params.append(p)
        session.execute(sql, exec_params)
        total += len(exec_params)
    return total


# ------------------------- UPSERT: physics_scenarios -------------------------

def upsert_physics_scenarios(session, doc: Dict[str, Any]) -> int:
    items = doc.get("physics_scenarios") or []
    if not isinstance(items, list) or not items:
        return 0

    cols = get_cols(session, "physics_scenarios")
    if not cols:
        return 0

    payload_is_jsonb = cols.get("payload") == "jsonb"
    tasks_is_jsonb = cols.get("tasks_json") == "jsonb"

    params = []
    for it in items:
        if not isinstance(it, dict) or not it.get("id"):
            continue
        r = dict(it)
        if payload_is_jsonb and "payload" in cols:
            r["payload_json"] = jd(r.get("payload") or {})
        params.append(r)

    insert_cols = [c for c in ["id", "module_id", "title"] if c in cols]
    if payload_is_jsonb and "payload" in cols:
        insert_cols.append("payload")
    if not insert_cols:
        return 0

    col_list = ", ".join(insert_cols)
    val_list = ", ".join([f":{c}" if c != "payload" else "CAST(:payload_json AS jsonb)" for c in insert_cols])
    set_clause = ", ".join([f"{c}=EXCLUDED.{c}" for c in insert_cols if c != "id"]) or "id=EXCLUDED.id"

    sql = text(f"""
        INSERT INTO physics_scenarios ({col_list})
        VALUES ({val_list})
        ON CONFLICT (id) DO UPDATE SET {set_clause}
    """)

    total = 0
    for ch in chunked(params, 500):
        exec_params = []
        for r in ch:
            p = pick(r, cols)
            if payload_is_jsonb and "payload" in cols:
                p["payload_json"] = r.get("payload_json") or "{}"
            if tasks_is_jsonb and "tasks_json" in cols:
                p["tasks_json"] = r.get("tasks_json") or "[]"
            exec_params.append(p)
        session.execute(sql, exec_params)
        total += len(exec_params)
    return total


# ------------------------- UPSERT: ai_knowledge (STRICT for your schema) -------------------------

def normalize_ai(item: Dict[str, Any], pack: PackMeta) -> Dict[str, Any]:
    subject = s(item.get("subject") or "").strip() or None
    lang = (s(item.get("lang") or "ru").strip().lower()) or "ru"
    title = s(item.get("title") or item.get("name") or "").strip()
    body = s(item.get("body") or item.get("content") or item.get("text") or "").strip()

    tags = item.get("tags") or []
    if not isinstance(tags, list):
        tags = [s(tags)]

    external_id = s(item.get("external_id") or item.get("id") or "").strip()
    if not external_id:
        external_id = sha256(f"{pack.pack_id}|{pack.version}|{subject}|{lang}|{title}|{body}")[:24]

    source = s(item.get("source") or pack.pack_id or "seed").strip() or "seed"

    content = body
    if not title:
        title = "(untitled)"
    if not content:
        content = "(empty)"
    content_hash = sha256(f"{subject}|{lang}|{title}|{content}")

    return {
        "pack_id": pack.pack_id,
        "pack_version": pack.version,
        "external_id": external_id,
        "subject": subject,
        "lang": lang,
        "title": title,
        "content": content,
        "body": body,
        "tags_json": jd(tags),
        "source": source,
        "content_hash": content_hash,
    }


def upsert_ai_knowledge(session, pack: PackMeta, doc: Dict[str, Any]) -> int:
    items = doc.get("ai_knowledge") or doc.get("ai_docs") or []
    if not isinstance(items, list) or not items:
        return 0

    cols = get_cols(session, "ai_knowledge")
    required = {"source", "title", "content", "tags"}
    if not required.issubset(set(cols.keys())):
        raise RuntimeError(f"ai_knowledge missing required columns: {sorted(required - set(cols.keys()))}")

    sql = text("""
        INSERT INTO ai_knowledge
          (pack_id, pack_version, external_id, subject, lang, title, content, body, tags, source, content_hash)
        VALUES
          (:pack_id, :pack_version, :external_id, :subject, :lang, :title, :content, :body, CAST(:tags_json AS jsonb), :source, :content_hash)
        ON CONFLICT (pack_id, external_id) DO UPDATE SET
          pack_version = EXCLUDED.pack_version,
          subject = EXCLUDED.subject,
          lang = EXCLUDED.lang,
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          body = EXCLUDED.body,
          tags = EXCLUDED.tags,
          source = EXCLUDED.source,
          content_hash = EXCLUDED.content_hash,
          updated_at = now()
    """)

    params = [normalize_ai(x, pack) for x in items if isinstance(x, dict)]
    total = 0
    for ch in chunked(params, 300):
        session.execute(sql, ch)
        total += len(ch)
    return total


def upsert_ai_docs(session, pack: PackMeta, doc: Dict[str, Any]) -> int:
    items = doc.get("ai_knowledge") or doc.get("ai_docs") or []
    if not isinstance(items, list) or not items:
        return 0

    cols = get_cols(session, "ai_docs")
    if not cols:
        return 0

    required = {"subject", "lang", "title", "body", "source", "tags"}
    if not required.issubset(set(cols.keys())):
        raise RuntimeError(f"ai_docs missing required columns: {sorted(required - set(cols.keys()))}")

    sql = text("""
        INSERT INTO ai_docs
          (subject, lang, title, body, source, tags, updated_at)
        VALUES
          (:subject, :lang, :title, :body, :source, CAST(:tags_json AS jsonb), now())
        ON CONFLICT (subject, lang, title) DO UPDATE SET
          body = EXCLUDED.body,
          source = EXCLUDED.source,
          tags = EXCLUDED.tags,
          updated_at = now()
    """)

    params = [normalize_ai(x, pack) for x in items if isinstance(x, dict)]
    total = 0
    for ch in chunked(params, 300):
        docs_params = [
            {
                "subject": row.get("subject"),
                "lang": row.get("lang"),
                "title": row.get("title"),
                "body": row.get("body") or row.get("content") or "",
                "source": row.get("source"),
                "tags_json": row.get("tags_json") or "[]",
            }
            for row in ch
        ]
        session.execute(sql, docs_params)
        total += len(docs_params)
    return total


# ------------------------- Orchestrator -------------------------

def import_pack(session, pack: PackMeta, doc: Dict[str, Any]) -> Dict[str, Any]:
    session.begin()
    try:
        res = {"pack_id": pack.pack_id, "version": pack.version, "file": pack.file}

        res["modules"] = upsert_modules(session, doc)
        res["lesson_blocks"] = upsert_lesson_blocks(session, doc)
        res["tasks"] = upsert_tasks(session, doc)
        res["molecules"] = upsert_molecules(session, doc)
        res["reactions"] = upsert_reactions(session, doc)
        res["physics_scenarios"] = upsert_physics_scenarios(session, doc)
        res["ai_knowledge"] = upsert_ai_knowledge(session, pack, doc)
        res["ai_docs"] = upsert_ai_docs(session, pack, doc)

        session.commit()
        res["ok"] = True
        res["imported_total"] = int(
            res["modules"]
            + res["lesson_blocks"]
            + res["tasks"]
            + res["molecules"]
            + res["reactions"]
            + res["physics_scenarios"]
            + res["ai_knowledge"]
            + res["ai_docs"]
        )
        return res
    except Exception as e:
        session.rollback()
        return {"pack_id": pack.pack_id, "version": pack.version, "file": pack.file, "ok": False, "error": f"{type(e).__name__}: {e}"}


def import_from_dir(packs_dir: str, only_files: Optional[List[str]] = None) -> Dict[str, Any]:
    if only_files:
        paths = [p if os.path.isabs(p) else os.path.join(packs_dir, p) for p in only_files]
    else:
        paths = sorted(glob.glob(os.path.join(packs_dir, "*.json")))
        paths = [p for p in paths if "_pack_" in os.path.basename(p)]

    if not paths:
        return {"ok": False, "imported": 0, "packs": [], "error": f"No packs found in {packs_dir}"}

    sess = SessionLocal()
    details: List[Dict[str, Any]] = []
    imported = 0
    try:
        for p in paths:
            doc = load_json(p)
            meta = detect_meta(doc, p)
            r = import_pack(sess, meta, doc)
            details.append(r)
            if r.get("ok"):
                imported += int(r.get("imported_total") or 0)

        ok = all(x.get("ok") for x in details) if details else False
        return {"ok": ok, "imported": imported, "packs": details, "error": None if ok else "Some packs failed"}
    finally:
        sess.close()


if __name__ == "__main__":
    packs_dir = os.getenv("CONTENT_PACKS_DIR", "/content_packs").strip() or "/content_packs"
    only = os.getenv("CONTENT_PACKS_ONLY", "").strip()
    only_files = [x.strip() for x in only.split(",") if x.strip()] if only else None
    out = import_from_dir(packs_dir, only_files=only_files)
    print(json.dumps(out, ensure_ascii=False, indent=2))
