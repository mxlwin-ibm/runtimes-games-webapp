from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional
from datetime import datetime
from backend.models.enums import MatchStatus, MatchType


class MatchCreate(BaseModel):
    """Schema for scheduling a new match"""
    team1: str = Field(..., description="First team name (e.g., 'Titans')")
    team1_subid: str = Field(..., description="First subteam identifier (e.g., '1')")
    team2: str = Field(..., description="Second team name (e.g., 'Vikings')")
    team2_subid: str = Field(..., description="Second subteam identifier (e.g., '2')")
    event: str = Field(default="foosball", description="Event name")
    round: int = Field(default=1, ge=1, description="Round number")
    match_type: MatchType = Field(default=MatchType.LEAGUE, description="Match type: league or playoff stage")
    match_date: str = Field(..., description="Match date in YYYY-MM-DD format (required)")
    match_time: str = Field(..., description="Match time in HH:MM format (24-hour, required)")
    
    @field_validator('team2', 'team1_subid', 'team2_subid')
    @classmethod
    def teams_must_be_different(cls, v, info):
        """Validate that team1/team1_subid and team2/team2_subid are different"""
        team1 = info.data.get('team1')
        team1_subid = info.data.get('team1_subid')
        team2 = info.data.get('team2', v if info.field_name == 'team2' else None)
        team2_subid = info.data.get('team2_subid', v if info.field_name == 'team2_subid' else None)

        if team1 and team1_subid and team2 and team2_subid and team1 == team2 and team1_subid == team2_subid:
            raise ValueError('team1/team1_subid and team2/team2_subid must be different - a subteam cannot play itself')
        return v


class MatchUpdate(BaseModel):
    """Schema for updating match results"""
    team1_score: int = Field(default=0, ge=0, description="Score for team 1")
    team2_score: int = Field(default=0, ge=0, description="Score for team 2")
    match_status: MatchStatus = Field(default=MatchStatus.PLAYED, description="Match status")


class Match(BaseModel):
    """Complete match model"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "_id": "507f1f77bcf86cd799439011",
                "event": "foosball",
                "team1": "Titans",
                "team1_subid": "1",
                "team2": "Vikings",
                "team2_subid": "2",
                "team1_score": 10,
                "team2_score": 8,
                "match_status": "played",
                "round": 1,
                "match_type": "league",
                "playoff_position": None,
                "match_date": "2024-06-15",
                "match_time": "14:30"
            }
        },
        populate_by_name=True
    )
    
    id: Optional[str] = Field(None, alias="_id", description="MongoDB ObjectId")
    event: str = Field(default="foosball", description="Event name")
    team1: str = Field(..., description="First team name")
    team1_subid: str = Field(..., description="First subteam identifier")
    team2: str = Field(..., description="Second team name")
    team2_subid: str = Field(..., description="Second subteam identifier")
    team1_score: int = Field(default=0, ge=0, description="Score for team 1")
    team2_score: int = Field(default=0, ge=0, description="Score for team 2")
    match_status: MatchStatus = Field(default=MatchStatus.SCHEDULED, description="Match status")
    round: int = Field(default=1, ge=1, description="Round number")
    match_type: MatchType = Field(default=MatchType.LEAGUE, description="Match type: league or playoff stage")
    playoff_position: Optional[str] = Field(None, description="Playoff position (e.g., 'QF1', 'SF1', 'F1')")
    match_date: Optional[str] = Field(None, description="Match date in YYYY-MM-DD format")
    match_time: Optional[str] = Field(None, description="Match time in HH:MM format (24-hour)")
    
    @field_validator('team2', 'team1_subid', 'team2_subid')
    @classmethod
    def teams_must_be_different(cls, v, info):
        """Validate that team1/team1_subid and team2/team2_subid are different"""
        team1 = info.data.get('team1')
        team1_subid = info.data.get('team1_subid')
        team2 = info.data.get('team2', v if info.field_name == 'team2' else None)
        team2_subid = info.data.get('team2_subid', v if info.field_name == 'team2_subid' else None)

        if team1 and team1_subid and team2 and team2_subid and team1 == team2 and team1_subid == team2_subid:
            raise ValueError('team1/team1_subid and team2/team2_subid must be different - a subteam cannot play itself')
        return v
    
    @field_validator('team1_score', 'team2_score')
    @classmethod
    def scores_must_be_non_negative(cls, v):
        """Validate that scores are non-negative"""
        if v < 0:
            raise ValueError('Scores must be greater than or equal to 0')
        return v


class MatchInDB(Match):
    """Match model as stored in database (includes MongoDB _id)"""
    model_config = ConfigDict(populate_by_name=True)
    
    id: Optional[str] = Field(None, alias="_id")



