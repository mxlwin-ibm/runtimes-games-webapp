from fastapi import APIRouter, HTTPException
from typing import List, Any, Union
from backend.database import get_database
from backend.cache import get_cached, set_cached, invalidate_announcements_cache, invalidate_dashboard_cache, announcements_cache_key

router = APIRouter(prefix="/announcements", tags=["announcements"])

ANNOUNCEMENTS_DOCUMENT_ID = "active_announcements"


@router.get("/", response_model=List[Any])
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
        
        if not isinstance(announcements, list):
            raise HTTPException(status_code=500, detail="Invalid announcements data in database")
    
    # Cache the result with no expiration - will be invalidated on updates
    await set_cached(cache_key, announcements)
    
    return announcements


@router.put("/")
async def update_announcements(announcements: List[Any]):
    """Update all announcements (admin only)"""
    db = get_database()

    sanitized_announcements = []
    for a in announcements:
        if isinstance(a, str) and a.strip():
            sanitized_announcements.append(a.strip())
        elif isinstance(a, dict) and a.get("text"):
            sanitized_announcements.append({
                "text": str(a.get("text", "")).strip(),
                "category": str(a.get("category", "general")),
                "link": str(a.get("link", "")).strip() if a.get("link") else None,
                "linkText": str(a.get("linkText", "")).strip() if a.get("linkText") else None,
            })

    try:
        db.announcements.update_one(
            {"_id": ANNOUNCEMENTS_DOCUMENT_ID},
            {"$set": {"items": sanitized_announcements}},
            upsert=True
        )
        
        # Invalidate both announcements and dashboard cache after update
        print(f"🗑️  Invalidating announcements and dashboard cache")
        await invalidate_announcements_cache()
        await invalidate_dashboard_cache()
        
        return {"message": "Announcements updated successfully", "count": len(sanitized_announcements)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update announcements: {str(e)}")

