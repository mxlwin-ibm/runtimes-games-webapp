from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional
from enum import Enum
from backend.models.enums import Pool
from backend.models.player import TeamName


class SubTeamCreate(BaseModel):
    """Schema for creating a new subteam"""
    event: str = Field(..., description="Event name (e.g., 'foosball')")
    team: TeamName = Field(..., description="Team name (Titans, El Dragos, Gladiators, Vikings)")
    subteam_id: int = Field(..., ge=1, description="Subteam identifier (must be >= 1)")
    pool: Pool = Field(..., description="Tournament pool (A, B, C, D)")
    player_ids: List[str] = Field(..., description="List of player IDs (max 10 players)")
    
    @field_validator('player_ids')
    @classmethod
    def validate_player_count(cls, v):
        """Validate that player_ids list has at most 10 players"""
        if len(v) > 10:
            raise ValueError("A subteam can have at most 10 players")
        return v


class SubTeam(SubTeamCreate):
    """Complete subteam model with statistics"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "event": "foosball",
                "team": "Titans",
                "subteam_id": 1,
                "pool": "A",
                "player_ids": ["player1", "player2"],
                "played": 0,
                "win": 0,
                "loss": 0,
                "gf": 0,
                "ga": 0,
                "gd": 0,
                "points": 0,
                "name": "Titans-1"
            }
        }
    )
    
    played: int = Field(default=0, description="Number of matches played")
    win: int = Field(default=0, description="Number of wins")
    loss: int = Field(default=0, description="Number of losses")
    gf: int = Field(default=0, description="Goals For")
    ga: int = Field(default=0, description="Goals Against")
    gd: int = Field(default=0, description="Goal Difference")
    points: int = Field(default=0, description="Total points")
    
    @property
    def name(self) -> str:
        """Generate subteam name from team and subteam_id"""
        return f"{self.team.value}-{self.subteam_id}"


class SubTeamInDB(SubTeam):
    """SubTeam model as stored in database (includes MongoDB _id)"""
    model_config = ConfigDict(populate_by_name=True)
    
    id: Optional[str] = Field(None, alias="_id")


