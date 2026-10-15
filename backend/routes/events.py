from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timezone
import os
import json
import logging

from backend.database import get_database
from backend.models.event import EventCreate, EventUpdate, EventResponse, EventReorderItem
from backend.cache import invalidate_dashboard_cache

router = APIRouter(prefix="/events", tags=["events"])
logger = logging.getLogger(__name__)

EVENTS_FILE = os.path.join(os.path.dirname(__file__), "..", "events.json")


def event_helper(doc: dict) -> dict:
    """Convert MongoDB event document to response dictionary"""
    return {
        "_id": str(doc.get("_id")),
        "event": str(doc.get("event", "")),
        "month": str(doc.get("month", "")),
        "description": doc.get("description"),
        "status": doc.get("status", "upcoming"),
        "order": int(doc.get("order", 0)),
        "is_active": bool(doc.get("is_active", True)),
    }


def seed_initial_events_if_empty(db):
    """Seed initial events into MongoDB collection if empty"""
    try:
        count = db.events.count_documents({})
        if count == 0:
            initial_events = []
            if os.path.exists(EVENTS_FILE):
                try:
                    with open(EVENTS_FILE, "r") as f:
                        file_events = json.load(f)
                    for idx, fe in enumerate(file_events):
                        initial_events.append({
                            "event": fe.get("event", "Event"),
                            "month": fe.get("month", "TBD"),
                            "description": None,
                            "status": "upcoming",
                            "order": idx,
                            "is_active": True,
                            "created_at": datetime.now(timezone.utc).isoformat()
                        })
                except Exception as e:
                    logger.warning(f"Could not load initial events from events.json: {e}")
            if not initial_events:
                initial_events = [
                    {"event": "Snooker", "month": "July 2026", "status": "upcoming", "order": 0, "is_active": True},
                    {"event": "Carroms", "month": "August 2026", "status": "upcoming", "order": 1, "is_active": True},
                    {"event": "Cricket", "month": "September 2026", "status": "upcoming", "order": 2, "is_active": True},
                ]
            db.events.insert_many(initial_events)
            logger.info(f"Seeded {len(initial_events)} initial events into MongoDB collection")
    except Exception as e:
        logger.error(f"Error checking/seeding events collection: {e}")


@router.get("/", response_model=List[EventResponse])
def get_events(include_inactive: bool = Query(False, description="Include archived or inactive events")):
    """Get all upcoming events from MongoDB collection"""
    db = get_database()
    seed_initial_events_if_empty(db)
    
    query = {} if include_inactive else {"is_active": {"$ne": False}}
    events = list(db.events.find(query).sort([("order", 1), ("_id", 1)]))
    return [event_helper(e) for e in events]


@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(event_in: EventCreate):
    """Create a new upcoming event in MongoDB"""
    db = get_database()
    seed_initial_events_if_empty(db)

    # Compute order if default 0
    if event_in.order == 0:
        last_event = db.events.find_one(sort=[("order", -1)])
        new_order = (last_event.get("order", 0) + 1) if last_event else 0
    else:
        new_order = event_in.order

    event_dict = {
        "event": event_in.event.strip(),
        "month": event_in.month.strip(),
        "description": event_in.description.strip() if event_in.description else None,
        "status": event_in.status or "upcoming",
        "order": new_order,
        "is_active": event_in.is_active if event_in.is_active is not None else True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    result = db.events.insert_one(event_dict)
    event_dict["_id"] = result.inserted_id

    # Invalidate dashboard cache
    print("🗑️  Invalidating dashboard cache after creating event")
    await invalidate_dashboard_cache()

    return event_helper(event_dict)


@router.put("/reorder", status_code=status.HTTP_200_OK)
async def reorder_events(items: List[EventReorderItem]):
    """Batch reorder upcoming events"""
    db = get_database()
    updated_count = 0
    for item in items:
        if ObjectId.is_valid(item.id):
            res = db.events.update_one(
                {"_id": ObjectId(item.id)},
                {"$set": {"order": item.order, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            if res.modified_count > 0:
                updated_count += 1

    print("🗑️  Invalidating dashboard cache after reordering events")
    await invalidate_dashboard_cache()
    return {"message": "Events reordered successfully", "updated": updated_count}


@router.get("/{id}", response_model=EventResponse)
def get_event(id: str):
    """Get a single upcoming event by ID"""
    db = get_database()
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid event ID format")

    event = db.events.find_one({"_id": ObjectId(id)})
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event with id '{id}' not found")

    return event_helper(event)


@router.put("/{id}", response_model=EventResponse)
async def update_event(id: str, event_in: EventUpdate):
    """Update an existing upcoming event by ID"""
    db = get_database()
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid event ID format")

    existing = db.events.find_one({"_id": ObjectId(id)})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event with id '{id}' not found")

    update_data = {}
    if event_in.event is not None:
        update_data["event"] = event_in.event.strip()
    if event_in.month is not None:
        update_data["month"] = event_in.month.strip()
    if event_in.description is not None:
        update_data["description"] = event_in.description.strip() if event_in.description else None
    if event_in.status is not None:
        update_data["status"] = event_in.status
    if event_in.order is not None:
        update_data["order"] = event_in.order
    if event_in.is_active is not None:
        update_data["is_active"] = event_in.is_active

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    db.events.update_one({"_id": ObjectId(id)}, {"$set": update_data})
    updated = db.events.find_one({"_id": ObjectId(id)})

    print("🗑️  Invalidating dashboard cache after event update")
    await invalidate_dashboard_cache()

    return event_helper(updated)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(id: str, permanent: bool = Query(True, description="Permanently delete or soft-archive")):
    """Delete an upcoming event by ID"""
    db = get_database()
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid event ID format")

    if permanent:
        res = db.events.delete_one({"_id": ObjectId(id)})
        if res.deleted_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event with id '{id}' not found")
    else:
        res = db.events.update_one(
            {"_id": ObjectId(id)},
            {"$set": {"is_active": False, "status": "archived", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        if res.matched_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event with id '{id}' not found")

    print("🗑️  Invalidating dashboard cache after event deletion")
    await invalidate_dashboard_cache()
    return None


@router.put("/", status_code=status.HTTP_200_OK)
async def bulk_update_events(events: List[dict]):
    """Bulk update/replace all events for backward compatibility"""
    db = get_database()
    db.events.delete_many({})
    
    docs = []
    for idx, e in enumerate(events):
        docs.append({
            "event": str(e.get("event", "")).strip(),
            "month": str(e.get("month", "")).strip(),
            "description": e.get("description"),
            "status": e.get("status", "upcoming"),
            "order": idx,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
    
    if docs:
        db.events.insert_many(docs)
    
    print("🗑️  Invalidating dashboard cache after bulk event update")
    await invalidate_dashboard_cache()
    return {"message": "Events updated successfully", "count": len(docs)}
