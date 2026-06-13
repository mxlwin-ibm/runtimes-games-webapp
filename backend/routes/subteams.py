from fastapi import APIRouter, HTTPException, status, Query
from bson import ObjectId
from typing import List, Optional
from backend.database import get_database
from backend.models.subteam import SubTeam, SubTeamCreate, SubTeamInDB
from backend.models.player import TeamName
from backend.models.enums import Pool

router = APIRouter(prefix="/subteams", tags=["subteams"])


def subteam_helper(subteam) -> dict:
    """Convert MongoDB document to dict"""
    return {
        "_id": str(subteam.get("_id")),
        "event": str(subteam.get("event")),
        "team": str(subteam.get("team")),
        "subteam_id": int(subteam.get("subteam_id")),
        "pool": str(subteam.get("pool")),
        "player_ids": [str(pid) for pid in subteam.get("player_ids", [])],
        "played": int(subteam.get("played", 0)),
        "win": int(subteam.get("win", 0)),
        "loss": int(subteam.get("loss", 0)),
        "gf": int(subteam.get("gf", 0)),
        "ga": int(subteam.get("ga", 0)),
        "gd": int(subteam.get("gd", 0)),
        "points": int(subteam.get("points", 0))
    }


@router.post("/", response_model=SubTeam, status_code=status.HTTP_201_CREATED)
def create_subteam(subteam: SubTeamCreate):
    """Create a new subteam"""
    db = get_database()
    
    # Check unique constraint: (event, team, subteam_id) must be unique
    existing_subteam = db.subteams.find_one({
        "event": subteam.event,
        "team": subteam.team.value,
        "subteam_id": subteam.subteam_id
    })
    if existing_subteam:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SubTeam with this event, team, and subteam_id already exists"
        )
    
    # Validate all players exist and belong to the selected team
    for player_id in subteam.player_ids:
        # Check if player exists
        if not ObjectId.is_valid(player_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid player ID format: {player_id}"
            )
        
        player = db.players.find_one({"_id": ObjectId(player_id)})
        if not player:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Player {player_id} not found"
            )
        
        # Check if player belongs to the selected team
        if player["team"] != subteam.team.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Player {player_id} does not belong to team {subteam.team.value}"
            )
    
    # Create subteam document with all fields from SubTeamCreate plus statistics fields
    subteam_dict = {
        "event": subteam.event,
        "team": subteam.team.value,
        "subteam_id": subteam.subteam_id,
        "pool": subteam.pool.value,
        "player_ids": subteam.player_ids,
        "played": 0,
        "win": 0,
        "loss": 0,
        "gf": 0,
        "ga": 0,
        "gd": 0,
        "points": 0
    }
    
    result = db.subteams.insert_one(subteam_dict)
    subteam_dict["_id"] = str(result.inserted_id)
    
    return subteam_helper(subteam_dict)


@router.get("/", response_model=List[SubTeam])
def get_subteams(
    event: Optional[str] = Query(None, description="Filter by event name"),
    team: Optional[str] = Query(None, description="Filter by team name"),
    pool: Optional[str] = Query(None, description="Filter by pool")
):
    """Get all subteams, optionally filtered by event, team, or pool"""
    db = get_database()
    
    # Build query filter
    query = {}
    
    if event:
        query["event"] = event
    
    if team:
        # Validate team name
        try:
            team_enum = TeamName(team)
            query["team"] = team_enum.value
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid team name. Must be one of: {', '.join([t.value for t in TeamName])}"
            )
    
    if pool:
        # Validate pool
        try:
            pool_enum = Pool(pool)
            query["pool"] = pool_enum.value
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid pool. Must be one of: {', '.join([p.value for p in Pool])}"
            )
    
    subteams = []
    for subteam in db.subteams.find(query):
        subteams.append(subteam_helper(subteam))
    
    return subteams


@router.get("/{id}", response_model=SubTeam)
def get_subteam(id: str):
    """Get a subteam by ID"""
    db = get_database()
    
    # Validate ObjectId format
    if not ObjectId.is_valid(id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid subteam ID format"
        )
    
    subteam = db.subteams.find_one({"_id": ObjectId(id)})
    
    if not subteam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SubTeam not found"
        )
    
    return subteam_helper(subteam)


@router.put("/{id}", response_model=SubTeam)
def update_subteam(id: str, subteam_update: SubTeamCreate):
    """Update a subteam by ID"""
    db = get_database()
    
    # Validate ObjectId format
    if not ObjectId.is_valid(id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid subteam ID format"
        )
    
    # Check if subteam exists
    existing_subteam = db.subteams.find_one({"_id": ObjectId(id)})
    if not existing_subteam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SubTeam not found"
        )
    
    # Check unique constraint (excluding current subteam)
    conflict = db.subteams.find_one({
        "event": subteam_update.event,
        "team": subteam_update.team.value,
        "subteam_id": subteam_update.subteam_id,
        "_id": {"$ne": ObjectId(id)}
    })
    if conflict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SubTeam with this event, team, and subteam_id already exists"
        )
    
    # Validate all players exist and belong to the selected team
    for player_id in subteam_update.player_ids:
        # Check if player exists
        if not ObjectId.is_valid(player_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid player ID format: {player_id}"
            )
        
        player = db.players.find_one({"_id": ObjectId(player_id)})
        if not player:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Player {player_id} not found"
            )
        
        # Check if player belongs to the selected team
        if player["team"] != subteam_update.team.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Player {player_id} does not belong to team {subteam_update.team.value}"
            )
    
    # Update subteam - preserve existing statistics fields
    update_data = {
        "event": subteam_update.event,
        "team": subteam_update.team.value,
        "subteam_id": subteam_update.subteam_id,
        "pool": subteam_update.pool.value,
        "player_ids": subteam_update.player_ids
    }
    
    db.subteams.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )
    
    # Get updated subteam
    updated_subteam = db.subteams.find_one({"_id": ObjectId(id)})
    return subteam_helper(updated_subteam)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subteam(id: str):
    """Delete a subteam by ID"""
    db = get_database()
    
    # Validate ObjectId format
    if not ObjectId.is_valid(id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid subteam ID format"
        )
    
    result = db.subteams.delete_one({"_id": ObjectId(id)})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SubTeam not found"
        )
    
    return None


