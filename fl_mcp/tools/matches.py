"""MCP tools for match scheduling and results."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

import httpx

from backend.models.match import Match, MatchCreate, MatchStatus, MatchUpdate
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


def _derive_round_from_date(scheduled_date: str) -> int:
    """Derive a deterministic round number from an ISO date string."""
    parsed = datetime.fromisoformat(scheduled_date.replace("Z", "+00:00"))
    return max(1, parsed.isocalendar().week)


@mcp.tool()
async def schedule_match(team1_id: str, team2_id: str, scheduled_date: str) -> dict[str, Any]:
    """Schedule a new match between two teams.

    Args:
        team1_id: Identifier for the first team.
        team2_id: Identifier for the second team.
        scheduled_date: ISO-8601 date or datetime string used to derive the backend round number.

    Returns:
        A structured dictionary containing the created match and scheduling metadata.
    """
    normalized_team1 = team1_id.strip()
    normalized_team2 = team2_id.strip()

    try:
        round_number = _derive_round_from_date(scheduled_date)
    except ValueError as exc:
        LOGGER.warning("Invalid scheduled_date provided: %s", scheduled_date)
        return {
            "success": False,
            "error": f"Invalid scheduled_date. Expected ISO-8601 format: {exc}",
            "scheduled_date": scheduled_date,
        }

    payload = MatchCreate(team_a_id=normalized_team1, team_b_id=normalized_team2, round=round_number)
    LOGGER.info(
        "Scheduling match %s vs %s for derived round %s",
        payload.team_a_id,
        payload.team_b_id,
        payload.round,
    )

    async with create_async_client() as client:
        try:
            response = await client.post("/matches/", json=payload.model_dump(mode="json"))
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            message = _extract_error_message(exc.response)
            LOGGER.warning("Scheduling match failed: %s", message)
            return {
                "success": False,
                "error": message,
                "status_code": exc.response.status_code,
                "team1_id": normalized_team1,
                "team2_id": normalized_team2,
                "scheduled_date": scheduled_date,
            }
        except httpx.HTTPError as exc:
            LOGGER.exception("HTTP error while scheduling match")
            return {
                "success": False,
                "error": f"Unable to reach backend API: {exc}",
                "team1_id": normalized_team1,
                "team2_id": normalized_team2,
                "scheduled_date": scheduled_date,
            }

    match = Match.model_validate(response.json())
    return {
        "success": True,
        "message": f"Match '{match.match_id}' scheduled successfully.",
        "scheduled_date": scheduled_date,
        "match": match.model_dump(mode="json"),
    }


@mcp.tool()
async def update_match_result(match_id: str, team1_score: int, team2_score: int) -> dict[str, Any]:
    """Update the result of a scheduled match.

    Args:
        match_id: Unique match identifier.
        team1_score: Final score for team A.
        team2_score: Final score for team B.

    Returns:
        A structured dictionary containing the updated match result.
    """
    normalized_match_id = match_id.strip()

    try:
        payload = MatchUpdate(score_a=team1_score, score_b=team2_score, status=MatchStatus.PLAYED)
    except ValueError as exc:
        LOGGER.warning("Invalid match result payload for %s: %s", normalized_match_id, exc)
        return {
            "success": False,
            "error": f"Invalid match result payload: {exc}",
            "match_id": normalized_match_id,
        }

    LOGGER.info(
        "Updating match '%s' with score %s-%s",
        normalized_match_id,
        payload.score_a,
        payload.score_b,
    )

    async with create_async_client() as client:
        try:
            response = await client.put(
                f"/matches/{normalized_match_id}",
                json=payload.model_dump(mode="json"),
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            message = _extract_error_message(exc.response)
            LOGGER.warning("Updating match result failed: %s", message)
            return {
                "success": False,
                "error": message,
                "status_code": exc.response.status_code,
                "match_id": normalized_match_id,
            }
        except httpx.HTTPError as exc:
            LOGGER.exception("HTTP error while updating match result")
            return {
                "success": False,
                "error": f"Unable to reach backend API: {exc}",
                "match_id": normalized_match_id,
            }

    match = Match.model_validate(response.json())
    return {
        "success": True,
        "message": f"Match '{match.match_id}' updated successfully.",
        "match": match.model_dump(mode="json"),
    }


@mcp.tool()
async def list_all_matches() -> dict[str, Any]:
    """List all matches in the league.

    Args:
        None.

    Returns:
        A structured dictionary containing all matches and summary counts by status.
    """
    LOGGER.info("Listing all matches")

    async with create_async_client() as client:
        try:
            response = await client.get("/matches/")
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            message = _extract_error_message(exc.response)
            LOGGER.warning("Listing matches failed: %s", message)
            return {
                "success": False,
                "error": message,
                "status_code": exc.response.status_code,
                "matches": [],
            }
        except httpx.HTTPError as exc:
            LOGGER.exception("HTTP error while listing matches")
            return {
                "success": False,
                "error": f"Unable to reach backend API: {exc}",
                "matches": [],
            }

    matches = [Match.model_validate(item).model_dump(mode="json") for item in response.json()]
    scheduled_count = sum(1 for match in matches if match["status"] == MatchStatus.SCHEDULED.value)
    played_count = sum(1 for match in matches if match["status"] == MatchStatus.PLAYED.value)

    return {
        "success": True,
        "count": len(matches),
        "scheduled_count": scheduled_count,
        "played_count": played_count,
        "matches": matches,
    }


@mcp.tool()
async def list_team_matches(team_id: str) -> dict[str, Any]:
    """List all matches for a specific team.

    Args:
        team_id: Unique team identifier.

    Returns:
        A structured dictionary containing all matches involving the requested team.
    """
    normalized_team_id = team_id.strip()
    LOGGER.info("Listing matches for team '%s'", normalized_team_id)

    async with create_async_client() as client:
        try:
            response = await client.get(f"/matches/team/{normalized_team_id}")
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            message = _extract_error_message(exc.response)
            LOGGER.warning("Listing team matches failed: %s", message)
            return {
                "success": False,
                "error": message,
                "status_code": exc.response.status_code,
                "team_id": normalized_team_id,
                "matches": [],
            }
        except httpx.HTTPError as exc:
            LOGGER.exception("HTTP error while listing team matches")
            return {
                "success": False,
                "error": f"Unable to reach backend API: {exc}",
                "team_id": normalized_team_id,
                "matches": [],
            }

    matches = [Match.model_validate(item).model_dump(mode="json") for item in response.json()]
    return {
        "success": True,
        "team_id": normalized_team_id,
        "count": len(matches),
        "matches": matches,
    }

# Made with Bob
