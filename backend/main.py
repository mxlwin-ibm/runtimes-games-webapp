from fastapi import FastAPI
from contextlib import asynccontextmanager
from backend.database import connect_to_mongo, close_mongo_connection, get_database
import os
from dotenv import load_dotenv

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    connect_to_mongo()
    yield
    # Shutdown
    close_mongo_connection()


app = FastAPI(lifespan=lifespan)


@app.get("/")
def health():
    return {"status": "running"}


@app.post("/test/team")
def test_insert_team():
    """Test endpoint to verify MongoDB connection"""
    db = get_database()
    result = db.teams.insert_one({"name": "Alpha"})
    return {
        "message": "Team inserted successfully",
        "id": str(result.inserted_id)
    }
