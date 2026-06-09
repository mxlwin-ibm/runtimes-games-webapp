"""MCP prompts for Foosball League analysis workflows."""

from __future__ import annotations

from fl_mcp.server import mcp


@mcp.prompt()
def analyze_league_standings() -> str:
    """Generate a prompt for analyzing current league standings."""
    return (
        "Analyze the current foosball league standings from the foosball://standings resource. "
        "Identify the league leader, explain the ranking order using points, goal difference, "
        "and goals scored, and highlight any close title races or relegation-style pressure."
    )


@mcp.prompt()
def compare_teams(team_one: str, team_two: str) -> str:
    """Generate a prompt for comparing two teams."""
    return (
        f"Compare the teams '{team_one}' and '{team_two}' using the foosball://teams, "
        "foosball://standings, and foosball://matches/recent resources. Evaluate form, "
        "goal production, defensive record, and likely competitive edge."
    )


@mcp.prompt()
def predict_match_outcome(team_one: str, team_two: str) -> str:
    """Generate a prompt for predicting a match outcome."""
    return (
        f"Predict the outcome of a foosball match between '{team_one}' and '{team_two}'. "
        "Use foosball://teams, foosball://standings, foosball://matches/recent, and "
        "foosball://matches/upcoming to justify the prediction with current statistics and form."
    )


@mcp.prompt()
def season_summary() -> str:
    """Generate a prompt for a comprehensive season summary."""
    return (
        "Create a comprehensive season summary for the foosball league using "
        "foosball://standings, foosball://teams, foosball://matches/recent, and "
        "foosball://matches/upcoming. Cover title contenders, mid-table trends, "
        "recent momentum, and what to watch next."
    )


@mcp.prompt()
def top_performers() -> str:
    """Generate a prompt for identifying top-performing teams."""
    return (
        "Identify the top-performing foosball teams using foosball://standings, "
        "foosball://teams, and foosball://matches/recent. Rank the strongest teams, "
        "explain why they stand out, and cite the most relevant supporting statistics."
    )


__all__ = [
    "analyze_league_standings",
    "compare_teams",
    "predict_match_outcome",
    "season_summary",
    "top_performers",
]

# Made with Bob

