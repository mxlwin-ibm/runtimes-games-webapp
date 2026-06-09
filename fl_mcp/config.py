"""Configuration and shared HTTP client utilities for the Foosball League MCP server."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass

import httpx

LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class MCPSettings:
    """Runtime configuration for the MCP server."""

    backend_api_base_url: str = os.getenv("FOOSBALL_API_BASE_URL", "http://localhost:8000").rstrip("/")
    request_timeout_seconds: float = float(os.getenv("FOOSBALL_API_TIMEOUT", "10.0"))
    connect_timeout_seconds: float = float(os.getenv("FOOSBALL_API_CONNECT_TIMEOUT", "5.0"))
    max_connections: int = int(os.getenv("FOOSBALL_API_MAX_CONNECTIONS", "20"))
    max_keepalive_connections: int = int(os.getenv("FOOSBALL_API_MAX_KEEPALIVE_CONNECTIONS", "10"))

    @property
    def timeout(self) -> httpx.Timeout:
        """Build an httpx timeout configuration."""
        return httpx.Timeout(
            timeout=self.request_timeout_seconds,
            connect=self.connect_timeout_seconds,
        )

    @property
    def limits(self) -> httpx.Limits:
        """Build an httpx connection pool limits configuration."""
        return httpx.Limits(
            max_connections=self.max_connections,
            max_keepalive_connections=self.max_keepalive_connections,
        )


settings = MCPSettings()


def create_async_client() -> httpx.AsyncClient:
    """Create a configured async HTTP client for backend API access."""
    LOGGER.debug("Creating AsyncClient for Foosball API at %s", settings.backend_api_base_url)
    return httpx.AsyncClient(
        base_url=settings.backend_api_base_url,
        timeout=settings.timeout,
        limits=settings.limits,
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "foosball-league-mcp/1.0",
        },
    )

