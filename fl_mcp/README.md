# Foosball League MCP Server

Production-ready Model Context Protocol (MCP) server for the Foosball League FastAPI backend.

## Features

- Async MCP tools backed by `httpx.AsyncClient`
- Domain-organized tools for teams, matches, and standings
- Read-only MCP resources for standings, teams, recent matches, and upcoming matches
- Reusable prompts for league analysis workflows
- Environment-driven configuration
- Python 3.12 compatible

## Directory Structure

```text
mcp/
├── __init__.py
├── config.py
├── server.py
├── README.md
├── tools/
│   ├── __init__.py
│   ├── teams.py
│   ├── matches.py
│   └── points_table.py
├── resources/
│   └── __init__.py
└── prompts/
    └── __init__.py
```

## Installation

### 1. Install project dependencies

Using `uv`:

```bash
uv sync
```

Using `pip`:

```bash
pip install -e .
```

### 2. Start the FastAPI backend

```bash
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Start the MCP server

```bash
uv run python -m mcp.server
```

## Configuration

The MCP server reads configuration from environment variables.

| Variable | Default | Description |
|---|---|---|
| `FOOSBALL_API_BASE_URL` | `http://localhost:8000` | Base URL for the FastAPI backend |
| `FOOSBALL_API_TIMEOUT` | `10.0` | Total request timeout in seconds |
| `FOOSBALL_API_CONNECT_TIMEOUT` | `5.0` | Connection timeout in seconds |
| `FOOSBALL_API_MAX_CONNECTIONS` | `20` | Maximum HTTP connections |
| `FOOSBALL_API_MAX_KEEPALIVE_CONNECTIONS` | `10` | Maximum keep-alive connections |

Example:

```bash
export FOOSBALL_API_BASE_URL="https://foosball-api.example.com"
export FOOSBALL_API_TIMEOUT="15"
uv run python -m mcp.server
```

## Available Tools

### Teams

- `create_team(name: str, pool: str)`
- `list_teams()`
- `delete_team(team_id: str)`

### Matches

- `schedule_match(team1_id: str, team2_id: str, scheduled_date: str)`
- `update_match_result(match_id: str, team1_score: int, team2_score: int)`
- `list_all_matches()`
- `list_team_matches(team_id: str)`

### Points Table

- `get_points_table(pool: str | None = None)`

## Available Resources

- `foosball://standings`
- `foosball://teams`
- `foosball://matches/recent`
- `foosball://matches/upcoming`

## Available Prompts

- `analyze_league_standings`
- `compare_teams`
- `predict_match_outcome`
- `season_summary`
- `top_performers`

## Usage Examples

### Example MCP workflow

1. Call `list_teams()` to inspect registered teams.
2. Call `schedule_match("B1", "B2", "2026-06-15")` to create a match.
3. Call `update_match_result("B1B2", 10, 8)` after the match is played.
4. Call `get_points_table()` to inspect updated standings.
5. Read `foosball://standings` for a formatted standings snapshot.

### Example environment launch

```bash
FOOSBALL_API_BASE_URL="http://localhost:8000" uv run python -m mcp.server
```

## Deployment

### Railway

1. Create a new Railway service from the repository.
2. Set the start command to:

```bash
uv run python -m mcp.server
```

3. Add environment variables for the backend URL and Mongo-backed API deployment.
4. Ensure the FastAPI backend is deployed and reachable from the MCP service.

### Render

1. Create a new Web Service or Background Worker.
2. Build command:

```bash
uv sync
```

3. Start command:

```bash
uv run python -m mcp.server
```

4. Configure `FOOSBALL_API_BASE_URL` to point to the deployed backend.

### Fly.io

1. Create an app with `fly launch`.
2. Set the process command to:

```bash
uv run python -m mcp.server
```

3. Configure secrets:

```bash
fly secrets set FOOSBALL_API_BASE_URL="https://your-backend.example.com"
```

4. Deploy with:

```bash
fly deploy
```

## Testing Guide

### Manual backend verification

```bash
curl http://localhost:8000/
curl http://localhost:8000/teams/
curl http://localhost:8000/matches/
curl http://localhost:8000/points-table/
```

### MCP smoke testing

Run the MCP server locally:

```bash
uv run python -m mcp.server
```

Then connect with an MCP-compatible client and verify:

- tools are discoverable
- resources are readable
- prompts are listed
- backend errors are surfaced cleanly

### Suggested validation scenarios

- Create a team in Pool A and Pool B
- Attempt duplicate team creation
- Schedule a valid match
- Attempt cross-pool scheduling
- Update a match result
- Verify standings update correctly

## Troubleshooting

### Import errors for `fastmcp`

Install dependencies again:

```bash
uv sync
```

### Backend connection failures

Verify the backend is running and the base URL is correct:

```bash
curl "$FOOSBALL_API_BASE_URL/"
```

### MCP server starts but tools fail

Check:

- backend availability
- environment variable values
- network access between MCP server and backend
- backend response payloads

### Validation errors during tool execution

Ensure:

- pool values are `A` or `B`
- `scheduled_date` is valid ISO-8601
- scores are non-negative integers
- team and match identifiers exist in the backend

## Notes

- The backend currently exposes public endpoints without authentication.
- The MCP server mirrors that behavior and does not add auth headers.
- For production exposure, place the MCP server behind trusted infrastructure and restrict backend access where possible.