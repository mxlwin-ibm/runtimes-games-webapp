from fastapi import APIRouter
from backend.services.points_table import calculate_points_table
from typing import List, Dict, Any

router = APIRouter(prefix="/points-table", tags=["points-table"])


@router.get("/", response_model=List[Dict[str, Any]])
def get_points_table():
    """
    Get the current points table/standings.
    
    Calculates standings dynamically from all played matches.
    
    Returns sorted list by:
    1. Points (descending)
    2. Goal Difference (descending)
    3. Goals Scored (descending)
    
    Rules:
    - Win = 3 points
    - Loss = 0 points
    """
    return calculate_points_table()


