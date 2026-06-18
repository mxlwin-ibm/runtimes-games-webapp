from fastapi import APIRouter, HTTPException
from typing import List
from pydantic import BaseModel
from backend.utils.cache import cache
import json
import os

router = APIRouter(prefix="/events", tags=["events"])

# Path to events.json file
EVENTS_FILE = os.path.join(os.path.dirname(__file__), "..", "events.json")


class Event(BaseModel):
    """Event model with event name and month"""
    event: str
    month: str


@router.get("/", response_model=List[Event])
def get_events():
    """Get all upcoming events from JSON file"""
    try:
        with open(EVENTS_FILE, 'r') as f:
            events = json.load(f)
        return events
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Events file not found")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid JSON in events file")


@router.put("/")
def update_events(events: List[Event]):
    """Update all upcoming events (admin only)"""
    try:
        # Convert Pydantic models to dictionaries
        events_data = [event.dict() for event in events]
        
        # Write to JSON file
        with open(EVENTS_FILE, 'w') as f:
            json.dump(events_data, f, indent=2)
        
        # Auto-invalidate all dashboard caches since events are global
        cache.clear()
        
        return {"message": "Events updated successfully", "count": len(events_data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update events: {str(e)}")

# Made with Bob
