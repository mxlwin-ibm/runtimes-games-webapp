from fastapi import APIRouter, HTTPException
from typing import List
from backend.database import get_database
from backend.utils.cache import cache

router = APIRouter(prefix="/announcements", tags=["announcements"])

ANNOUNCEMENTS_DOCUMENT_ID = "active_announcements"


@router.get("/", response_model=List[str])
def get_announcements():
    """Get all active announcements from MongoDB"""
    db = get_database()

    announcement_doc = db.announcements.find_one({"_id": ANNOUNCEMENTS_DOCUMENT_ID})

    if not announcement_doc:
        return []

    announcements = announcement_doc.get("items", [])

    if not isinstance(announcements, list) or not all(isinstance(item, str) for item in announcements):
        raise HTTPException(status_code=500, detail="Invalid announcements data in database")

    return announcements


@router.put("/")
def update_announcements(announcements: List[str]):
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
        
        # Auto-invalidate all dashboard caches since announcements are global
        cache.clear()
        
        return {"message": "Announcements updated successfully", "count": len(sanitized_announcements)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update announcements: {str(e)}")

