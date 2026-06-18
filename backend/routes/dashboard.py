from fastapi import APIRouter, Query
from typing import Optional, Dict, Any, List
from backend.database import get_database
from backend.routes.matches import match_helper
from backend.services.points_table import calculate_points_table
import json
import os

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

EVENTS_FILE = os.path.join(os.path.dirname(__file__), "..", "events.json")
ANNOUNCEMENTS_DOCUMENT_ID = "active_announcements"


def get_stats(db, event: str = "foosball") -> Dict[str, Any]:
    """Calculate dashboard statistics"""
    # Get all matches for the event
    all_matches = list(db.matches.find({"event": event}))
    played_matches = [m for m in all_matches if m.get("match_status") == "played"]
    
    # Get all subteams for the event
    subteams = list(db.subteams.find({"event": event}))
    
    # Calculate total goals
    total_goals = sum(
        m.get("team1_score", 0) + m.get("team2_score", 0) 
        for m in played_matches
    )
    
    return {
        "totalMatches": len(all_matches),
        "playedMatches": len(played_matches),
        "totalTeams": len(subteams),
        "totalGoals": total_goals
    }


def get_next_match(db, event: str = "foosball") -> Optional[Dict[str, Any]]:
    """Get the next scheduled match"""
    next_match = db.matches.find_one(
        {"event": event, "match_status": "scheduled"},
        sort=[("match_date", 1), ("match_time", 1)]
    )
    
    if next_match:
        return match_helper(next_match)
    return None


def get_latest_result(db, event: str = "foosball") -> Optional[Dict[str, Any]]:
    """Get the most recent played match"""
    latest_match = db.matches.find_one(
        {"event": event, "match_status": "played"},
        sort=[("match_date", -1), ("match_time", -1)]
    )
    
    if latest_match:
        return match_helper(latest_match)
    return None


def get_recent_results(db, event: str = "foosball", limit: int = 5) -> List[Dict[str, Any]]:
    """Get recent played matches"""
    recent_matches = db.matches.find(
        {"event": event, "match_status": "played"},
        sort=[("match_date", -1), ("match_time", -1)]
    ).limit(limit)
    
    return [match_helper(match) for match in recent_matches]


def get_mvp(db, event: str = "foosball") -> Optional[Dict[str, Any]]:
    """Get MVP (subteam with most points)"""
    standings = calculate_points_table(event)
    
    if standings:
        mvp = standings[0]  # First in standings
        return {
            "team": mvp.get("team"),
            "subteam_id": mvp.get("subteam_id"),
            "points": mvp.get("points"),
            "played": mvp.get("played"),
            "win": mvp.get("win"),
            "gd": mvp.get("gd")
        }
    return None


def get_announcements_data(db) -> List[str]:
    """Get active announcements"""
    announcement_doc = db.announcements.find_one({"_id": ANNOUNCEMENTS_DOCUMENT_ID})
    
    if not announcement_doc:
        return []
    
    announcements = announcement_doc.get("items", [])
    
    if not isinstance(announcements, list) or not all(isinstance(item, str) for item in announcements):
        return []
    
    return announcements


def get_events_data() -> List[Dict[str, str]]:
    """Get upcoming events from JSON file"""
    try:
        with open(EVENTS_FILE, 'r') as f:
            events = json.load(f)
        return events
    except (FileNotFoundError, json.JSONDecodeError):
        return []


@router.get("/")
def get_dashboard(event: str = Query("foosball", description="Filter by event name")):
    """
    Get all dashboard data in a single request.
    
    Returns:
    - stats: Overall statistics (matches, teams, goals)
    - nextMatch: Next scheduled match
    - latestResult: Most recent played match
    - recentResults: Last 5 played matches
    - standings: Current points table
    - mvp: Top team in standings
    - announcements: Active announcements
    - events: Upcoming events
    """
    db = get_database()
    
    return {
        "stats": get_stats(db, event),
        "nextMatch": get_next_match(db, event),
        "latestResult": get_latest_result(db, event),
        "recentResults": get_recent_results(db, event, limit=5),
        "standings": calculate_points_table(event),
        "mvp": get_mvp(db, event),
        "announcements": get_announcements_data(db),
        "events": get_events_data()
    }

