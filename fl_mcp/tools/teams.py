"""MCP tools for team management."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from backend.models.team import Pool, Team, TeamCreate
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
async def create_team(name: str, pool: str) -> dict[str, Any]:
    """Create a new foosball team.

    Args:
        name: Team display name. This value is used for both the team identifier and team name.
        pool: Tournament pool assignment. Must be either "A" or "B".

    Returns:
        A structured dictionary containing the created team record and creation metadata.
    """
    normalized_pool = Pool(pool.upper())
    team_id = name.strip().upper().replace(" ", "-")
    payload = TeamCreate(
        team_id=team_id,
        team_name=name.strip(),
        club="Independent",
        pool=normalized_pool,
    )

    LOGGER.info("Creating team '%s' in pool '%s'", payload.team_name, payload.pool.value)

    async with create_async_client() as client:
        try:
            response = await client.post("/teams/", json=payload.model_dump(mode="json"))
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            message = _extract_error_message(exc.response)
            LOGGER.warning("Team creation failed: %s", message)
            return {
                "success": False,
                "error": message,
                "status_code": exc.response.status_code,
                "team_name": payload.team_name,
                "pool": payload.pool.value,
            }
        except httpx.HTTPError as exc:
            LOGGER.exception("HTTP error while creating team")
            return {
                "success": False,
                "error": f"Unable to reach backend API: {exc}",
                "team_name": payload.team_name,
                "pool": payload.pool.value,
            }

    team = Team.model_validate(response.json())
    return {
        "success": True,
        "message": f"Team '{team.team_name}' created successfully.",
        "team": team.model_dump(mode="json"),
    }


@mcp.tool()
async def list_teams() -> dict[str, Any]:
    """List all foosball teams.

    Args:
        None.

    Returns:
        A structured dictionary containing all teams and aggregate counts.
    """
    LOGGER.info("Listing all teams")

    async with create_async_client() as client:
        try:
            response = await client.get("/teams/")
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            message = _extract_error_message(exc.response)
            LOGGER.warning("Listing teams failed: %s", message)
            return {
                "success": False,
                "error": message,
                "status_code": exc.response.status_code,
                "teams": [],
            }
        except httpx.HTTPError as exc:
            LOGGER.exception("HTTP error while listing teams")
            return {
                "success": False,
                "error": f"Unable to reach backend API: {exc}",
                "teams": [],
            }

    teams = [Team.model_validate(item).model_dump(mode="json") for item in response.json()]
    return {
        "success": True,
        "count": len(teams),
        "teams": teams,
    }


@mcp.tool()
async def delete_team(team_id: str) -> dict[str, Any]:
    """Delete a team by its identifier.

    Args:
        team_id: Unique team identifier to delete.

    Returns:
        A structured dictionary describing whether the deletion succeeded.
    """
    normalized_team_id = team_id.strip()
    LOGGER.info("Deleting team '%s'", normalized_team_id)

    async with create_async_client() as client:
        try:
            response = await client.delete(f"/teams/{normalized_team_id}")
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            message = _extract_error_message(exc.response)
            LOGGER.warning("Deleting team failed: %s", message)
            return {
                "success": False,
                "error": message,
                "status_code": exc.response.status_code,
                "team_id": normalized_team_id,
            }
        except httpx.HTTPError as exc:
            LOGGER.exception("HTTP error while deleting team")
            return {
                "success": False,
                "error": f"Unable to reach backend API: {exc}",
                "team_id": normalized_team_id,
            }

    return {
        "success": True,
        "message": f"Team '{normalized_team_id}' deleted successfully.",
        "team_id": normalized_team_id,
    }

# Made with Bob
