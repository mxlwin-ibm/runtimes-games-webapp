"""Main MCP server entrypoint for the Foosball League backend."""

from fastmcp import FastMCP

mcp = FastMCP("foosball-league")

from fl_mcp.tools import matches, points_table, teams  # noqa: E402,F401
from fl_mcp.resources import *  # noqa: F403,E402
from fl_mcp.prompts import *  # noqa: F403,E402

__all__ = ["mcp"]


if __name__ == "__main__":
    mcp.run(transport="stdio")


