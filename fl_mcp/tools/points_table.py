"""MCP tools for league standings and points table access."""

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


@mcp.tool()
async def get_points_table(pool: str | None = None) -> dict[str, Any]:
    """Retrieve the current league points table.

    Args:
        pool: Optional pool filter. When provided, only standings for the specified pool are returned.

    Returns:
        A structured dictionary containing standings entries and summary metadata.
    """
    LOGGER.info("Fetching points table with pool filter: %s", pool)

    async with create_async_client() as client:
        try:
            response = await client.get("/points-table/")
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            message = _extract_error_message(exc.response)
            LOGGER.warning("Fetching points table failed: %s", message)
            return {
                "success": False,
                "error": message,
                "status_code": exc.response.status_code,
                "standings": [],
            }
        except httpx.HTTPError as exc:
            LOGGER.exception("HTTP error while fetching points table")
            return {
                "success": False,
                "error": f"Unable to reach backend API: {exc}",
                "standings": [],
            }

    standings: list[dict[str, Any]] = response.json()
    normalized_pool = pool.upper() if pool else None

    if normalized_pool is not None:
        standings = [entry for entry in standings if str(entry.get("pool", "")).upper() == normalized_pool]

    return {
        "success": True,
        "pool": normalized_pool,
        "count": len(standings),
        "leader": standings[0] if standings else None,
        "standings": standings,
    }

# Made with Bob
