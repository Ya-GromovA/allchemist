from fastapi import APIRouter

router = APIRouter()


@router.get("/health", tags=["system"])
async def health_check():
    return {"status": "ok", "service": "allchemist-api"}


@router.head("/health", tags=["system"])
async def health_check_head():
    return {"status": "ok", "service": "allchemist-api"}
