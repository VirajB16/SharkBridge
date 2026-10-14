from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    auth,
    businesses,
    investors,
    matches,
    applications,
)

api_router = APIRouter()
api_router.include_router(health.router, prefix="", tags=["Health"])
api_router.include_router(auth.router, prefix="", tags=["Auth & Profile"])
api_router.include_router(businesses.router, prefix="", tags=["Businesses"])
api_router.include_router(investors.router, prefix="", tags=["Investors"])
api_router.include_router(matches.router, prefix="", tags=["Matching"])
api_router.include_router(applications.router, prefix="", tags=["Applications"])
