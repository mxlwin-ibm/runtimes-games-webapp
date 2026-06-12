from fastapi import APIRouter, HTTPException, status, Query
from backend.models.player import PlayerCreate, Player, TeamName
from backend.database import get_database
from bson import ObjectId
from typing import List, Optional

router = APIRouter(prefix="/players", tags=["players"])


def player_helper(player) -> dict:
    """Convert MongoDB document to dict"""
    return {
        "_id": str(player.get("_id")),
        "player_name": str(player.get("player_name")),
        "team": str(player.get("team"))
    }


@router.post("/", response_model=Player, status_code=status.HTTP_201_CREATED)
def create_player(player: PlayerCreate):
    """Create a new player"""
    db = get_database()
    
    # Check if player already exists
    existing_player = db.players.find_one({"player_name": player.player_name})
    if existing_player:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Player with name '{player.player_name}' already exists"
        )
    
    # Create player document
    player_dict = {
        "player_name": player.player_name,
        "team": player.team.value
    }
    
    result = db.players.insert_one(player_dict)
    player_dict["_id"] = str(result.inserted_id)
    
    return player_dict


@router.get("/", response_model=List[Player])
def get_players(team: Optional[str] = Query(None, description="Filter by team name")):
    """Get all players, optionally filtered by team"""
    db = get_database()
    
    # Build query filter
    query = {}
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
    
    players = []
    for player in db.players.find(query):
        players.append(player_helper(player))
    
    return players


@router.get("/{id}", response_model=Player)
def get_player(id: str):
    """Get a player by ID"""
    db = get_database()
    
    # Validate ObjectId format
    if not ObjectId.is_valid(id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid player ID format"
        )
    
    player = db.players.find_one({"_id": ObjectId(id)})
    
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Player with id '{id}' not found"
        )
    
    return player_helper(player)


@router.put("/{id}", response_model=Player)
def update_player(id: str, player_update: PlayerCreate):
    """Update a player by ID"""
    db = get_database()
    
    # Validate ObjectId format
    if not ObjectId.is_valid(id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid player ID format"
        )
    
    # Check if player exists
    existing_player = db.players.find_one({"_id": ObjectId(id)})
    if not existing_player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Player with id '{id}' not found"
        )
    
    # Check if new name conflicts with another player
    if player_update.player_name != existing_player.get("player_name"):
        name_conflict = db.players.find_one({
            "player_name": player_update.player_name,
            "_id": {"$ne": ObjectId(id)}
        })
        if name_conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Player with name '{player_update.player_name}' already exists"
            )
    
    # Update player
    update_data = {
        "player_name": player_update.player_name,
        "team": player_update.team.value
    }
    
    db.players.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )
    
    # Get updated player
    updated_player = db.players.find_one({"_id": ObjectId(id)})
    return player_helper(updated_player)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_player(id: str):
    """Delete a player by ID"""
    db = get_database()
    
    # Validate ObjectId format
    if not ObjectId.is_valid(id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid player ID format"
        )
    
    result = db.players.delete_one({"_id": ObjectId(id)})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Player with id '{id}' not found"
        )
    
    return None

