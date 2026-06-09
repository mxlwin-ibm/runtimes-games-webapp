# Step 4 - Match CRUD

## Goal

Store match schedules and results.

---

## Match Schema
eg:
```json
{
  "team_a":"Alpha",
  "team_b":"Bravo",

  "score_a":10,
  "score_b":8,

  "status":"played"
}
```

---

## APIs

### Schedule Match

POST /matches

### Update Result

PUT /matches/{id}

### Get Matches

GET /matches

### Get Team Matches

GET /matches/team/{team}