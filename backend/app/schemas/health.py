from pydantic import BaseModel
from typing import Dict

class HealthResponse(BaseModel):
    status: str
    version: str
    service: str
    environment_configured: Dict[str, bool]

