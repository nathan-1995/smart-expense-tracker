"""
Pydantic schemas for API usage tracking.

These schemas define request/response models for API usage endpoints.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from uuid import UUID


class UserUsageStats(BaseModel):
    """Statistics for a single user's API usage."""

    user_id: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    request_count: int
    avg_duration_ms: int


class DailyUsageStats(BaseModel):
    """Daily usage statistics."""

    date: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    request_count: int
    failed_requests: int


class ServiceBreakdown(BaseModel):
    """Usage breakdown by service and operation."""

    service: str
    operation: str
    model_name: str
    total_tokens: int
    request_count: int
    avg_duration_ms: int


class UserTodayUsage(BaseModel):
    """Today's usage for a specific user."""

    input_tokens: int
    output_tokens: int
    total_tokens: int
    request_count: int


class APIUsageDetail(BaseModel):
    """Detailed information about an API request."""

    id: UUID
    service: str
    operation: str
    model_name: str
    user_id: Optional[UUID]
    document_id: Optional[UUID]
    input_tokens: int
    output_tokens: int
    total_tokens: int
    status_code: int
    success: bool
    error_message: Optional[str]
    duration_ms: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class UsageSummaryResponse(BaseModel):
    """Complete usage summary response."""

    total_tokens: int = Field(description="Total tokens used across all users")
    total_requests: int = Field(description="Total number of requests")
    users: List[UserUsageStats] = Field(description="Per-user usage statistics")


class DailyUsageResponse(BaseModel):
    """Daily usage trend response."""

    days: List[DailyUsageStats] = Field(description="Daily usage statistics")


class ServiceBreakdownResponse(BaseModel):
    """Service breakdown response."""

    services: List[ServiceBreakdown] = Field(description="Usage by service/operation")


class RecentRequestsResponse(BaseModel):
    """Recent requests response."""

    requests: List[APIUsageDetail] = Field(description="Recent API requests")
    count: int = Field(description="Number of requests returned")
