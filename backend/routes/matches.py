from fastapi import APIRouter, HTTPException, status
from backend.models.match import MatchCreate, MatchUpdate, Match, MatchStatus
from backend.database import get_database
from bson import ObjectId
from typing import List

router = APIRouter(prefix="/matches", tags=["matches"])


def match_helper(match) -> dict:
    """Convert MongoDB document to dict"""
    return {
        "_id": str(match.get("_id")),
        "match_id": str(match.get("match_id", "")),
        "team_a_id": str(match.get("team_a_id")),
        "team_a": str(match.get("team_a")),
        "team_b_id": str(match.get("team_b_id")),
        "team_b": str(match.get("team_b")),
        "round": int(match.get("round", 1)),
        "score_a": int(match.get("score_a", 0)),
        "score_b": int(match.get("score_b", 0)),
        "status": match.get("status", "scheduled")
    }


@router.post("/", response_model=Match, status_code=status.HTTP_201_CREATED)
def schedule_match(match: MatchCreate):
    """Schedule a new match"""
    db = get_database()
    
    # Verify both teams exist and get their names
    team_a = db.teams.find_one({"team_id": match.team_a_id})
    team_b = db.teams.find_one({"team_id": match.team_b_id})
    
    if not team_a:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with ID '{match.team_a_id}' not found"
        )
    
    if not team_b:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with ID '{match.team_b_id}' not found"
        )
    
    if match.team_a_id == match.team_b_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A team cannot play against itself"
        )
    
    # Generate match_id by combining team IDs
    match_id = f"{match.team_a_id}{match.team_b_id}"
    
    # Create match document with both IDs and names
    match_dict = {
        "match_id": match_id,
        "team_a_id": match.team_a_id,
        "team_a": team_a["team_name"],
        "team_b_id": match.team_b_id,
        "team_b": team_b["team_name"],
        "round": match.round,
        "score_a": 0,
        "score_b": 0,
        "status": MatchStatus.SCHEDULED.value
    }
    
    result = db.matches.insert_one(match_dict)
    match_dict["_id"] = str(result.inserted_id)
    
    return match_dict


@router.put("/{match_id}", response_model=Match)
def update_match_result(match_id: str, match_update: MatchUpdate):
    """Update match result with scores"""
    db = get_database()
    
    # Find the match by match_id field (string like "B1A2")
    existing_match = db.matches.find_one({"match_id": match_id})
    if not existing_match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Match with match_id '{match_id}' not found"
        )
    
    # Update match with scores and status
    update_data = {
        "score_a": int(match_update.score_a),
        "score_b": int(match_update.score_b),
        "status": match_update.status.value
    }
    
    db.matches.update_one(
        {"match_id": match_id},
        {"$set": update_data}
    )
    
    # Get updated match
    updated_match = db.matches.find_one({"match_id": match_id})
    return match_helper(updated_match)


@router.get("/", response_model=List[Match])
def get_matches():
    """Get all matches"""
    db = get_database()
    matches = []
    
    for match in db.matches.find():
        matches.append(match_helper(match))
    
    return matches


@router.get("/team/{team_id}", response_model=List[Match])
def get_team_matches(team_id: str):
    """Get all matches for a specific team by team_id"""
    db = get_database()
    
    # Verify team exists
    team = db.teams.find_one({"team_id": team_id})
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with team_id '{team_id}' not found"
        )
    
    matches = []
    
    # Find matches where team is either team_a_id or team_b_id
    for match in db.matches.find({
        "$or": [
            {"team_a_id": team_id},
            {"team_b_id": team_id}
        ]
    }):
        matches.append(match_helper(match))
    
    return matches