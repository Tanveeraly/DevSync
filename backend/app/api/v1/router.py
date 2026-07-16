"""Aggregate v1 API router – include all domain routers here."""

from fastapi import APIRouter

from app.api.v1.endpoints.activities import router as activities_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.boards import router as boards_router
from app.api.v1.endpoints.comments import router as comments_router
from app.api.v1.endpoints.issues import router as issues_router
from app.api.v1.endpoints.projects import router as projects_router
from app.api.v1.endpoints.users import router as users_router
from app.api.v1.endpoints.webhooks import router as webhooks_router
from app.api.v1.endpoints.ws import router as ws_router

router = APIRouter(prefix="/api/v1")


# ── Health check (always available) ──────────────────────────────────────────
@router.get("/health", tags=["health"])
async def health_check():
    """Lightweight readiness probe."""
    return {"status": "ok"}


# ── Register domain routers ──────────────────────────────────────────────────
router.include_router(auth_router,       prefix="/auth",       tags=["auth"])
router.include_router(users_router,      prefix="/users",      tags=["users"])
router.include_router(projects_router,   prefix="/projects",   tags=["projects"])
router.include_router(boards_router,     prefix="",            tags=["boards"])
router.include_router(issues_router,     prefix="",            tags=["issues"])
router.include_router(comments_router,   prefix="",            tags=["comments"])
router.include_router(activities_router, prefix="",            tags=["activities"])
router.include_router(webhooks_router,   prefix="/webhooks",   tags=["webhooks"])
router.include_router(ws_router,         prefix="",            tags=["websockets"])
