"""MCP tools for player management."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from backend.models.player import Player, PlayerCreate, TeamName
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
async def create_player(player_name: str, team: str) -> dict[str, Any]:
    """Create a new player.

    Args:
        player_name: Player's full name.
        team: Team name. Must be one of: Titans, El Dragos, Gladiators, Vikings.

    Returns:
        A structured dictionary containing the created player record.
    """
    try:
        team_enum = TeamName(team)
    except ValueError:
        valid_teams = ", ".join([t.value for t in TeamName])
        return {
            "success": False,
            "error": f"Invalid team name. Must be one of: {valid_teams}",
            "player_name": player_name,
            "team": team,
        }

    payload = PlayerCreate(player_name=player_name.strip(), team=team_enum)

    LOGGER.info("Creating player '%s' for team '%s'", payload.player_name, payload.team.value)

    async with create_async_client() as client:
        try:
            response = await client.post("/players/", json=payload.model_dump(mode="json"))
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            message = _extract_error_message(exc.response)
            LOGGER.warning("Player creation failed: %s", message)
            return {
                "success": False,
                "error": message,
                "status_code": exc.response.status_code,
                "player_name": payload.player_name,
                "team": payload.team.value,
            }
        except httpx.HTTPError as exc:
            LOGGER.exception("HTTP error while creating player")
            return {
                "success": False,
                "error": f"Unable to reach backend API: {exc}",
                "player_name": payload.player_name,
                "team": payload.team.value,
            }

    player = Player.model_validate(response.json())
    return {
        "success": True,
        "message": f"Player '{player.player_name}' created successfully.",
        "player": player.model_dump(mode="json"),
    }


@mcp.tool()
async def list_players(team: str | None = None) -> dict[str, Any]:
    """List all players, optionally filtered by team.

    Args:
        team: Optional team name filter. If provided, only players from that team are returned.

    Returns:
        A structured dictionary containing all players and aggregate counts.
    """
    LOGGER.info("Listing players with team filter: %s", team)

    params = {}
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
                "players": [],
            }

    async with create_async_client() as client:
        try:
            response = await client.get("/players/", params=params)
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            message = _extract_error_message(exc.response)
            LOGGER.warning("Listing players failed: %s", message)
            return {
                "success": False,
                "error": message,
                "status_code": exc.response.status_code,
                "players": [],
            }
        except httpx.HTTPError as exc:
            LOGGER.exception("HTTP error while listing players")
            return {
                "success": False,
                "error": f"Unable to reach backend API: {exc}",
                "players": [],
            }

    players = [Player.model_validate(item).model_dump(mode="json") for item in response.json()]
    return {
        "success": True,
        "count": len(players),
        "team_filter": team,
        "players": players,
    }


@mcp.tool()
async def get_player(player_id: str) -> dict[str, Any]:
    """Get a specific player by ID.

    Args:
        player_id: Unique player identifier (MongoDB ObjectId).

    Returns:
        A structured dictionary containing the player details.
    """
    normalized_id = player_id.strip()
    LOGGER.info("Getting player '%s'", normalized_id)

    async with create_async_client() as client:
        try:
            response = await client.get(f"/players/{normalized_id}")
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            message = _extract_error_message(exc.response)
            LOGGER.warning("Getting player failed: %s", message)
            return {
                "success": False,
                "error": message,
                "status_code": exc.response.status_code,
                "player_id": normalized_id,
            }
        except httpx.HTTPError as exc:
            LOGGER.exception("HTTP error while getting player")
            return {
                "success": False,
                "error": f"Unable to reach backend API: {exc}",
                "player_id": normalized_id,
            }

    player = Player.model_validate(response.json())
    return {
        "success": True,
        "player": player.model_dump(mode="json"),
    }


@mcp.tool()
async def update_player(player_id: str, player_name: str, team: str) -> dict[str, Any]:
    """Update a player's information.

    Args:
        player_id: Unique player identifier (MongoDB ObjectId).
        player_name: Updated player name.
        team: Updated team name. Must be one of: Titans, El Dragos, Gladiators, Vikings.

    Returns:
        A structured dictionary containing the updated player record.
    """
    normalized_id = player_id.strip()

    try:
        team_enum = TeamName(team)
    except ValueError:
        valid_teams = ", ".join([t.value for t in TeamName])
        return {
            "success": False,
            "error": f"Invalid team name. Must be one of: {valid_teams}",
            "player_id": normalized_id,
            "team": team,
        }

    payload = PlayerCreate(player_name=player_name.strip(), team=team_enum)

    LOGGER.info("Updating player '%s' with name '%s' and team '%s'", normalized_id, payload.player_name, payload.team.value)

    async with create_async_client() as client:
        try:
            response = await client.put(f"/players/{normalized_id}", json=payload.model_dump(mode="json"))
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            message = _extract_error_message(exc.response)
            LOGGER.warning("Updating player failed: %s", message)
            return {
                "success": False,
                "error": message,
                "status_code": exc.response.status_code,
                "player_id": normalized_id,
            }
        except httpx.HTTPError as exc:
            LOGGER.exception("HTTP error while updating player")
            return {
                "success": False,
                "error": f"Unable to reach backend API: {exc}",
                "player_id": normalized_id,
            }

    player = Player.model_validate(response.json())
    return {
        "success": True,
        "message": f"Player '{player.player_name}' updated successfully.",
        "player": player.model_dump(mode="json"),
    }


@mcp.tool()
async def delete_player(player_id: str) -> dict[str, Any]:
    """Delete a player by ID.

    Args:
        player_id: Unique player identifier (MongoDB ObjectId).

    Returns:
        A structured dictionary describing whether the deletion succeeded.
    """
    normalized_id = player_id.strip()
    LOGGER.info("Deleting player '%s'", normalized_id)

    async with create_async_client() as client:
        try:
            response = await client.delete(f"/players/{normalized_id}")
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            message = _extract_error_message(exc.response)
            LOGGER.warning("Deleting player failed: %s", message)
            return {
                "success": False,
                "error": message,
                "status_code": exc.response.status_code,
                "player_id": normalized_id,
            }
        except httpx.HTTPError as exc:
            LOGGER.exception("HTTP error while deleting player")
            return {
                "success": False,
                "error": f"Unable to reach backend API: {exc}",
                "player_id": normalized_id,
            }

    return {
        "success": True,
        "message": f"Player '{normalized_id}' deleted successfully.",
        "player_id": normalized_id,
    }

# Made with Bob
