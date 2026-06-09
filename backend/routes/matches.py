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
    """Update match result with scores and update team statistics"""
    db = get_database()
    
    # Find the match by match_id field (string like "B1A2")
    existing_match = db.matches.find_one({"match_id": match_id})
    if not existing_match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Match with match_id '{match_id}' not found"
        )
    
    # Get team IDs
    team_a_id = existing_match["team_a_id"]
    team_b_id = existing_match["team_b_id"]
    score_a = int(match_update.score_a)
    score_b = int(match_update.score_b)
    
    # Update match with scores and status
    update_data = {
        "score_a": score_a,
        "score_b": score_b,
        "status": match_update.status.value
    }
    
    db.matches.update_one(
        {"match_id": match_id},
        {"$set": update_data}
    )
    
    # Update team statistics if match is played
    if match_update.status == MatchStatus.PLAYED:
        # Update Team A statistics
        team_a = db.teams.find_one({"team_id": team_a_id})
        if team_a:
            new_win_a = team_a.get("win", 0) + (1 if score_a > score_b else 0)
            new_loss_a = team_a.get("loss", 0) + (1 if score_a < score_b else 0)
            new_gf_a = team_a.get("gf", 0) + score_a
            new_ga_a = team_a.get("ga", 0) + score_b
            new_gd_a = new_gf_a - new_ga_a
            new_points_a = team_a.get("points", 0) + (3 if score_a > score_b else 0)
            
            db.teams.update_one(
                {"team_id": team_a_id},
                {"$set": {
                    "win": new_win_a,
                    "loss": new_loss_a,
                    "gf": new_gf_a,
                    "ga": new_ga_a,
                    "gd": f"+{new_gd_a}" if new_gd_a >= 0 else str(new_gd_a),
                    "points": new_points_a
                }}
            )
        
        # Update Team B statistics
        team_b = db.teams.find_one({"team_id": team_b_id})
        if team_b:
            new_win_b = team_b.get("win", 0) + (1 if score_b > score_a else 0)
            new_loss_b = team_b.get("loss", 0) + (1 if score_b < score_a else 0)
            new_gf_b = team_b.get("gf", 0) + score_b
            new_ga_b = team_b.get("ga", 0) + score_a
            new_gd_b = new_gf_b - new_ga_b
            new_points_b = team_b.get("points", 0) + (3 if score_b > score_a else 0)
            
            db.teams.update_one(
                {"team_id": team_b_id},
                {"$set": {
                    "win": new_win_b,
                    "loss": new_loss_b,
                    "gf": new_gf_b,
                    "ga": new_ga_b,
                    "gd": f"+{new_gd_b}" if new_gd_b >= 0 else str(new_gd_b),
                    "points": new_points_b
                }}
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