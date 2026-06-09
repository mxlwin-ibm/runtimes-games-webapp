from fastapi import APIRouter, HTTPException, status
from backend.models.team import TeamCreate, Team
from backend.database import get_database
from bson import ObjectId
from typing import List

router = APIRouter(prefix="/teams", tags=["teams"])


def team_helper(team) -> dict:
    """Convert MongoDB document to dict"""
    return {
        "_id": str(team.get("_id")),
        "team_id": str(team.get("team_id")),
        "team_name": str(team.get("team_name")),
        "club": str(team.get("club")),
        "pool": str(team.get("pool")),
        "win": team.get("win", 0),
        "loss": team.get("loss", 0),
        "gf": team.get("gf", 0),
        "ga": team.get("ga", 0),
        "gd": str(team.get("gd")),
        "points": team.get("points", 0)
    }


@router.post("/", response_model=Team, status_code=status.HTTP_201_CREATED)
def create_team(team: TeamCreate):
    """Create a new team"""
    db = get_database()
    
    # Check if team_id already exists
    existing_team = db.teams.find_one({"team_id": team.team_id})
    if existing_team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Team with team_id '{team.team_id}' already exists"
        )
    
    # Create team document with default statistics
    team_dict = {
        "team_id": team.team_id,
        "team_name": team.team_name,
        "club": team.club,
        "pool": team.pool.value,
        "win": 0,
        "loss": 0,
        "gf": 0,
        "ga": 0,
        "gd": "+0",
        "points": 0
    }
    
    result = db.teams.insert_one(team_dict)
    team_dict["_id"] = str(result.inserted_id)
    
    return team_dict


@router.get("/", response_model=List[Team])
def get_teams():
    """Get all teams"""
    db = get_database()
    teams = []
    
    for team in db.teams.find():
        teams.append(team_helper(team))
    
    return teams


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(team_id: str):
    """Delete a team by MongoDB _id"""
    db = get_database()
    
    # Validate ObjectId format
    if not ObjectId.is_valid(team_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid team ID format"
        )
    
    result = db.teams.delete_one({"_id": ObjectId(team_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with id '{team_id}' not found"
        )
    
    return None
