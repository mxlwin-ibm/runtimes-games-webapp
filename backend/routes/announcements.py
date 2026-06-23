from fastapi import APIRouter, HTTPException
from typing import List
from backend.database import get_database
from backend.cache import get_cached, set_cached, invalidate_announcements_cache, announcements_cache_key

router = APIRouter(prefix="/announcements", tags=["announcements"])

ANNOUNCEMENTS_DOCUMENT_ID = "active_announcements"


@router.get("/", response_model=List[str])
async def get_announcements():
    """
    Get all active announcements from MongoDB.
    Uses Redis caching with 5-minute TTL for performance.
    """
    # Try to get from cache
    cache_key = announcements_cache_key(active_only=True)
    print(f"🔍 Looking up cache key: {cache_key}")
    cached_data = await get_cached(cache_key)
    
    if cached_data is not None:
        print(f"✅ Cache HIT for key: {cache_key}")
        return cached_data
    
    # Fetch from database if not in cache
    print(f"❌ Cache MISS for key: {cache_key} - fetching from database")
    db = get_database()
    announcement_doc = db.announcements.find_one({"_id": ANNOUNCEMENTS_DOCUMENT_ID})

    if not announcement_doc:
        announcements = []
    else:
        announcements = announcement_doc.get("items", [])
        
        if not isinstance(announcements, list) or not all(isinstance(item, str) for item in announcements):
            raise HTTPException(status_code=500, detail="Invalid announcements data in database")
    
    # Cache the result with no expiration - will be invalidated on updates
    await set_cached(cache_key, announcements)
    
    return announcements


@router.put("/")
async def update_announcements(announcements: List[str]):
    """Update all announcements (admin only)"""
    db = get_database()

    if not all(isinstance(a, str) for a in announcements):
        raise HTTPException(status_code=400, detail="All announcements must be strings")

    sanitized_announcements = [announcement.strip() for announcement in announcements if announcement.strip()]

    try:
        db.announcements.update_one(
            {"_id": ANNOUNCEMENTS_DOCUMENT_ID},
            {"$set": {"items": sanitized_announcements}},
            upsert=True
        )
        
        # Invalidate cache after update
        print(f"🗑️  Invalidating announcements cache")
        await invalidate_announcements_cache()
        
        return {"message": "Announcements updated successfully", "count": len(sanitized_announcements)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update announcements: {str(e)}")

