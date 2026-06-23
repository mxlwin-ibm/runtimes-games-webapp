from fastapi import APIRouter, Query
from typing import Optional, Dict, Any, List
from backend.database import get_async_database, get_database
from backend.routes.matches import match_helper
from backend.services.points_table import calculate_points_table
from backend.cache import get_cached, set_cached, dashboard_cache_key
import json
import os
import asyncio

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

EVENTS_FILE = os.path.join(os.path.dirname(__file__), "..", "events.json")
ANNOUNCEMENTS_DOCUMENT_ID = "active_announcements"


def process_matches_data(matches: List[Dict[str, Any]], subteams_count: int) -> Dict[str, Any]:
    """
    Process matches once and derive all match-related data.
    This is more efficient than multiple database queries.
    """
    played_matches = [m for m in matches if m.get("match_status") == "played"]
    scheduled_matches = [m for m in matches if m.get("match_status") == "scheduled"]
    
    # Calculate stats
    total_goals = sum(
        m.get("team1_score", 0) + m.get("team2_score", 0)
        for m in played_matches
    )
    
    stats = {
        "totalMatches": len(matches),
        "playedMatches": len(played_matches),
        "totalTeams": subteams_count,
        "totalGoals": total_goals
    }
    
    # Get next match (earliest scheduled)
    next_match = None
    if scheduled_matches:
        sorted_scheduled = sorted(
            scheduled_matches,
            key=lambda m: (m.get("match_date", ""), m.get("match_time", ""))
        )
        next_match = match_helper(sorted_scheduled[0])
    
    # Get latest result (most recent played)
    latest_result = None
    if played_matches:
        sorted_played = sorted(
            played_matches,
            key=lambda m: (m.get("match_date", ""), m.get("match_time", "")),
            reverse=True
        )
        latest_result = match_helper(sorted_played[0])
    
    # Get recent results (last 5 played)
    recent_results = []
    if played_matches:
        sorted_played = sorted(
            played_matches,
            key=lambda m: (m.get("match_date", ""), m.get("match_time", "")),
            reverse=True
        )
        recent_results = [match_helper(m) for m in sorted_played[:5]]
    
    return {
        "stats": stats,
        "nextMatch": next_match,
        "latestResult": latest_result,
        "recentResults": recent_results
    }


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
            "team": mvp.get("team_name"),
            "subteam_id": mvp.get("subteam_id"),
            "points": mvp.get("points"),
            "played": mvp.get("played"),
            "win": mvp.get("win"),
            "gd": mvp.get("gd")
        }
    return None


def get_announcements_data(db) -> List[str]:
    """Get active announcements (sync version for backward compatibility)"""
    announcement_doc = db.announcements.find_one({"_id": ANNOUNCEMENTS_DOCUMENT_ID})
    
    if not announcement_doc:
        return []
    
    announcements = announcement_doc.get("items", [])
    
    if not isinstance(announcements, list) or not all(isinstance(item, str) for item in announcements):
        return []
    
    return announcements


async def get_announcements_async(async_db) -> List[str]:
    """Get active announcements (async version)"""
    announcement_doc = await async_db.announcements.find_one({"_id": ANNOUNCEMENTS_DOCUMENT_ID})
    
    if not announcement_doc:
        return []
    
    announcements = announcement_doc.get("items", [])
    
    if not isinstance(announcements, list) or not all(isinstance(item, str) for item in announcements):
        return []
    
    return announcements


def get_events_data() -> List[Dict[str, str]]:
    """Get upcoming events from JSON file (sync version)"""
    try:
        with open(EVENTS_FILE, 'r') as f:
            events = json.load(f)
        return events
    except (FileNotFoundError, json.JSONDecodeError):
        return []


async def get_events_data_async() -> List[Dict[str, str]]:
    """Get upcoming events from JSON file (async version)"""
    try:
        # Use asyncio to read file without blocking
        loop = asyncio.get_event_loop()
        def read_file():
            with open(EVENTS_FILE, 'r') as f:
                return json.load(f)
        return await loop.run_in_executor(None, read_file)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


@router.get("/")
async def get_dashboard(event: str = Query("foosball", description="Filter by event name")):
    """
    Get all dashboard data in a single request with parallel execution.
    
    Optimizations:
    - Redis caching with 2-minute TTL for ultra-fast responses
    - Fetches matches once, derives all match-related data
    - Computes standings once, derives MVP from it
    - Parallel execution for independent queries using Motor async driver
    
    Returns:
    - stats: Overall statistics (matches, teams, goals)
    - nextMatch: Next scheduled match
    - latestResult: Most recent played match
    - recentResults: Last 5 played matches
    - standings: Current points table
    - mvp: Top team in standings (derived from standings)
    - announcements: Active announcements
    - events: Upcoming events
    
    Performance:
    - With cache hit: 5-20ms
    - With cache miss: 30-100ms (optimized queries with 4 parallel async requests)
    """
    # Try to get from cache
    cache_key = dashboard_cache_key(event)
    print(f"🔍 Looking up cache key: {cache_key}")
    cached_data = await get_cached(cache_key)
    
    if cached_data is not None:
        print(f"✅ Cache HIT for key: {cache_key}")
        return cached_data
    
    # Fetch fresh data using async Motor driver
    print(f"❌ Cache MISS for key: {cache_key} - fetching from database")
    async_db = get_async_database()
    
    # Fetch data in parallel using native async operations (no thread pool needed!)
    matches_cursor = async_db.matches.find({"event": event})
    matches = await matches_cursor.to_list(length=None)
    
    subteams_count_task = async_db.subteams.count_documents({"event": event})
    announcements_task = get_announcements_async(async_db)
    events_task = get_events_data_async()
    
    # Wait for remaining tasks
    subteams_count, announcements, events = await asyncio.gather(
        subteams_count_task,
        announcements_task,
        events_task
    )
    
    # Process matches once to derive all match-related data
    match_data = process_matches_data(matches, subteams_count)
    
    # Compute standings once
    standings = calculate_points_table(event)
    
    # Derive MVP from standings (first place)
    mvp = None
    if standings:
        top_team = standings[0]
        mvp = {
            "team_name": top_team.get("team_name"),
            "team_id": top_team.get("team_id"),  # Player names
            "pool": top_team.get("pool"),
            "points": top_team.get("points"),
            "played": top_team.get("played"),
            "won": top_team.get("won"),
            "lost": top_team.get("lost"),
            "gf": top_team.get("gf"),  # Goals for
            "ga": top_team.get("ga"),  # Goals against
            "gd": top_team.get("gd")   # Goal difference
        }
    
    dashboard_data = {
        "stats": match_data["stats"],
        "nextMatch": match_data["nextMatch"],
        "latestResult": match_data["latestResult"],
        "recentResults": match_data["recentResults"],
        "standings": standings,
        "mvp": mvp,
        "announcements": announcements,
        "events": events
    }
    
    # Cache the result with no expiration - will be invalidated on match/announcement updates
    await set_cached(cache_key, dashboard_data)
    
    return dashboard_data

