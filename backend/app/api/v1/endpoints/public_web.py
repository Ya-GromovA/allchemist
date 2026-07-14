from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter()

_ROOT = Path(__file__).resolve().parents[3] / "web_public"
_REACT_ROOT = Path(__file__).resolve().parents[3] / "web_public_react"
_ASSETS = {
    "styles.css": "text/css; charset=utf-8",
    "app.js": "application/javascript; charset=utf-8",
    "favicon.png": "image/png",
    "allchemist.png": "image/png",
    "allchemist.webp": "image/webp",
    "alchemist-hero.png": "image/png",
    "alchemist-hero.webp": "image/webp",
    "fon.png": "image/png",
    "fon.webp": "image/webp",
    "fon-2.png": "image/png",
    "fon-2.webp": "image/webp",
    "main-bg-science.png": "image/png",
    "main-bg-science.webp": "image/webp",
    "periodic-table-reference.png": "image/png",
    "periodic-table-reference.webp": "image/webp",
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

_PUBLIC_APP_ROUTES = {
    "login",
    "plans",
    "pricing",
    "activate",
    "activate-code",
    "school-login",
    "staff-login",
    "demo",
    "demo/chemistry",
    "demo/physics",
    "demo/biology",
    "demo/ai",
    "demo/periodic-table",
    "demo/labs",
    "demo/molecules",
    "demo/physics-simulator",
    "demo/microscope",
    "demo/cell",
    "demo/exams",
    "demo/revision-plan",
    "student",
    "student/chemistry",
    "student/physics",
    "student/biology",
    "student/chemistry/periodic-table",
    "student/ai-tutor",
    "parent",
    "teacher",
    "homeroom",
    "school-admin",
    "admin",
    "support",
    "content",
}

_REACT_ASSET_TYPES = {
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
}


def _react_index_response():
    index_path = _REACT_ROOT / "index.html"
    if index_path.exists():
        return FileResponse(index_path, headers={"Cache-Control": "no-cache"})
    fallback_index = _ROOT / "index.html"
    if not fallback_index.exists():
        raise HTTPException(status_code=404, detail="Public web page not found")
    return FileResponse(fallback_index, headers={"Cache-Control": "no-cache"})


@router.get("/web", tags=["public-web"])
async def public_web_index():
    return _react_index_response()


@router.head("/web", tags=["public-web"])
async def public_web_index_head():
    return _react_index_response()


@router.get("/web/figma-assets/{asset_path:path}", tags=["public-web"])
async def public_web_figma_asset(asset_path: str):
    normalized = asset_path.strip("/")
    if not normalized or ".." in Path(normalized).parts:
        raise HTTPException(status_code=404, detail="Asset not found")
    path = _REACT_ROOT / normalized
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Asset not found")
    media_type = _REACT_ASSET_TYPES.get(path.suffix.lower(), "application/octet-stream")
    headers = {"Cache-Control": "public, max-age=31536000, immutable"}
    return FileResponse(path, media_type=media_type, headers=headers)


@router.get("/web/assets/{asset_name}", tags=["public-web"])
async def public_web_asset(asset_name: str):
    if asset_name not in _ASSETS:
        raise HTTPException(status_code=404, detail="Asset not found")
    path = _ROOT / asset_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Asset not found")
    headers = {"Cache-Control": "public, max-age=31536000, immutable"}
    return FileResponse(path, media_type=_ASSETS[asset_name], headers=headers)


@router.get("/web/{public_path:path}", tags=["public-web"])
async def public_web_route(public_path: str):
    normalized = public_path.strip("/")
    if normalized not in _PUBLIC_APP_ROUTES:
        raise HTTPException(status_code=404, detail="Public web route not found")
    return _react_index_response()
