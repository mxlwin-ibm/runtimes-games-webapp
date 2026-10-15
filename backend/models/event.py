from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class EventCreate(BaseModel):
    """Schema for creating a new upcoming event"""
    event: str = Field(..., description="Event name (e.g., Snooker, Cricket)")
    month: str = Field(..., description="Target month or date (e.g., July 2026)")
    description: Optional[str] = Field(None, description="Optional event description or details")
    status: Optional[str] = Field("upcoming", description="Status: upcoming, registration_open, ongoing, completed")
    order: Optional[int] = Field(0, description="Display order sequence")
    is_active: Optional[bool] = Field(True, description="Whether the event is active")


class EventUpdate(BaseModel):
    """Schema for updating an existing upcoming event"""
    event: Optional[str] = Field(None, description="Event name")
    month: Optional[str] = Field(None, description="Target month or date")
    description: Optional[str] = Field(None, description="Optional event description")
    status: Optional[str] = Field(None, description="Status")
    order: Optional[int] = Field(None, description="Display order sequence")
    is_active: Optional[bool] = Field(None, description="Whether the event is active")


class EventReorderItem(BaseModel):
    """Schema for reordering event items"""
    id: str = Field(..., description="Event ObjectId")
    order: int = Field(..., description="New display order")


class EventResponse(BaseModel):
    """Event response model"""
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "_id": "67b93df92d4f58c73c891a23",
                "event": "Snooker",
                "month": "July 2026",
                "description": "Annual Tournament",
                "status": "upcoming",
                "order": 1,
                "is_active": True
            }
        }
    )

    id: Optional[str] = Field(None, alias="_id")
    event: str
    month: str
    description: Optional[str] = None
    status: str = "upcoming"
    order: int = 0
    is_active: bool = True
