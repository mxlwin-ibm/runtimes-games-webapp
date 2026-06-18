from fastapi import APIRouter, HTTPException, status, Query
from bson import ObjectId
from typing import List, Optional, Dict
from backend.database import get_database
from backend.models.subteam import SubTeam, SubTeamCreate, SubTeamInDB
from backend.models.player import TeamName
from backend.models.enums import Pool
import logging
import time

router = APIRouter(prefix="/subteams", tags=["subteams"])
logger = logging.getLogger(__name__)


def subteam_helper(subteam, db=None, players_by_id: Optional[Dict[str, dict]] = None) -> dict:
    """Convert MongoDB document to dict and fetch player names"""
    result = {
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
    
    # Fetch player names if preloaded players are provided
    if players_by_id is not None:
        result["player_names"] = [
            players_by_id.get(str(player_id), {}).get("player_name", "Unknown")
            for player_id in subteam.get("player_ids", [])
        ]
    elif db is not None:
        player_names = []
        for player_id in subteam.get("player_ids", []):
            try:
                player = db.players.find_one({"_id": ObjectId(player_id)})
                if player:
                    player_names.append(player.get("player_name", "Unknown"))
                else:
                    player_names.append("Unknown")
            except Exception:
                player_names.append("Unknown")
        result["player_names"] = player_names
    
    return result


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
    
    return subteam_helper(subteam_dict, db)


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
    
    endpoint_start = time.perf_counter()
    subteams_query_start = time.perf_counter()
    subteam_docs = list(db.subteams.find(query))
    subteams_query_ms = (time.perf_counter() - subteams_query_start) * 1000

    player_lookup_start = time.perf_counter()
    unique_player_ids = []
    seen_player_ids = set()
    for subteam in subteam_docs:
        for player_id in subteam.get("player_ids", []):
            player_id_str = str(player_id)
            if ObjectId.is_valid(player_id_str) and player_id_str not in seen_player_ids:
                seen_player_ids.add(player_id_str)
                unique_player_ids.append(ObjectId(player_id_str))

    players_by_id = {}
    if unique_player_ids:
        players = list(db.players.find({"_id": {"$in": unique_player_ids}}))
        players_by_id = {str(player["_id"]): player for player in players}
    player_lookup_ms = (time.perf_counter() - player_lookup_start) * 1000

    subteams = [subteam_helper(subteam, players_by_id=players_by_id) for subteam in subteam_docs]

    total_ms = (time.perf_counter() - endpoint_start) * 1000
    logger.info(
        "get_subteams timing event=%s team=%s pool=%s subteams_query_ms=%.2f player_lookup_ms=%.2f total_ms=%.2f subteams_count=%d unique_player_count=%d",
        event,
        team,
        pool,
        subteams_query_ms,
        player_lookup_ms,
        total_ms,
        len(subteam_docs),
        len(unique_player_ids),
    )

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
    
    return subteam_helper(subteam, db)


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
    return subteam_helper(updated_subteam, db)


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


