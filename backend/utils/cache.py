from datetime import datetime, timedelta
from typing import Optional, Any, Dict
import threading


class SimpleCache:
    """Simple in-memory cache with TTL support"""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        with self._lock:
            if key not in self._cache:
                return None
            
            cache_entry = self._cache[key]
            if datetime.now() > cache_entry["expires_at"]:
                # Cache expired, remove it
                del self._cache[key]
                return None
            
            return cache_entry["value"]
    
    def set(self, key: str, value: Any, ttl_seconds: int = 30):
        """Set value in cache with TTL in seconds"""
        with self._lock:
            self._cache[key] = {
                "value": value,
                "expires_at": datetime.now() + timedelta(seconds=ttl_seconds)
            }
    
    def clear(self):
        """Clear all cache entries"""
        with self._lock:
            self._cache.clear()
    
    def delete(self, key: str):
        """Delete specific cache entry"""
        with self._lock:
            if key in self._cache:
                del self._cache[key]


# Global cache instance
cache = SimpleCache()

