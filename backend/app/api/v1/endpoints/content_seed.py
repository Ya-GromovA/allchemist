from __future__ import annotations

import os
from typing import Optional, List, Literal, Dict, Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from app.scripts.import_content_packs import import_from_dir

router = APIRouter(prefix="/content", tags=["content"])


class SeedRequest(BaseModel):
    packs: Optional[List[str]] = Field(
        default=None,
        description="Optional list of pack filenames, e.g. ['physics_pack_v1.json']",
    )
    packs_dir: Optional[str] = Field(
        default=None,
        description="Override packs directory inside container",
    )
    mode: Literal["upsert"] = "upsert"


class SeedResponse(BaseModel):
    ok: bool
    imported: int
    packs: List[Dict[str, Any]]
    error: Optional[str] = None


def _require_token(seed_token: Optional[str]) -> None:
    expected = os.getenv("CONTENT_SEED_TOKEN", "").strip()
    if not expected:
        raise HTTPException(status_code=500, detail="CONTENT_SEED_TOKEN is not configured on server")
    if not seed_token or seed_token.strip() != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.post("/seed", response_model=SeedResponse)
def seed_content(
    payload: SeedRequest,
    x_seed_token: Optional[str] = Header(default=None, alias="X-Seed-Token"),
) -> SeedResponse:
    _require_token(x_seed_token)

    packs_dir = (payload.packs_dir or os.getenv("CONTENT_PACKS_DIR") or "/content_packs").strip()
    res = import_from_dir(packs_dir, only_files=payload.packs)

    # ВАЖНО: даже если ok=false — возвращаем детали packs, чтобы видеть кто упал и почему
    ok = bool(res.get("ok"))
    imported = int(res.get("imported") or 0)
    packs = res.get("packs") or []
    err = res.get("error")
    return SeedResponse(ok=ok, imported=imported, packs=packs, error=str(err) if err else None)
