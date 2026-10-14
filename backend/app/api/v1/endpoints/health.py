from fastapi import APIRouter
from app.schemas.health import HealthResponse
from app.core.config import settings

router = APIRouter()

@router.get("/health", response_model=HealthResponse, tags=["Health"])
def get_health() -> HealthResponse:
    """
    Health check endpoint returning API status, version, and whether
    external services (Supabase, LLM) have configuration present.
    """
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        service=settings.PROJECT_NAME,
        environment_configured={
            "supabase_url": bool(settings.SUPABASE_URL),
            "supabase_anon_key": bool(settings.SUPABASE_ANON_KEY),
            "supabase_service_role_key": bool(settings.SUPABASE_SERVICE_ROLE_KEY),
            "llm_api_key": bool(settings.LLM_API_KEY),
        }
    )

