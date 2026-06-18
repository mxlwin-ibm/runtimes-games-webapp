from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from typing import Optional
import certifi
import os
import logging
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection settings
MONGO_URI = os.getenv("MONGO_URI")
DATABASE_NAME = "foosball"

# Global database clients
async_client: Optional[AsyncIOMotorClient] = None
sync_client: Optional[MongoClient] = None
logger = logging.getLogger(__name__)


def get_database():
    """Get the synchronous database instance (for backward compatibility)"""
    if sync_client is None:
        raise RuntimeError("Database not initialized. Call connect_to_mongo first.")
    return sync_client[DATABASE_NAME]


def get_async_database():
    """Get the async database instance"""
    if async_client is None:
        raise RuntimeError("Async database not initialized. Call connect_to_mongo first.")
    return async_client[DATABASE_NAME]


def ensure_indexes():
    """Ensure required MongoDB indexes exist for performance-critical queries."""
    db = get_database()
    db.subteams.create_index("event")
    db.subteams.create_index("team")
    db.subteams.create_index("pool")
    logger.info("Ensured MongoDB indexes on subteams.event, subteams.team, and subteams.pool")


def connect_to_mongo():
    """Connect to MongoDB on startup (both sync and async clients)"""
    global async_client, sync_client

    # Async client for Motor
    async_client = AsyncIOMotorClient(
        MONGO_URI,
        tls=True,
        tlsCAFile=certifi.where(),
    )
    
    # Sync client for backward compatibility
    sync_client = MongoClient(
        MONGO_URI,
        tls=True,
        tlsCAFile=certifi.where(),
    )
    ensure_indexes()
    print(f"Connected to MongoDB (async + sync) at {MONGO_URI}")


def close_mongo_connection():
    """Close MongoDB connections on shutdown"""
    global async_client, sync_client
    if async_client:
        async_client.close()
    if sync_client:
        sync_client.close()
        print("Closed MongoDB connections")


