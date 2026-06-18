from backend.database import get_database
from bson import ObjectId
from typing import List, Dict, Any, Optional
import logging
import time


logger = logging.getLogger(__name__)


def calculate_points_table(event: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get points table from subteams database.
    
    Args:
        event: Optional event name to filter by
    
    Returns sorted list by:
    1. Points (descending)
    2. Goal Difference (descending)
    3. Goals Scored (descending)
    """
    db = get_database()
    
    # Build query filter
    query = {}
    if event:
        query["event"] = event
    
    endpoint_start = time.perf_counter()

    subteams_query_start = time.perf_counter()
    subteams = list(db.subteams.find(query))
    subteams_query_ms = (time.perf_counter() - subteams_query_start) * 1000

    player_lookup_start = time.perf_counter()
    unique_player_ids = []
    seen_player_ids = set()
    for subteam in subteams:
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

    # Format response
    table_entries = []
    for subteam in subteams:
        # Generate team name from team and subteam_id
        team_name = f"{subteam.get('team', 'Unknown')}-{subteam.get('subteam_id', 0)}"

        player_names = [
            players_by_id.get(str(player_id), {}).get("player_name", "Unknown")
            for player_id in subteam.get("player_ids", [])
        ]

        # Join player names with comma
        players_display = ", ".join(player_names) if player_names else "No players"

        entry = {
            "team_id": players_display,  # Display player names instead of ID
            "team_name": team_name,
            "pool": subteam.get("pool", "A"),  # Include pool field for frontend filtering
            "played": subteam.get("played", 0),
            "won": subteam.get("win", 0),
            "lost": subteam.get("loss", 0),
            "gf": subteam.get("gf", 0),
            "ga": subteam.get("ga", 0),
            "gd": subteam.get("gd", 0),
            "points": subteam.get("points", 0)
        }
        table_entries.append(entry)
    
    # Sort by: 1. Points (desc), 2. Goal Difference (desc), 3. Goals Scored (desc)
    table_entries.sort(
        key=lambda x: (
            -x["points"],
            -x["gd"],  # gd is already an integer
            -x["gf"]
        )
    )
    
    total_ms = (time.perf_counter() - endpoint_start) * 1000
    logger.info(
        "calculate_points_table timing event=%s subteams_query_ms=%.2f player_lookup_ms=%.2f total_ms=%.2f subteams_count=%d unique_player_count=%d",
        event,
        subteams_query_ms,
        player_lookup_ms,
        total_ms,
        len(subteams),
        len(unique_player_ids),
    )

    return table_entries

