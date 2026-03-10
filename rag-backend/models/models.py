"""
Pydantic models
---------------
datetime fields removed from response models — they caused JSON
serialization errors when FastAPI tried to encode them.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class UserRole(str, Enum):
    JUNIOR_OFFICER      = "Junior Officer"
    SENIOR_LOAN_OFFICER = "Senior Loan Officer"
    CREDIT_MANAGER      = "Credit Manager"
    RISK_OFFICER        = "Risk Officer"
    SENIOR_MANAGEMENT   = "Senior Management"


class RiskLevel(str, Enum):
    LOW    = "Low"
    MEDIUM = "Medium"
    HIGH   = "High"


class QueryRequest(BaseModel):
    query:     str       = Field(..., min_length=3, max_length=2000)
    user_role: UserRole
    user_id:   Optional[str] = None


class Citation(BaseModel):
    policy_id:      str
    policy_name:    str
    version:        str
    section:        Optional[str] = None
    page:           Optional[int] = None
    effective_date: str = ""


class QueryResponse(BaseModel):
    success:      bool
    query:        str
    answer:       Optional[str]        = None
    citations:    List[Citation]       = []
    preconditions: List[str]           = []
    exceptions:   List[str]            = []
    confidence:   float                = 0.0
    risk_level:   Optional[RiskLevel]  = None
    message:      Optional[str]        = None
    response_time_ms: Optional[float]  = None
    # NOTE: no `timestamp` field — avoids datetime serialization errors


class DocumentUploadResponse(BaseModel):
    success:        bool
    message:        str
    policy_id:      Optional[str] = None
    chunks_created: Optional[int] = None
    already_indexed: bool         = False


class PolicyInfo(BaseModel):
    policy_id:      str
    policy_name:    str
    version:        str
    effective_date: str
    required_role:  str
    risk_level:     str
    chunk_count:    int
    indexed_at:     str


class HealthCheck(BaseModel):
    status:          str
    version:         str
    collection_size: int  = 0
    policies_indexed: int = 0
    # NOTE: no `timestamp` field
