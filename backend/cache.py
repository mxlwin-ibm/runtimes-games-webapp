"""
Redis cache module for Foosball League application.
Provides caching functionality using Upstash Redis.
"""

import json
import os
from typing import Any, Optional
from upstash_redis import Redis

# Global Redis client instance
redis_client: Optional[Redis] = None


def init_redis() -> Optional[Redis]:
    """
    Initialize Redis client with Upstash credentials.
    Returns None if credentials are not configured.
    """
    global redis_client
    
    redis_url = os.getenv("UPSTASH_REDIS_URL")
    redis_token = os.getenv("UPSTASH_REDIS_TOKEN")
    
    if not redis_url or not redis_token:
        print("⚠️  Upstash Redis credentials not configured. Caching disabled.")
        redis_client = None
        return None
    
    try:
        redis_client = Redis(url=redis_url, token=redis_token)
        # Test connection
        redis_client.ping()
        print("✅ Upstash Redis connected successfully")
        return redis_client
    except Exception as e:
        print(f"❌ Failed to connect to Upstash Redis: {e}")
        redis_client = None
        return None


def get_redis() -> Optional[Redis]:
    """Get the Redis client instance."""
    return redis_client


async def get_cached(key: str) -> Optional[Any]:
    """
    Get cached value by key.
    
    Args:
        key: Cache key
        
    Returns:
        Cached value (deserialized from JSON) or None if not found or cache disabled
    """
    if not redis_client:
        return None
    
    try:
        cached = redis_client.get(key)
        if cached is None:
            return None
        
        # Upstash SDK returns string, need to parse JSON
        if isinstance(cached, str):
            try:
                return json.loads(cached)
            except json.JSONDecodeError as je:
                print(f"Cache JSON decode error for key '{key}': {je}")
                print(f"Cached value type: {type(cached)}, value: {cached[:100] if len(str(cached)) > 100 else cached}")
                return None
        
        # If it's already a dict/list, return as-is
        return cached
    except Exception as e:
        print(f"Cache get error for key '{key}': {e}")
        import traceback
        traceback.print_exc()
        return None


async def set_cached(key: str, value: Any, ttl: int = 300) -> bool:
    """
    Set cached value with TTL (time to live).
    
    Args:
        key: Cache key
        value: Value to cache (will be serialized to JSON)
        ttl: Time to live in seconds (default: 300 = 5 minutes)
        
    Returns:
        True if successful, False otherwise
    """
    if not redis_client:
        return False
    
    try:
        # Serialize to JSON string
        serialized = json.dumps(value, default=str)
        
        # Use set() with ex parameter for Upstash SDK
        result = redis_client.set(key, serialized, ex=ttl)
        
        print(f"✅ Cache set successful for key '{key}' (TTL: {ttl}s)")
        return True
    except Exception as e:
        print(f"❌ Cache set error for key '{key}': {e}")
        import traceback
        traceback.print_exc()
        return False


async def delete_cached(key: str) -> bool:
    """
    Delete cached value by key.
    
    Args:
        key: Cache key
        
    Returns:
        True if successful, False otherwise
    """
    if not redis_client:
        return False
    
    try:
        redis_client.delete(key)
        return True
    except Exception as e:
        print(f"Cache delete error for key '{key}': {e}")
        return False


async def delete_pattern(pattern: str) -> bool:
    """
    Delete all keys matching a pattern.
    
    Args:
        pattern: Key pattern (e.g., "points_table:*")
        
    Returns:
        True if successful, False otherwise
    """
    if not redis_client:
        return False
    
    try:
        # Get all keys matching pattern
        keys = redis_client.keys(pattern)
        if keys:
            # Delete all matching keys
            for key in keys:
                redis_client.delete(key)
        return True
    except Exception as e:
        print(f"Cache delete pattern error for pattern '{pattern}': {e}")
        return False


async def invalidate_points_table_cache():
    """Invalidate all points table cache entries."""
    await delete_pattern("points_table:*")


async def invalidate_announcements_cache():
    """Invalidate all announcements cache entries."""
    await delete_pattern("announcements:*")


# Cache key generators
def points_table_cache_key(pool: Optional[str] = None) -> str:
    """Generate cache key for points table."""
    return f"points_table:{pool or 'all'}"


def announcements_cache_key(active_only: bool = False) -> str:
    """Generate cache key for announcements."""
    return f"announcements:{'active' if active_only else 'all'}"


def dashboard_cache_key(event: str = "foosball") -> str:
    """Generate cache key for dashboard."""
    return f"dashboard:{event}"


async def invalidate_dashboard_cache():
    """Invalidate all dashboard cache entries."""
    await delete_pattern("dashboard:*")
