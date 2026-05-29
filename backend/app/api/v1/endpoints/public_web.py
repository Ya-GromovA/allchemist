from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter()

_ROOT = Path(__file__).resolve().parents[3] / "web_public"
_ASSETS = {
    "styles.css": "text/css; charset=utf-8",
    "app.js": "application/javascript; charset=utf-8",
    "favicon.png": "image/png",
    "allchemist.png": "image/png",
    "allchemist.webp": "image/webp",
    "fon.png": "image/png",
    "fon.webp": "image/webp",
    "module_chemistry.png": "image/png",
    "module_physics.png": "image/png",
    "module_biology.png": "image/png",
    "module_ai.png": "image/png",
    "chemistry_lab_hero.png": "image/png",
    "physics_simulator_hero.png": "image/png",
    "biology_microscope_hero.png": "image/png",
    "periodic_table_trainer.png": "image/png",
    "student_dashboard_hero.png": "image/png",
    "teacher_dashboard_hero.png": "image/png",
    "parent_dashboard_hero.png": "image/png",
}


@router.get("/web", tags=["public-web"])
async def public_web_index():
    index_path = _ROOT / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Public web page not found")
    return FileResponse(index_path, headers={"Cache-Control": "no-cache"})


@router.get("/web/assets/{asset_name}", tags=["public-web"])
async def public_web_asset(asset_name: str):
    if asset_name not in _ASSETS:
        raise HTTPException(status_code=404, detail="Asset not found")
    path = _ROOT / asset_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Asset not found")
    headers = {"Cache-Control": "public, max-age=31536000, immutable"}
    return FileResponse(path, media_type=_ASSETS[asset_name], headers=headers)
