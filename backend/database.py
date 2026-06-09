from pymongo import MongoClient
from pymongo.server_api import ServerApi
from typing import Optional
import certifi
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection settings
MONGO_URI = os.getenv("MONGO_URI")
DATABASE_NAME = "foosball"

# Global database client
client: Optional[MongoClient] = None


def get_database():
    """Get the database instance"""
    if client is None:
        raise RuntimeError("Database not initialized. Call connect_to_mongo first.")
    return client[DATABASE_NAME]


def connect_to_mongo():
    """Connect to MongoDB on startup"""
    global client

    client = MongoClient(
        MONGO_URI,
        tls=True,
        tlsCAFile=certifi.where(),
    )
    print(f"Connected to MongoDB at {MONGO_URI}")


def close_mongo_connection():
    """Close MongoDB connection on shutdown"""
    global client
    if client:
        client.close()
        print("Closed MongoDB connection")


