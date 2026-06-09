# Step 5 - Points Table Calculation

## Goal

Generate standings dynamically.

---

## Rules

Win = 3 points

Loss = 0 points

---

## Statistics

For every team calculate:

- Played
- Won
- Lost
- Goals For
- Goals Against
- Points

---

## Endpoint

GET /points-table

---

## Sample Response

```json
[
  { 
    "team_id": "B1",
    "team_name":"Melwin-Vaishak",
    "played":4,
    "won":3,
    "lost":1,
    "gf":10,
    "ga":7,
    "gd": "+3".
    "points":9
  }
]
```

---

## Sorting

Sort descending by:

1. Points
2. Goal Difference
3. Goals Scored