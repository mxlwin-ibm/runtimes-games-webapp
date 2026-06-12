from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional
from enum import Enum


class TeamName(str, Enum):
    """Team name enum for player assignments"""
    TITANS = "Titans"
    EL_DRAGOS = "El Dragos"
    GLADIATORS = "Gladiators"
    VIKINGS = "Vikings"


class PlayerCreate(BaseModel):
    """Schema for creating a new player"""
    player_name: str = Field(..., description="Player name")
    team: TeamName = Field(..., description="Team name (Titans, El Dragos, Gladiators, Vikings)")


class Player(BaseModel):
    """Complete player model"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "player_name": "John Doe",
                "team": "Titans"
            }
        }
    )
    
    player_name: str
    team: TeamName


class PlayerInDB(Player):
    """Player model as stored in database (includes MongoDB _id)"""
    model_config = ConfigDict(populate_by_name=True)
    
    id: Optional[str] = Field(None, alias="_id")

