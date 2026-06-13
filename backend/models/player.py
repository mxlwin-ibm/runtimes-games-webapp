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
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "_id": "507f1f77bcf86cd799439011",
                "player_name": "John Doe",
                "team": "Titans"
            }
        }
    )
    
    id: Optional[str] = Field(None, alias="_id")
    player_name: str
    team: TeamName


class PlayerInDB(Player):
    """Player model as stored in database (includes MongoDB _id)"""
    model_config = ConfigDict(populate_by_name=True)
    
    id: Optional[str] = Field(None, alias="_id")

