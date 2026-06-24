from backend.database import get_database
from bson import ObjectId
from typing import List, Dict, Any, Optional
import logging
import time


logger = logging.getLogger(__name__)


def calculate_points_table(event: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Calculate points table from LEAGUE matches only (excludes playoff matches).
    
    Args:
        event: Optional event name to filter by
    
    Returns sorted list by:
    1. Points (descending)
    2. Goal Difference (descending)
    3. Goals Scored (descending)
    """
    db = get_database()
    
    # Build query filter for subteams
    subteams_query = {}
    if event:
        subteams_query["event"] = event
    
    endpoint_start = time.perf_counter()

    # Get all subteams
    subteams_query_start = time.perf_counter()
    subteams = list(db.subteams.find(subteams_query))
    subteams_query_ms = (time.perf_counter() - subteams_query_start) * 1000

    # Get all LEAGUE matches only (exclude playoff matches)
    matches_query_start = time.perf_counter()
    matches_query = {"match_status": "played", "match_type": "league"}
    if event:
        matches_query["event"] = event
    matches = list(db.matches.find(matches_query))
    matches_query_ms = (time.perf_counter() - matches_query_start) * 1000

    # Calculate statistics from league matches only
    stats_calc_start = time.perf_counter()
    subteam_stats = {}
    
    for match in matches:
        team1 = match.get("team1")
        team1_subid = match.get("team1_subid")
        team2 = match.get("team2")
        team2_subid = match.get("team2_subid")
        team1_score = match.get("team1_score", 0)
        team2_score = match.get("team2_score", 0)
        
        # Create unique keys for each subteam
        team1_key = f"{team1}_{team1_subid}"
        team2_key = f"{team2}_{team2_subid}"
        
        # Initialize stats if not exists
        if team1_key not in subteam_stats:
            subteam_stats[team1_key] = {
                "played": 0, "won": 0, "lost": 0,
                "gf": 0, "ga": 0, "gd": 0, "points": 0
            }
        if team2_key not in subteam_stats:
            subteam_stats[team2_key] = {
                "played": 0, "won": 0, "lost": 0,
                "gf": 0, "ga": 0, "gd": 0, "points": 0
            }
        
        # Update team1 stats
        subteam_stats[team1_key]["played"] += 1
        subteam_stats[team1_key]["gf"] += team1_score
        subteam_stats[team1_key]["ga"] += team2_score
        if team1_score > team2_score:
            subteam_stats[team1_key]["won"] += 1
            subteam_stats[team1_key]["points"] += 3
        elif team1_score < team2_score:
            subteam_stats[team1_key]["lost"] += 1
        
        # Update team2 stats
        subteam_stats[team2_key]["played"] += 1
        subteam_stats[team2_key]["gf"] += team2_score
        subteam_stats[team2_key]["ga"] += team1_score
        if team2_score > team1_score:
            subteam_stats[team2_key]["won"] += 1
            subteam_stats[team2_key]["points"] += 3
        elif team2_score < team1_score:
            subteam_stats[team2_key]["lost"] += 1
    
    # Calculate goal difference
    for stats in subteam_stats.values():
        stats["gd"] = stats["gf"] - stats["ga"]
    
    stats_calc_ms = (time.perf_counter() - stats_calc_start) * 1000

    # Lookup player names
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

    # Format response with calculated league stats
    table_entries = []
    for subteam in subteams:
        team = subteam.get('team', 'Unknown')
        subteam_id = subteam.get('subteam_id', 0)
        team_name = f"{team}-{subteam_id}"
        team_key = f"{team}_{subteam_id}"

        player_names = [
            players_by_id.get(str(player_id), {}).get("player_name", "Unknown")
            for player_id in subteam.get("player_ids", [])
        ]

        # Join player names with comma
        players_display = ", ".join(player_names) if player_names else "No players"

        # Get stats from calculated league matches only
        stats = subteam_stats.get(team_key, {
            "played": 0, "won": 0, "lost": 0,
            "gf": 0, "ga": 0, "gd": 0, "points": 0
        })

        entry = {
            "team_id": players_display,  # Display player names instead of ID
            "team_name": team_name,
            "pool": subteam.get("pool", "A"),  # Include pool field for frontend filtering
            "played": stats["played"],
            "won": stats["won"],
            "lost": stats["lost"],
            "gf": stats["gf"],
            "ga": stats["ga"],
            "gd": stats["gd"],
            "points": stats["points"]
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
        "calculate_points_table timing event=%s subteams_query_ms=%.2f matches_query_ms=%.2f stats_calc_ms=%.2f player_lookup_ms=%.2f total_ms=%.2f subteams_count=%d league_matches_count=%d unique_player_count=%d",
        event,
        subteams_query_ms,
        matches_query_ms,
        stats_calc_ms,
        player_lookup_ms,
        total_ms,
        len(subteams),
        len(matches),
        len(unique_player_ids),
    )

    return table_entries

