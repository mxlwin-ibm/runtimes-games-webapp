from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from enum import Enum


class MatchStatus(str, Enum):
    """Match status enum"""
    SCHEDULED = "scheduled"
    PLAYED = "played"


class MatchCreate(BaseModel):
    """Schema for scheduling a new match"""
    team_a_id: str = Field(..., description="First team ID (e.g., 'B1')")
    team_b_id: str = Field(..., description="Second team ID (e.g., 'A2')")
    round: int = Field(..., ge=1, description="Round number")


class MatchUpdate(BaseModel):
    """Schema for updating match results"""
    score_a: int = Field(default=0, ge=0, description="Score for team A")
    score_b: int = Field(default=0, ge=0, description="Score for team B")
    status: MatchStatus = Field(default=MatchStatus.PLAYED, description="Match status")


class Match(BaseModel):
    """Complete match model"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "match_id": "B1A2",
                "team_a_id": "B1",
                "team_a": "Melwin-Vaishak",
                "team_b_id": "A2",
                "team_b": "John-Smith",
                "round": 1,
                "score_a": 10,
                "score_b": 8,
                "status": "played"
            }
        }
    )
    
    match_id: str
    team_a_id: str
    team_a: str
    team_b_id: str
    team_b: str
    round: int
    score_a: int
    score_b: int
    status: MatchStatus = MatchStatus.SCHEDULED


class MatchInDB(Match):
    """Match model as stored in database (includes MongoDB _id)"""
    model_config = ConfigDict(populate_by_name=True)
    
    id: Optional[str] = Field(None, alias="_id")



