from fastapi import APIRouter

from app.api.v1.endpoints.ai_mentor import router as ai_mentor_router
from app.api.v1.endpoints.admin_panel import router as admin_panel_router
from app.api.v1.endpoints.admin_ui import router as admin_ui_router
from app.api.v1.endpoints.admin_web import router as admin_web_router
from app.api.v1.endpoints.auth_sync import router as auth_sync_router
from app.api.v1.endpoints.content_readonly import router as content_readonly_router
from app.api.v1.endpoints.public_web import router as public_web_router
from app.api.v1.endpoints.role_cabinet import router as role_cabinet_router
from app.api.v1.endpoints.sync_progress import router as sync_progress_router
from app.api.v1.endpoints.system import router as system_router

router = APIRouter()

router.include_router(system_router)
router.include_router(content_readonly_router)
router.include_router(public_web_router)
router.include_router(ai_mentor_router)
router.include_router(sync_progress_router)
router.include_router(auth_sync_router)
router.include_router(role_cabinet_router)
router.include_router(admin_panel_router)
router.include_router(admin_ui_router)
router.include_router(admin_web_router)

api_router = router
