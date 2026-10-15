"""
Regression tests: calculate_points_table(include_playoffs=True) must count
league + QF + SF + Final match stats for MVP calculation.

Scenario that triggers the bug:
  - TeamA beats TeamB in a league match (played=1, won=1)
  - TeamA beats TeamC in a QF match (played=1, won=1)
  After the final is played, TeamA's MVP stats must show played=2, won=2.
  Before the fix, only league matches were counted when include_playoffs was
  incorrectly not passed to build_mvp, making played=1, won=1.
"""

import pytest
from backend.database import get_database, connect_to_mongo, close_mongo_connection
from backend.services.points_table import calculate_points_table
from backend.routes.dashboard import build_mvp


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    connect_to_mongo()
    yield
    close_mongo_connection()


@pytest.fixture(autouse=True)
def clean_db():
    db = get_database()
    db.subteams.delete_many({"event": "mvp_test"})
    db.matches.delete_many({"event": "mvp_test"})
    db.players.delete_many({"team": "MVPTeam"})
    yield
    db.subteams.delete_many({"event": "mvp_test"})
    db.matches.delete_many({"event": "mvp_test"})
    db.players.delete_many({"team": "MVPTeam"})


def _insert_subteam(db, team, subteam_id, pool="A"):
    db.subteams.insert_one({
        "event": "mvp_test",
        "team": team,
        "subteam_id": subteam_id,
        "pool": pool,
        "player_ids": [],
    })


def _insert_match(db, team1, sub1, team2, sub2, score1, score2, match_type="league"):
    db.matches.insert_one({
        "event": "mvp_test",
        "team1": team1,
        "team1_subid": str(sub1),
        "team2": team2,
        "team2_subid": str(sub2),
        "team1_score": score1,
        "team2_score": score2,
        "match_status": "played",
        "match_type": match_type,
        "round": 1,
        "match_date": "2025-01-01",
        "match_time": "10:00",
    })


# ── Regression: include_playoffs=True must count QF/SF/Final matches ────────

class TestMvpIncludesPlayoffs:

    def test_league_only_baseline(self):
        """With include_playoffs=False, only league matches count."""
        db = get_database()
        _insert_subteam(db, "Alpha", 1, pool="A")
        _insert_subteam(db, "Beta",  1, pool="A")

        _insert_match(db, "Alpha", 1, "Beta", 1, 3, 0, match_type="league")

        result = calculate_points_table("mvp_test", include_playoffs=False)
        alpha = next(r for r in result if r["team_name"] == "Alpha-1")

        assert alpha["played"] == 1
        assert alpha["won"]    == 1
        assert alpha["gf"]     == 3

    def test_include_playoffs_adds_qf_match(self):
        """
        Regression: with include_playoffs=True, a QF win is counted on top of
        the league win.  Without the fix the QF match would be silently dropped
        and played/won would still be 1.
        """
        db = get_database()
        _insert_subteam(db, "Alpha", 1, pool="A")
        _insert_subteam(db, "Beta",  1, pool="A")
        _insert_subteam(db, "Gamma", 1, pool="B")

        # League match
        _insert_match(db, "Alpha", 1, "Beta",  1, 3, 0, match_type="league")
        # Quarter-final (resolved — real teams, no placeholder subid)
        _insert_match(db, "Alpha", 1, "Gamma", 1, 2, 1, match_type="quarter_final")

        result = calculate_points_table("mvp_test", include_playoffs=True)
        alpha = next(r for r in result if r["team_name"] == "Alpha-1")

        # Must see both matches
        assert alpha["played"] == 2, f"expected played=2, got {alpha['played']}"
        assert alpha["won"]    == 2, f"expected won=2, got {alpha['won']}"
        assert alpha["gf"]     == 5, f"expected gf=5, got {alpha['gf']}"

    def test_include_playoffs_adds_sf_and_final(self):
        """SF and Final matches must both be counted."""
        db = get_database()
        _insert_subteam(db, "Alpha", 1, pool="A")
        _insert_subteam(db, "Beta",  1, pool="A")
        _insert_subteam(db, "Gamma", 1, pool="B")
        _insert_subteam(db, "Delta", 1, pool="B")

        _insert_match(db, "Alpha", 1, "Beta",  1, 3, 0, match_type="league")
        _insert_match(db, "Alpha", 1, "Gamma", 1, 2, 0, match_type="semi_final")
        _insert_match(db, "Alpha", 1, "Delta", 1, 1, 0, match_type="final")

        result = calculate_points_table("mvp_test", include_playoffs=True)
        alpha = next(r for r in result if r["team_name"] == "Alpha-1")

        assert alpha["played"] == 3, f"expected played=3, got {alpha['played']}"
        assert alpha["won"]    == 3, f"expected won=3, got {alpha['won']}"
        assert alpha["gf"]     == 6, f"expected gf=6, got {alpha['gf']}"

    def test_include_playoffs_false_does_not_count_qf(self):
        """include_playoffs=False must exclude non-league matches."""
        db = get_database()
        _insert_subteam(db, "Alpha", 1, pool="A")
        _insert_subteam(db, "Beta",  1, pool="A")
        _insert_subteam(db, "Gamma", 1, pool="B")

        _insert_match(db, "Alpha", 1, "Beta",  1, 3, 0, match_type="league")
        _insert_match(db, "Alpha", 1, "Gamma", 1, 2, 0, match_type="quarter_final")

        result = calculate_points_table("mvp_test", include_playoffs=False)
        alpha = next(r for r in result if r["team_name"] == "Alpha-1")

        # Only the league match counted
        assert alpha["played"] == 1
        assert alpha["won"]    == 1
        assert alpha["gf"]     == 3


