from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter()

_ROOT = Path(__file__).resolve().parents[3] / "web_admin"
_ASSETS = {
    "app.js": "application/javascript",
    "styles.css": "text/css",
    "icon.png": "image/png",
    "icon.webp": "image/webp",
    "module_chemistry.png": "image/png",
    "module_physics.png": "image/png",
    "module_biology.png": "image/png",
    "module_ai.png": "image/png",
    "chemistry_lab_hero.png": "image/png",
    "physics_simulator_hero.png": "image/png",
    "biology_microscope_hero.png": "image/png",
    "periodic_table_trainer.png": "image/png",
    "admin-manual-ru-v2.docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "admin-manual-ru-v2.txt": "text/plain; charset=utf-8",
    "admin-manual-ru-v2.md": "text/markdown; charset=utf-8",
    "admin-one-page-ru.html": "text/html; charset=utf-8",
    "admin-manual-ru-v3.docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "admin-manual-ru-v3.txt": "text/plain; charset=utf-8",
    "admin-manual-ru-v3.md": "text/markdown; charset=utf-8",
    "admin-one-page-ru-v3.html": "text/html; charset=utf-8",
    "user-guide-mobile-ru.md": "text/markdown; charset=utf-8",
    "user-guide-mobile-ru.txt": "text/plain; charset=utf-8",
    "user-guide-web-ru.md": "text/markdown; charset=utf-8",
    "user-guide-web-ru.txt": "text/plain; charset=utf-8",
    "legal-rf-documents-checklist-ru.md": "text/markdown; charset=utf-8",
    "legal-rf-documents-checklist-ru.txt": "text/plain; charset=utf-8",
    "legal-rf-official-sources-ru.md": "text/markdown; charset=utf-8",
    "legal-rf-compliance-status-ru.md": "text/markdown; charset=utf-8",
}


@router.get("/admin/web", tags=["admin"])
async def admin_web_index():
    index_path = _ROOT / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Admin web app not found")
    return FileResponse(index_path, headers={"Cache-Control": "no-cache"})


@router.get("/admin/web/assets/{asset_name}", tags=["admin"])
async def admin_web_asset(asset_name: str):
    if asset_name not in _ASSETS:
        raise HTTPException(status_code=404, detail="Asset not found")
    path = _ROOT / asset_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Asset not found")
    headers = {"Cache-Control": "public, max-age=31536000, immutable"}
    return FileResponse(path, media_type=_ASSETS[asset_name], headers=headers)
