"""
Pydantic models for API request/response validation
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    JUNIOR_OFFICER = "Junior Officer"
    SENIOR_LOAN_OFFICER = "Senior Loan Officer"
    CREDIT_MANAGER = "Credit Manager"
    RISK_OFFICER = "Risk Officer"
    SENIOR_MANAGEMENT = "Senior Management"


class RiskLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=500)
    user_role: UserRole
    user_id: Optional[str] = None


class Citation(BaseModel):
    policy_id: str
    policy_name: str
    version: str
    section: Optional[str] = None
    page: Optional[int] = None
    effective_date: str


class QueryResponse(BaseModel):
    success: bool
    query: str
    answer: Optional[str] = None
    citations: List[Citation] = []
    preconditions: List[str] = []
    exceptions: List[str] = []
    confidence: float
    risk_level: Optional[RiskLevel] = None
    message: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class DocumentUploadResponse(BaseModel):
    success: bool
    message: str
    policy_id: Optional[str] = None
    chunks_created: Optional[int] = None


class HealthCheck(BaseModel):
    status: str
    version: str
    timestamp: datetime = Field(default_factory=datetime.now)
