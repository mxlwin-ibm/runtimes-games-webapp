"""MCP resources for Foosball League snapshots."""

from __future__ import annotations

import logging
from typing import Any

import httpx

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


async def _get_json(path: str) -> list[dict[str, Any]]:
    """Fetch JSON list data from the backend."""
    async with create_async_client() as client:
        response = await client.get(path)
        response.raise_for_status()
        payload = response.json()
        if isinstance(payload, list):
            return payload
        return []


@mcp.resource("foosball://standings")
async def standings_resource() -> str:
    """Return the current league standings."""
    LOGGER.info("Loading standings resource")
    try:
        standings = await _get_json("/points-table/")
    except httpx.HTTPStatusError as exc:
        message = _extract_error_message(exc.response)
        LOGGER.warning("Standings resource failed: %s", message)
        return f"Unable to load standings: {message}"
    except httpx.HTTPError as exc:
        LOGGER.exception("HTTP error while loading standings resource")
        return f"Unable to reach backend API while loading standings: {exc}"

    leader = standings[0]["team_name"] if standings else "No teams available"
    lines = [
        "Foosball League Standings",
        f"Leader: {leader}",
        "",
    ]
    for index, entry in enumerate(standings, start=1):
        lines.append(
            f"{index}. {entry['team_name']} ({entry['team_id']}) - "
            f"Pool {entry['pool']} | Pts {entry['points']} | "
            f"Played {entry['played']} | GD {entry['gd']}"
        )
    return "\n".join(lines)


@mcp.resource("foosball://teams")
async def teams_resource() -> str:
    """Return all teams with statistics."""
    LOGGER.info("Loading teams resource")
    try:
        teams = await _get_json("/teams/")
    except httpx.HTTPStatusError as exc:
        message = _extract_error_message(exc.response)
        LOGGER.warning("Teams resource failed: %s", message)
        return f"Unable to load teams: {message}"
    except httpx.HTTPError as exc:
        LOGGER.exception("HTTP error while loading teams resource")
        return f"Unable to reach backend API while loading teams: {exc}"

    lines = ["Foosball League Teams", ""]
    for team in teams:
        lines.append(
            f"- {team['team_name']} ({team['team_id']}) | Club: {team['club']} | "
            f"Pool {team['pool']} | W {team['win']} | L {team['loss']} | "
            f"GF {team['gf']} | GA {team['ga']} | GD {team['gd']} | Pts {team['points']}"
        )
    return "\n".join(lines)


@mcp.resource("foosball://matches/recent")
async def recent_matches_resource() -> str:
    """Return recently played matches."""
    LOGGER.info("Loading recent matches resource")
    try:
        matches = await _get_json("/matches/")
    except httpx.HTTPStatusError as exc:
        message = _extract_error_message(exc.response)
        LOGGER.warning("Recent matches resource failed: %s", message)
        return f"Unable to load recent matches: {message}"
    except httpx.HTTPError as exc:
        LOGGER.exception("HTTP error while loading recent matches resource")
        return f"Unable to reach backend API while loading recent matches: {exc}"

    played_matches = [match for match in matches if match.get("status") == "played"]
    played_matches.sort(key=lambda item: (item.get("round", 0), item.get("match_id", "")), reverse=True)

    lines = ["Recent Foosball Matches", ""]
    for match in played_matches[:10]:
        lines.append(
            f"- Round {match['round']}: {match['team_a']} {match['score_a']} - "
            f"{match['score_b']} {match['team_b']} ({match['match_id']})"
        )
    return "\n".join(lines)


@mcp.resource("foosball://matches/upcoming")
async def upcoming_matches_resource() -> str:
    """Return upcoming scheduled matches."""
    LOGGER.info("Loading upcoming matches resource")
    try:
        matches = await _get_json("/matches/")
    except httpx.HTTPStatusError as exc:
        message = _extract_error_message(exc.response)
        LOGGER.warning("Upcoming matches resource failed: %s", message)
        return f"Unable to load upcoming matches: {message}"
    except httpx.HTTPError as exc:
        LOGGER.exception("HTTP error while loading upcoming matches resource")
        return f"Unable to reach backend API while loading upcoming matches: {exc}"

    scheduled_matches = [match for match in matches if match.get("status") == "scheduled"]
    scheduled_matches.sort(key=lambda item: (item.get("round", 0), item.get("match_id", "")))

    lines = ["Upcoming Foosball Matches", ""]
    for match in scheduled_matches[:10]:
        lines.append(
            f"- Round {match['round']}: {match['team_a']} vs {match['team_b']} "
            f"({match['match_id']})"
        )
    return "\n".join(lines)


__all__ = [
    "standings_resource",
    "teams_resource",
    "recent_matches_resource",
    "upcoming_matches_resource",
]

# Made with Bob
