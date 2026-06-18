from datetime import datetime, timedelta
from typing import Optional, Any, Dict
import threading


class SimpleCache:
    """Simple in-memory cache with TTL support and metrics tracking"""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()
        self._hits = 0
        self._misses = 0
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        with self._lock:
            if key not in self._cache:
                self._misses += 1
                return None
            
            cache_entry = self._cache[key]
            if datetime.now() > cache_entry["expires_at"]:
                # Cache expired, remove it
                del self._cache[key]
                self._misses += 1
                return None
            
            self._hits += 1
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
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get cache performance metrics"""
        with self._lock:
            total_requests = self._hits + self._misses
            hit_rate = (self._hits / total_requests * 100) if total_requests > 0 else 0
            
            return {
                "hits": self._hits,
                "misses": self._misses,
                "total_requests": total_requests,
                "hit_rate_percent": round(hit_rate, 2),
                "cached_keys": len(self._cache)
            }
    
    def reset_metrics(self):
        """Reset cache metrics counters"""
        with self._lock:
            self._hits = 0
            self._misses = 0


# Global cache instance
cache = SimpleCache()

