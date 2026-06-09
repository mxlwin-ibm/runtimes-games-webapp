from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from enum import Enum


class Pool(str, Enum):
    """Pool enum for tournament groups"""
    A = "A"
    B = "B"


class TeamCreate(BaseModel):
    """Schema for creating a new team"""
    team_id: str = Field(..., description="Unique team identifier (e.g., 'B1')")
    team_name: str = Field(..., description="Team name (e.g., 'Melwin-Vaishak')")
    club: str = Field(..., description="Club name (e.g., 'Bravo')")
    pool: Pool = Field(..., description="Tournament pool (A or B)")


class Team(BaseModel):
    """Complete team model with statistics"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "team_id": "B1",
                "team_name": "Melwin-Vaishak",
                "club": "Bravo",
                "pool": "B",
                "win": 0,
                "loss": 0,
                "gf": 0,
                "ga": 0,
                "gd": "+0",
                "points": 0
            }
        }
    )
    
    team_id: str
    team_name: str
    club: str
    pool: Pool
    win: int = 0
    loss: int = 0
    gf: int = 0  # Goals For
    ga: int = 0  # Goals Against
    gd: str = "+0"  # Goal Difference (formatted with +/-)
    points: int = 0


class TeamInDB(Team):
    """Team model as stored in database (includes MongoDB _id)"""
    model_config = ConfigDict(populate_by_name=True)
    
    id: Optional[str] = Field(None, alias="_id")

