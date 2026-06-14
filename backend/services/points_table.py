from backend.database import get_database
from bson import ObjectId
from typing import List, Dict, Any, Optional


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
    
    # Get subteams with optional event filter
    subteams = list(db.subteams.find(query))
    
    # Format response
    table_entries = []
    for subteam in subteams:
        # Generate team name from team and subteam_id
        team_name = f"{subteam.get('team', 'Unknown')}-{subteam.get('subteam_id', 0)}"
        
        # Fetch player names
        player_names = []
        for player_id in subteam.get("player_ids", []):
            try:
                player = db.players.find_one({"_id": ObjectId(player_id)})
                if player:
                    player_names.append(player.get("player_name", "Unknown"))
                else:
                    player_names.append("Unknown")
            except:
                player_names.append("Unknown")
        
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
    
    return table_entries