class TestBuildMvpIncludesPlayoffs:

    def test_build_mvp_uses_include_playoffs(self):
        """
        Regression: build_mvp() must return played/won/gf that include
        playoff matches, not just league matches.
        """
        db = get_database()
        _insert_subteam(db, "Alpha", 1, pool="A")
        _insert_subteam(db, "Beta",  1, pool="A")
        _insert_subteam(db, "Gamma", 1, pool="B")

        _insert_match(db, "Alpha", 1, "Beta",  1, 3, 0, match_type="league")
        _insert_match(db, "Alpha", 1, "Gamma", 1, 2, 1, match_type="semi_final")

        mvp = build_mvp("mvp_test")

        assert mvp is not None
        assert mvp["team_name"] == "Alpha-1"
        # Must include both league + semi-final
        assert mvp["played"] == 2, f"MVP played should be 2, got {mvp['played']}"
        assert mvp["won"]    == 2, f"MVP won should be 2, got {mvp['won']}"
        assert mvp["gf"]     == 5, f"MVP gf should be 5, got {mvp['gf']}"

    def test_build_mvp_played_reflects_loss_in_playoff(self):
        """A playoff loss must increment played but not won."""
        db = get_database()
        _insert_subteam(db, "Alpha", 1, pool="A")
        _insert_subteam(db, "Beta",  1, pool="A")
        _insert_subteam(db, "Gamma", 1, pool="B")

        _insert_match(db, "Alpha", 1, "Beta",  1, 3, 0, match_type="league")
        # Alpha loses the final
        _insert_match(db, "Alpha", 1, "Gamma", 1, 0, 2, match_type="final")

        mvp = build_mvp("mvp_test")

        assert mvp is not None
        # Alpha: played=2, won=1 (league win), lost=1 (final loss)
        alpha_result = next(
            (r for r in calculate_points_table("mvp_test", include_playoffs=True)
             if r["team_name"] == "Alpha-1"),
            None
        )
        assert alpha_result is not None
        assert alpha_result["played"] == 2
        assert alpha_result["won"]    == 1
        assert alpha_result["lost"]   == 1
