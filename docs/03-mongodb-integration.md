# Step 2 - MongoDB Integration

## Goal

Store tournament data permanently.

---

## Create Database

Database:

foosball

Collections:

- teams
- matches

---

## Connection

```python
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(MONGO_URI)

db = client.foosball
```

---

## Verify

Create a test insert endpoint.

```python
await db.teams.insert_one({
    "name":"Alpha"
})
```