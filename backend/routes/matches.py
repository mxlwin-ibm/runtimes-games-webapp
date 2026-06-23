from fastapi import APIRouter, HTTPException, status
from backend.models.match import MatchCreate, MatchUpdate, Match, MatchStatus
from backend.database import get_database
from backend.cache import invalidate_points_table_cache, invalidate_dashboard_cache
from bson import ObjectId
from typing import List

router = APIRouter(prefix="/matches", tags=["matches"])


def match_helper(match) -> dict:
    """Convert MongoDB document to dict with separated team/subteam fields"""
    return {
        "_id": str(match.get("_id")),
        "event": match.get("event", "foosball"),
        "team1": match.get("team1"),
        "team1_subid": str(match.get("team1_subid")),
        "team2": match.get("team2"),
        "team2_subid": str(match.get("team2_subid")),
        "team1_score": int(match.get("team1_score", 0)),
        "team2_score": int(match.get("team2_score", 0)),
        "match_status": match.get("match_status", "scheduled"),
        "round": int(match.get("round", 1)),
        "match_type": match.get("match_type", "league"),
        "playoff_position": match.get("playoff_position"),
        "match_date": match.get("match_date"),
        "match_time": match.get("match_time")
    }


@router.post("/", response_model=Match, status_code=status.HTTP_201_CREATED)
async def create_match(match: MatchCreate):
    """Create a new match"""
    db = get_database()
    
    # Route-level validation: subteams must be different
    if match.team1 == match.team2 and match.team1_subid == match.team2_subid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A subteam cannot play against itself"
        )
    
    try:
        team1_subid = int(match.team1_subid)
        team2_subid = int(match.team2_subid)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="team1_subid and team2_subid must be valid integers"
        )
    
    # For league matches, verify subteams exist and are in same pool
    # For playoff matches, skip pool validation
    if match.match_type.value == "league":
        # Verify both subteams exist and get their details
        team1_doc = db.subteams.find_one({
            "event": match.event,
            "team": match.team1,
            "subteam_id": team1_subid
        })
        team2_doc = db.subteams.find_one({
            "event": match.event,
            "team": match.team2,
            "subteam_id": team2_subid
        })
        
        if not team1_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"SubTeam '{match.team1}-{match.team1_subid}' not found for event '{match.event}'"
            )
        
        if not team2_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"SubTeam '{match.team2}-{match.team2_subid}' not found for event '{match.event}'"
            )
        
        # Verify both subteams are in the same pool
        if team1_doc["pool"] != team2_doc["pool"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"SubTeams must be in the same pool. {match.team1}-{match.team1_subid} is in Pool {team1_doc['pool']}, {match.team2}-{match.team2_subid} is in Pool {team2_doc['pool']}"
            )
    
    # Check for duplicate matches (both directions) - include event in the check
    existing_match = db.matches.find_one({
        "event": match.event,
        "$or": [
            {
                "team1": match.team1,
                "team1_subid": match.team1_subid,
                "team2": match.team2,
                "team2_subid": match.team2_subid,
            },
            {
                "team1": match.team2,
                "team1_subid": match.team2_subid,
                "team2": match.team1,
                "team2_subid": match.team1_subid
            }
        ]
    })
    
    if match.match_type == "league" and existing_match:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A match between subteams {match.team1}-{match.team1_subid} and {match.team2}-{match.team2_subid} already exists for event '{match.event}'"
        )
    
    # Create match document with separated team/subteam fields
    match_dict = {
        "event": match.event,
        "team1": match.team1,
        "team1_subid": match.team1_subid,
        "team2": match.team2,
        "team2_subid": match.team2_subid,
        "team1_score": 0,
        "team2_score": 0,
        "match_status": MatchStatus.SCHEDULED.value,
        "round": match.round,
        "match_type": match.match_type.value,
        "match_date": match.match_date,
        "match_time": match.match_time
    }
    
    result = db.matches.insert_one(match_dict)
    match_dict["_id"] = str(result.inserted_id)
    
    # Invalidate caches after creating a match
    print(f"🗑️  Invalidating points table and dashboard cache after match creation")
    await invalidate_points_table_cache()
    await invalidate_dashboard_cache()
    
    return match_dict


@router.get("/", response_model=List[Match])
def get_matches():
    """Get all matches"""
    db = get_database()
    matches = []
    
    for match in db.matches.find():
        matches.append(match_helper(match))
    
    return matches


@router.get("/{id}", response_model=Match)
def get_match(id: str):
    """Get a single match by MongoDB ObjectId"""
    db = get_database()
    
    # Validate ObjectId format
    if not ObjectId.is_valid(id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ObjectId format: '{id}'"
        )
    
    # Find match by _id
    match = db.matches.find_one({"_id": ObjectId(id)})
    
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Match with id '{id}' not found"
        )
    
    return match_helper(match)


