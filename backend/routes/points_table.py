from fastapi import APIRouter, Query
from backend.services.points_table import calculate_points_table
from backend.cache import get_cached, set_cached, points_table_cache_key
from typing import List, Dict, Any, Optional

router = APIRouter(prefix="/points-table", tags=["points-table"])


@router.get("/", response_model=List[Dict[str, Any]])
async def get_points_table(event: Optional[str] = Query(None, description="Filter by event name")):
    """
    Get the current points table/standings.
    
    Calculates standings dynamically from all played matches.
    Uses Redis caching with 5-minute TTL for performance.
    
    Returns sorted list by:
    1. Points (descending)
    2. Goal Difference (descending)
    3. Goals Scored (descending)
    
    Rules:
    - Win = 3 points
    - Loss = 0 points
    """
    # Try to get from cache
    cache_key = points_table_cache_key(event)
    print(f"🔍 Looking up cache key: {cache_key}")
    cached_data = await get_cached(cache_key)
    
    if cached_data is not None:
        print(f"✅ Cache HIT for key: {cache_key}")
        return cached_data
    
    # Calculate if not in cache
    print(f"❌ Cache MISS for key: {cache_key} - calculating from database")
    points_table = calculate_points_table(event)
    
    # Cache the result for 5 minutes (300 seconds)
    await set_cached(cache_key, points_table, ttl=300)
    
    return points_table


