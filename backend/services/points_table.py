from backend.database import get_database
from typing import List, Dict, Any


def calculate_points_table() -> List[Dict[str, Any]]:
    """
    Get points table from teams database.
    
    Returns sorted list by:
    1. Points (descending)
    2. Goal Difference (descending)
    3. Goals Scored (descending)
    """
    db = get_database()
    
    # Get all teams
    teams = list(db.teams.find())
    
    # Format response
    table_entries = []
    for team in teams:
        entry = {
            "team_id": team["team_id"],
            "team_name": team["team_name"],
            "played": team.get("win", 0) + team.get("loss", 0),
            "won": team.get("win", 0),
            "lost": team.get("loss", 0),
            "gf": team.get("gf", 0),
            "ga": team.get("ga", 0),
            "gd": team.get("gd", "+0"),
            "points": team.get("points", 0)
        }
        table_entries.append(entry)
    
    # Sort by: 1. Points (desc), 2. Goal Difference (desc), 3. Goals Scored (desc)
    table_entries.sort(
        key=lambda x: (
            -x["points"],
            -int(x["gd"]),  # Parse gd string to int for sorting
            -x["gf"]
        )
    )
    
    return table_entries