@router.put("/{id}", response_model=Match)
async def update_match(id: str, match_update: MatchUpdate):
    """Update match scores and status"""
    db = get_database()
    
    # Validate ObjectId format
    if not ObjectId.is_valid(id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ObjectId format: '{id}'"
        )
    
    # Find the match by _id
    existing_match = db.matches.find_one({"_id": ObjectId(id)})
    if not existing_match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Match with id '{id}' not found"
        )
    
    # Get team identifiers and scores
    team1 = existing_match["team1"]
    team1_subid = int(existing_match["team1_subid"])
    team2 = existing_match["team2"]
    team2_subid = int(existing_match["team2_subid"])
    team1_score = int(match_update.team1_score)
    team2_score = int(match_update.team2_score)
    
    # Update match with scores and status
    update_data = {
        "team1_score": team1_score,
        "team2_score": team2_score,
        "match_status": match_update.match_status.value
    }
    
    # Update date/time if provided
    if match_update.match_date is not None:
        update_data["match_date"] = match_update.match_date
    if match_update.match_time is not None:
        update_data["match_time"] = match_update.match_time
    
    db.matches.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )
    
    # Update subteam statistics ONLY if match status is PLAYED
    if match_update.match_status == MatchStatus.PLAYED:
        # Get event from existing match
        event = existing_match.get("event", "foosball")
        
        # Update SubTeam 1 statistics
        team1_doc = db.subteams.find_one({
            "event": event,
            "team": team1,
            "subteam_id": team1_subid
        })
        if team1_doc:
            new_played_1 = team1_doc.get("played", 0) + 1
            new_win_1 = team1_doc.get("win", 0) + (1 if team1_score > team2_score else 0)
            new_loss_1 = team1_doc.get("loss", 0) + (1 if team1_score < team2_score else 0)
            new_gf_1 = team1_doc.get("gf", 0) + team1_score
            new_ga_1 = team1_doc.get("ga", 0) + team2_score
            new_gd_1 = new_gf_1 - new_ga_1
            new_points_1 = team1_doc.get("points", 0) + (3 if team1_score > team2_score else 0)
            
            db.subteams.update_one(
                {"event": event, "team": team1, "subteam_id": team1_subid},
                {"$set": {
                    "played": new_played_1,
                    "win": new_win_1,
                    "loss": new_loss_1,
                    "gf": new_gf_1,
                    "ga": new_ga_1,
                    "gd": new_gd_1,
                    "points": new_points_1
                }}
            )
        
        # Update SubTeam 2 statistics
        team2_doc = db.subteams.find_one({
            "event": event,
            "team": team2,
            "subteam_id": team2_subid
        })
        if team2_doc:
            new_played_2 = team2_doc.get("played", 0) + 1
            new_win_2 = team2_doc.get("win", 0) + (1 if team2_score > team1_score else 0)
            new_loss_2 = team2_doc.get("loss", 0) + (1 if team2_score < team1_score else 0)
            new_gf_2 = team2_doc.get("gf", 0) + team2_score
            new_ga_2 = team2_doc.get("ga", 0) + team1_score
            new_gd_2 = new_gf_2 - new_ga_2
            new_points_2 = team2_doc.get("points", 0) + (3 if team2_score > team1_score else 0)
            
            db.subteams.update_one(
                {"event": event, "team": team2, "subteam_id": team2_subid},
                {"$set": {
                    "played": new_played_2,
                    "win": new_win_2,
                    "loss": new_loss_2,
                    "gf": new_gf_2,
                    "ga": new_ga_2,
                    "gd": new_gd_2,
                    "points": new_points_2
                }}
            )
    
    # Get updated match
    updated_match = db.matches.find_one({"_id": ObjectId(id)})
    
    # Invalidate caches after updating a match
    print(f"🗑️  Invalidating points table and dashboard cache after match update")
    await invalidate_points_table_cache()
    await invalidate_dashboard_cache()
    
    return match_helper(updated_match)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_match(id: str):
    """Delete a match by MongoDB ObjectId"""
    db = get_database()
    
    # Validate ObjectId format
    if not ObjectId.is_valid(id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ObjectId format: '{id}'"
        )
    
    # Find and delete the match
    result = db.matches.delete_one({"_id": ObjectId(id)})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Match with id '{id}' not found"
        )
    
    # Invalidate caches after deleting a match
    print(f"🗑️  Invalidating points table and dashboard cache after match deletion")
    await invalidate_points_table_cache()
    await invalidate_dashboard_cache()
    
    return None


