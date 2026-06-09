# Step 3 - Team CRUD

## Goal

Manage tournament teams.

---

## Team Model

```json
{
  "_id": "...",
  "team_id": "Melwin-Vaishak",
  "team": "Bravo",
  "win": 0,
  "loss": 0,
  "gf": 0,
  "ga": 0,
  "gd": 0,
  "points": 0 
}
```

---

## APIs

### Create Team

POST /teams

```json
{
  "team_id":"Melwin-Vaishak",
  "team": "Bravo"
}
```

---

### Get Teams

GET /teams

---

### Delete Team

DELETE /teams/{id}