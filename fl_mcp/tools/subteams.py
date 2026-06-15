"""MCP tools for subteam management."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from backend.models.subteam import SubTeam, SubTeamCreate
from backend.models.player import TeamName
from backend.models.enums import Pool
from fl_mcp.config import create_async_client
from fl_mcp.server import mcp

LOGGER = logging.getLogger(__name__)


def _extract_error_message(response: httpx.Response) -> str:
    """Extract a readable error message from an HTTP response."""
    try:
        payload = response.json()
    except ValueError:
        return response.text or "Unknown backend error"

    detail = payload.get("detail")
    if isinstance(detail, str):
        return detail
    return str(payload)


@mcp.tool()
async def create_subteam(
    event: str,
    team: str,
    subteam_id: int,
    pool: str,
    player_ids: list[str],
) -> dict[str, Any]:
    """Create a new subteam for an event.

    Args:
        event: Event name (e.g., 'foosball').
        team: Team name. Must be one of: Titans, El Dragos, Gladiators, Vikings.
        subteam_id: Subteam identifier (must be >= 1).
        pool: Tournament pool. Must be one of: A, B, C, D.
        player_ids: List of player IDs (MongoDB ObjectIds). Maximum 10 players.

    Returns:
        A structured dictionary containing the created subteam record.
    """
    try:
        team_enum = TeamName(team)
    except ValueError:
        valid_teams = ", ".join([t.value for t in TeamName])
        return {
            "success": False,
            "error": f"Invalid team name. Must be one of: {valid_teams}",
            "team": team,
        }

    try:
        pool_enum = Pool(pool.upper())
    except ValueError:
        valid_pools = ", ".join([p.value for p in Pool])
        return {
            "success": False,
            "error": f"Invalid pool. Must be one of: {valid_pools}",
            "pool": pool,
        }

    if len(player_ids) > 10:
        return {
            "success": False,
            "error": "A subteam can have at most 10 players",
            "player_count": len(player_ids),
        }

    payload = SubTeamCreate(
        event=event.strip(),
        team=team_enum,
        subteam_id=subteam_id,
        pool=pool_enum,
        player_ids=player_ids,
    )

    LOGGER.info(
        "Creating subteam %s-%d for event '%s' in pool '%s' with %d players",
        payload.team.value,
        payload.subteam_id,
        payload.event,
        payload.pool.value,
        len(payload.player_ids),
    )

    async with create_async_client() as client:
        try:
            response = await client.post("/subteams/", json=payload.model_dump(mode="json"))
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            message = _extract_error_message(exc.response)
            LOGGER.warning("Subteam creation failed: %s", message)
            return {
                "success": False,
                "error": message,
                "status_code": exc.response.status_code,
                "event": payload.event,
                "team": payload.team.value,
                "subteam_id": payload.subteam_id,
            }
        except httpx.HTTPError as exc:
            LOGGER.exception("HTTP error while creating subteam")
            return {
                "success": False,
                "error": f"Unable to reach backend API: {exc}",
                "event": payload.event,
                "team": payload.team.value,
                "subteam_id": payload.subteam_id,
            }

    subteam = SubTeam.model_validate(response.json())
    return {
        "success": True,
        "message": f"Subteam '{subteam.name}' created successfully.",
        "subteam": subteam.model_dump(mode="json"),
    }


@mcp.tool()
async def list_subteams(
    event: str | None = None,
    team: str | None = None,
    pool: str | None = None,
) -> dict[str, Any]:
    """List all subteams, optionally filtered by event, team, or pool.

    Args:
        event: Optional event name filter.
        team: Optional team name filter.
        pool: Optional pool filter.

    Returns:
        A structured dictionary containing all subteams and aggregate counts.
    """
    LOGGER.info("Listing subteams with filters - event: %s, team: %s, pool: %s", event, team, pool)

    params = {}

    if event:
        params["event"] = event.strip()

    if team:
        try:
            team_enum = TeamName(team)
            params["team"] = team_enum.value
        except ValueError:
            valid_teams = ", ".join([t.value for t in TeamName])
            return {
                "success": False,
                "error": f"Invalid team name. Must be one of: {valid_teams}",
                "team": team,
                "subteams": [],
            }

    if pool:
        try:
            pool_enum = Pool(pool.upper())
            params["pool"] = pool_enum.value
        except ValueError:
            valid_pools = ", ".join([p.value for p in Pool])
            return {
                "success": False,
                "error": f"Invalid pool. Must be one of: {valid_pools}",
                "pool": pool,
                "subteams": [],
            }

    async with create_async_client() as client:
        try:
            response = await client.get("/subteams/", params=params)
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            message = _extract_error_message(exc.response)
            LOGGER.warning("Listing subteams failed: %s", message)
            return {
                "success": False,
                "error": message,
                "status_code": exc.response.status_code,
                "subteams": [],
            }
        except httpx.HTTPError as exc:
            LOGGER.exception("HTTP error while listing subteams")
            return {
                "success": False,
                "error": f"Unable to reach backend API: {exc}",
                "subteams": [],
            }

    subteams = [SubTeam.model_validate(item).model_dump(mode="json") for item in response.json()]
    return {
        "success": True,
        "count": len(subteams),
        "event_filter": event,
        "team_filter": team,
        "pool_filter": pool,
        "subteams": subteams,
    }


@mcp.tool()
async def get_subteam(subteam_id: str) -> dict[str, Any]:
    """Get a specific subteam by ID.

    Args:
        subteam_id: Unique subteam identifier (MongoDB ObjectId).

    Returns:
        A structured dictionary containing the subteam details.
    """
    normalized_id = subteam_id.strip()
    LOGGER.info("Getting subteam '%s'", normalized_id)

    async with create_async_client() as client:
        try:
            response = await client.get(f"/subteams/{normalized_id}")
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            message = _extract_error_message(exc.response)
            LOGGER.warning("Getting subteam failed: %s", message)
            return {
                "success": False,
                "error": message,
                "status_code": exc.response.status_code,
                "subteam_id": normalized_id,
            }
        except httpx.HTTPError as exc:
            LOGGER.exception("HTTP error while getting subteam")
            return {
                "success": False,
                "error": f"Unable to reach backend API: {exc}",
                "subteam_id": normalized_id,
            }

    subteam = SubTeam.model_validate(response.json())
    return {
        "success": True,
        "subteam": subteam.model_dump(mode="json"),
    }


@mcp.tool()
async def update_subteam(
    subteam_id: str,
    event: str,
    team: str,
    subteam_number: int,
    pool: str,
    player_ids: list[str],
) -> dict[str, Any]:
    """Update a subteam's information.

    Args:
        subteam_id: Unique subteam identifier (MongoDB ObjectId).
        event: Updated event name.
        team: Updated team name. Must be one of: Titans, El Dragos, Gladiators, Vikings.
        subteam_number: Updated subteam identifier (must be >= 1).
        pool: Updated tournament pool. Must be one of: A, B, C, D.
        player_ids: Updated list of player IDs (MongoDB ObjectIds). Maximum 10 players.

    Returns:
        A structured dictionary containing the updated subteam record.
    """
    normalized_id = subteam_id.strip()

    try:
        team_enum = TeamName(team)
    except ValueError:
        valid_teams = ", ".join([t.value for t in TeamName])
        return {
            "success": False,
            "error": f"Invalid team name. Must be one of: {valid_teams}",
            "subteam_id": normalized_id,
            "team": team,
        }

    try:
        pool_enum = Pool(pool.upper())
    except ValueError:
        valid_pools = ", ".join([p.value for p in Pool])
        return {
            "success": False,
            "error": f"Invalid pool. Must be one of: {valid_pools}",
            "subteam_id": normalized_id,
            "pool": pool,
        }

    if len(player_ids) > 10:
        return {
            "success": False,
            "error": "A subteam can have at most 10 players",
            "subteam_id": normalized_id,
            "player_count": len(player_ids),
        }

    payload = SubTeamCreate(
        event=event.strip(),
        team=team_enum,
        subteam_id=subteam_number,
        pool=pool_enum,
        player_ids=player_ids,
    )

    LOGGER.info(
        "Updating subteam '%s' with event '%s', team '%s', subteam_id %d, pool '%s'",
        normalized_id,
        payload.event,
        payload.team.value,
        payload.subteam_id,
        payload.pool.value,
    )

    async with create_async_client() as client:
        try:
            response = await client.put(f"/subteams/{normalized_id}", json=payload.model_dump(mode="json"))
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            message = _extract_error_message(exc.response)
            LOGGER.warning("Updating subteam failed: %s", message)
            return {
                "success": False,
                "error": message,
                "status_code": exc.response.status_code,
                "subteam_id": normalized_id,
            }
        except httpx.HTTPError as exc:
            LOGGER.exception("HTTP error while updating subteam")
            return {
                "success": False,
                "error": f"Unable to reach backend API: {exc}",
                "subteam_id": normalized_id,
            }

    subteam = SubTeam.model_validate(response.json())
    return {
        "success": True,
        "message": f"Subteam '{subteam.name}' updated successfully.",
        "subteam": subteam.model_dump(mode="json"),
    }


@mcp.tool()
async def delete_subteam(subteam_id: str) -> dict[str, Any]:
    """Delete a subteam by ID.

    Args:
        subteam_id: Unique subteam identifier (MongoDB ObjectId).

    Returns:
        A structured dictionary describing whether the deletion succeeded.
    """
    normalized_id = subteam_id.strip()
    LOGGER.info("Deleting subteam '%s'", normalized_id)

    async with create_async_client() as client:
        try:
            response = await client.delete(f"/subteams/{normalized_id}")
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            message = _extract_error_message(exc.response)
            LOGGER.warning("Deleting subteam failed: %s", message)
            return {
                "success": False,
                "error": message,
                "status_code": exc.response.status_code,
                "subteam_id": normalized_id,
            }
        except httpx.HTTPError as exc:
            LOGGER.exception("HTTP error while deleting subteam")
            return {
                "success": False,
                "error": f"Unable to reach backend API: {exc}",
                "subteam_id": normalized_id,
            }

    return {
        "success": True,
        "message": f"Subteam '{normalized_id}' deleted successfully.",
        "subteam_id": normalized_id,
    }

# Made with Bob
