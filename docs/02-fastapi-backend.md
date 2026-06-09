# Step 1 - FastAPI Backend

## Goal

Create the core REST API that powers the entire system.

---

## Install

```bash
pip install fastapi uvicorn
```

## Project Structure

```text
backend/
│
├── main.py
├── routes/
├── services/
└── models/
```

## First Endpoint

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def health():
    return {"status":"running"}
```

## Run

```bash
uvicorn main:app --reload
```

## Verify

Open:

http://localhost:8000/docs

Swagger UI should appear.