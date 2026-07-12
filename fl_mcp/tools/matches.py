"""MCP tools for match scheduling and results."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

import httpx

from backend.models.match import Match, MatchCreate, MatchStatus, MatchUpdate
from backend.models.enums import MatchType
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
async def schedule_match(
    team1: str,
    team1_subid: str,
    team2: str,
    team2_subid: str,
    match_date: str,
    match_time: str,
    event: str = "foosball",
    match_type: str = "league",
    round: int | None = None,
) -> dict[str, Any]:
    """Schedule a new match between two subteams.

    Args:
        team1: First team name (e.g., 'Titans').
        team1_subid: First subteam identifier (e.g., '1').
        team2: Second team name (e.g., 'Vikings').
        team2_subid: Second subteam identifier (e.g., '2').
        match_date: Match date in YYYY-MM-DD format.
        match_time: Match time in HH:MM format (24-hour).
        event: Event name. Defaults to 'foosball'.
        match_type: Match type — 'league', 'quarter_final', 'semi_final', or 'final'.
                    Defaults to 'league'.
        round: Round number. If omitted, derived automatically from the match date.

    Returns:
        A structured dictionary containing the created match and scheduling metadata.
    """
    try:
        match_type_enum = MatchType(match_type)
    except ValueError:
        valid_types = ", ".join([t.value for t in MatchType])
        return {
            "success": False,
            "error": f"Invalid match_type. Must be one of: {valid_types}",
            "match_type": match_type,
        }

    if round is not None:
        round_number = round
    else:
        try:
            round_number = _derive_round_from_date(match_date)
        except ValueError as exc:
            LOGGER.warning("Invalid match_date provided: %s", match_date)
            return {
                "success": False,
                "error": f"Invalid match_date. Expected YYYY-MM-DD format: {exc}",
                "match_date": match_date,
            }

    payload = MatchCreate(
        team1=team1.strip(),
        team1_subid=team1_subid.strip(),
        team2=team2.strip(),
        team2_subid=team2_subid.strip(),
        event=event.strip(),
        round=round_number,
        match_type=match_type_enum,
        match_date=match_date.strip(),
        match_time=match_time.strip(),
    )
    LOGGER.info(
        "Scheduling match %s-%s vs %s-%s for event '%s' on %s %s (round %d)",
        payload.team1,
        payload.team1_subid,
        payload.team2,
        payload.team2_subid,
        payload.event,
        payload.match_date,
        payload.match_time,
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
                "team1": team1,
                "team2": team2,
                "match_date": match_date,
            }
        except httpx.HTTPError as exc:
            LOGGER.exception("HTTP error while scheduling match")
            return {
                "success": False,
                "error": f"Unable to reach backend API: {exc}",
                "team1": team1,
                "team2": team2,
                "match_date": match_date,
            }

    match = Match.model_validate(response.json())
    return {
        "success": True,
        "message": f"Match '{match.id}' scheduled successfully.",
        "match": match.model_dump(mode="json"),
    }


@mcp.tool()
async def update_match_result(match_id: str, team1_score: int, team2_score: int) -> dict[str, Any]:
    """Update the result of a scheduled match.

    Args:
        match_id: Unique match identifier (MongoDB ObjectId).
        team1_score: Final score for team 1.
        team2_score: Final score for team 2.

    Returns:
        A structured dictionary containing the updated match result.
    """
    normalized_match_id = match_id.strip()

    try:
        payload = MatchUpdate(
            team1_score=team1_score,
            team2_score=team2_score,
            match_status=MatchStatus.PLAYED,
        )
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
        payload.team1_score,
        payload.team2_score,
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
        "message": f"Match '{match.id}' updated successfully.",
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
    scheduled_count = sum(1 for m in matches if m["match_status"] == MatchStatus.SCHEDULED.value)
    played_count = sum(1 for m in matches if m["match_status"] == MatchStatus.PLAYED.value)

    return {
        "success": True,
        "count": len(matches),
        "scheduled_count": scheduled_count,
        "played_count": played_count,
        "matches": matches,
    }


@mcp.tool()
async def delete_match(match_id: str) -> dict[str, Any]:
    """Delete a match by ID.

    Args:
        match_id: Unique match identifier (MongoDB ObjectId).

    Returns:
        A structured dictionary confirming deletion or describing the error.
    """
    normalized_match_id = match_id.strip()
    LOGGER.info("Deleting match '%s'", normalized_match_id)

    async with create_async_client() as client:
        try:
            response = await client.delete(f"/matches/{normalized_match_id}")
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            message = _extract_error_message(exc.response)
            LOGGER.warning("Deleting match failed: %s", message)
            return {
                "success": False,
                "error": message,
                "status_code": exc.response.status_code,
                "match_id": normalized_match_id,
            }
        except httpx.HTTPError as exc:
            LOGGER.exception("HTTP error while deleting match")
            return {
                "success": False,
                "error": f"Unable to reach backend API: {exc}",
                "match_id": normalized_match_id,
            }

    return {
        "success": True,
        "message": f"Match '{normalized_match_id}' deleted successfully.",
        "match_id": normalized_match_id,
    }


# Made with Bob
