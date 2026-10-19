from fastapi import APIRouter, Query
from typing import Optional, Dict, Any, List
from backend.database import get_async_database, get_database
from backend.routes.matches import match_helper
from backend.services.points_table import calculate_points_table
from backend.cache import get_cached, set_cached, dashboard_cache_key, invalidate_dashboard_cache
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
    
    # Get next match (earliest scheduled, ignoring undated matches unless all are undated)
    next_match = None
    if scheduled_matches:
        # Use a sentinel that sorts after all real dates so undated matches come last
        _MAX_DATE = "9999-99-99"
        sorted_scheduled = sorted(
            scheduled_matches,
            key=lambda m: (m.get("match_date") or _MAX_DATE, m.get("match_time") or "")
        )
        next_match = match_helper(sorted_scheduled[0])
    
    # Get latest result (most recent played)
    latest_result = None
    if played_matches:
        sorted_played = sorted(
            played_matches,
            key=lambda m: (m.get("match_date") or "", m.get("match_time") or ""),
            reverse=True
        )
        latest_result = match_helper(sorted_played[0])
    
    # Get recent results (last 5 played)
    recent_results = []
    if played_matches:
        sorted_played = sorted(
            played_matches,
            key=lambda m: (m.get("match_date") or "", m.get("match_time") or ""),
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
    """Get the next scheduled match — prefer dated matches over undated ones"""
    # First try matches that have a date so undated entries don't float to the top
    next_match = db.matches.find_one(
        {"event": event, "match_status": "scheduled", "match_date": {"$ne": None}},
        sort=[("match_date", 1), ("match_time", 1)]
    )
    if next_match is None:
        # Fall back to any scheduled match if all are undated
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


def build_mvp(event: str) -> Optional[Dict[str, Any]]:
    """Top subteam by stats across league AND playoff matches."""
    standings = calculate_points_table(event, include_playoffs=True)
    if not standings:
        return None
    top_entry = standings[0]
    return {
        "team_name": top_entry.get("team_name", "Unknown"),
        "team_id": top_entry.get("team_id", "No players"),
        "pool": top_entry.get("pool", "A"),
        "points": top_entry.get("points", 0),
        "played": top_entry.get("played", 0),
        "won": top_entry.get("won", 0),
        "lost": top_entry.get("lost", 0),
        "gf": top_entry.get("gf", 0),
        "ga": top_entry.get("ga", 0),
        "gd": top_entry.get("gd", 0)
    }


def get_mvp(db, event: str = "foosball") -> Optional[Dict[str, Any]]:
    """Get MVP (top subteam, including playoff match stats)"""
    return build_mvp(event)


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
    
    if not isinstance(announcements, list):
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


async def get_events_data_async(async_db) -> List[Dict[str, Any]]:
    """Get active upcoming events from MongoDB collection"""
    try:
        events_cursor = async_db.events.find({"is_active": {"$ne": False}}).sort([("order", 1), ("_id", 1)])
        events = await events_cursor.to_list(length=None)
        if not events:
            if os.path.exists(EVENTS_FILE):
                try:
                    with open(EVENTS_FILE, 'r') as f:
                        return json.load(f)
                except Exception:
                    pass
            return []

        return [
            {
                "_id": str(e.get("_id")),
                "event": str(e.get("event", "")),
                "month": str(e.get("month", "")),
                "description": e.get("description"),
                "status": e.get("status", "upcoming"),
                "order": int(e.get("order", 0)),
                "is_active": bool(e.get("is_active", True))
            }
            for e in events
        ]
    except Exception as err:
        print(f"Error fetching upcoming events from MongoDB: {err}")
        return []


@router.delete("/cache", status_code=204)
async def clear_dashboard_cache(event: Optional[str] = Query(None, description="Clear cache for a specific event, or all if omitted")):
    """Manually clear the dashboard cache (admin use). Clears all event caches or a specific one."""
    if event:
        from backend.cache import delete_cached
        await delete_cached(dashboard_cache_key(event.lower()))
    else:
        await invalidate_dashboard_cache()


@router.get("/cache/metrics")
async def get_cache_metrics():
    """Return basic cache health info."""
    from backend.cache import get_redis
    client = get_redis()
    if not client:
        return {"cache": "disabled"}
    try:
        keys = client.keys("dashboard:*")
        return {"cache": "enabled", "dashboard_keys": len(keys), "keys": keys}
    except Exception as e:
        return {"cache": "error", "detail": str(e)}


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
    
    # Fetch data in parallel using native async operations
    all_matches_cursor = async_db.matches.find({})
    all_matches_task = all_matches_cursor.to_list(length=None)
    
    all_subteams_cursor = async_db.subteams.find({})
    all_subteams_task = all_subteams_cursor.to_list(length=None)
    
    announcements_task = get_announcements_async(async_db)
    events_task = get_events_data_async(async_db)
    
    # Wait for all tasks
    all_matches, all_subteams, announcements, events = await asyncio.gather(
        all_matches_task,
        all_subteams_task,
        announcements_task,
        events_task
    )
    
    # Group matches and subteams by event
    from collections import defaultdict
    matches_by_event = defaultdict(list)
    for m in all_matches:
        ev_name = m.get("event", "foosball").lower()
        matches_by_event[ev_name].append(m)
        
    subteams_count_by_event = defaultdict(int)
    for s in all_subteams:
        ev_name = s.get("event", "foosball").lower()
        subteams_count_by_event[ev_name] += 1
    
    # Find all ongoing events that have matches or subteams registered
    ongoing_event_names = set(matches_by_event.keys()) | set(subteams_count_by_event.keys())
    if event.lower() not in ongoing_event_names:
        ongoing_event_names.add(event.lower())
    if not ongoing_event_names:
        ongoing_event_names = {"foosball"}
    
    sorted_ongoing_event_names = sorted(list(ongoing_event_names))
    
    # Process each ongoing event, skipping events whose final has been played
    ongoing_events_data = []
    for ev in sorted_ongoing_event_names:
        ev_matches = matches_by_event.get(ev, [])
        ev_subteams_count = subteams_count_by_event.get(ev, 0)

        # Skip events where all final matches have been played (tournament complete)
        final_matches = [m for m in ev_matches if m.get("match_type") == "final"]
        if final_matches and all(m.get("match_status") == "played" for m in final_matches):
            continue

        ev_match_data = process_matches_data(ev_matches, ev_subteams_count)
        ev_standings = calculate_points_table(ev)
        ev_mvp = build_mvp(ev)

        ongoing_events_data.append({
            "event": ev,
            "stats": ev_match_data["stats"],
            "nextMatch": ev_match_data["nextMatch"],
            "latestResult": ev_match_data["latestResult"],
            "recentResults": ev_match_data["recentResults"],
            "standings": ev_standings,
            "mvp": ev_mvp
        })
    
    # Select event-specific data (or fallback to first ongoing event)
    selected_event_lower = event.lower()
    selected_event_data = next(
        (ed for ed in ongoing_events_data if ed["event"] == selected_event_lower),
        ongoing_events_data[0] if ongoing_events_data else None
    )
    
    if selected_event_data:
        stats = selected_event_data["stats"]
        next_match = selected_event_data["nextMatch"]
        latest_result = selected_event_data["latestResult"]
        recent_results = selected_event_data["recentResults"]
        standings = selected_event_data["standings"]
        mvp = selected_event_data["mvp"]
    else:
        matches = matches_by_event.get(selected_event_lower, [])
        subteams_count = subteams_count_by_event.get(selected_event_lower, 0)
        match_data = process_matches_data(matches, subteams_count)
        stats = match_data["stats"]
        next_match = match_data["nextMatch"]
        latest_result = match_data["latestResult"]
        recent_results = match_data["recentResults"]
        standings = calculate_points_table(selected_event_lower)
        mvp = build_mvp(selected_event_lower)
    
    dashboard_data = {
        "event": selected_event_lower,
        "stats": stats,
        "nextMatch": next_match,
        "latestResult": latest_result,
        "recentResults": recent_results,
        "standings": standings,
        "mvp": mvp,
        "ongoingEvents": ongoing_events_data,
        "announcements": announcements,
        "events": events
    }
    
    # Cache the result with no expiration - will be invalidated on match/announcement updates
    await set_cached(cache_key, dashboard_data)
    
    return dashboard_data

