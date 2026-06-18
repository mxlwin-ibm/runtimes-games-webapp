from fastapi import APIRouter, HTTPException
from typing import List
import json
import os

router = APIRouter(prefix="/announcements", tags=["announcements"])

# Path to announcements.json file
ANNOUNCEMENTS_FILE = os.path.join(os.path.dirname(__file__), "..", "announcements.json")


@router.get("/", response_model=List[str])
def get_announcements():
    """Get all active announcements from JSON file"""
    try:
        with open(ANNOUNCEMENTS_FILE, 'r') as f:
            announcements = json.load(f)
        return announcements
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Announcements file not found")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid JSON in announcements file")


@router.put("/")
def update_announcements(announcements: List[str]):
    """Update all announcements (admin only)"""
    try:
        # Validate that all items are strings
        if not all(isinstance(a, str) for a in announcements):
            raise HTTPException(status_code=400, detail="All announcements must be strings")
        
        # Write to JSON file
        with open(ANNOUNCEMENTS_FILE, 'w') as f:
            json.dump(announcements, f, indent=2)
        
        return {"message": "Announcements updated successfully", "count": len(announcements)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update announcements: {str(e)}")

