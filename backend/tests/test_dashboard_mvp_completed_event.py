"""
Regression test: completed event (final played) must return playoff-inclusive
MVP stats from the dashboard endpoint, not None.

Bug (before fix):
  When a tournament's final was played, the dashboard route filtered the event
  out of ongoing_events_data and fell into the else-branch, which hard-coded
  mvp = None.  The frontend then fell back to the league-only pointsTable,
  showing only the league wins/goals (e.g. 3 wins, 30 goals for Vikings-4)
  instead of the full playoff-inclusive totals (6 wins, 60 goals).

Fix (backend/routes/dashboard.py):
  The else-branch now calls build_mvp(selected_event_lower) so that a
  completed event always gets playoff-inclusive MVP stats.

Scenario used in this test:
  - Alpha-1 beats Beta-1  (league,   3-0)
  - Alpha-1 beats Gamma-1 (QF,       2-0)
  - Alpha-1 beats Delta-1 (semi_final,2-0)
  - Alpha-1 beats Epsilon-1 (final,  1-0)  ← this completes the tournament
  build_mvp must return played=4, won=4, gf=8.
"""

import pytest
from backend.database import get_database, connect_to_mongo, close_mongo_connection
from backend.routes.dashboard import build_mvp


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    connect_to_mongo()
    yield
    close_mongo_connection()


@pytest.fixture(autouse=True)
def clean_db():
    db = get_database()
    db.subteams.delete_many({"event": "cet_test"})
    db.matches.delete_many({"event": "cet_test"})
    yield
    db.subteams.delete_many({"event": "cet_test"})
    db.matches.delete_many({"event": "cet_test"})


def _subteam(db, team, sid, pool="A"):
    db.subteams.insert_one(
        {"event": "cet_test", "team": team, "subteam_id": sid, "pool": pool, "player_ids": []}
    )


def _match(db, t1, s1, t2, s2, sc1, sc2, mtype="league"):
    db.matches.insert_one(
        {
            "event": "cet_test",
            "team1": t1, "team1_subid": str(s1),
            "team2": t2, "team2_subid": str(s2),
            "team1_score": sc1, "team2_score": sc2,
            "match_status": "played",
            "match_type": mtype,
            "round": 1,
            "match_date": "2025-01-01",
            "match_time": "10:00",
        }
    )


class TestCompletedEventMvp:
    """
    Regression: build_mvp must return playoff-inclusive stats even when the
    tournament is complete (final played), not fall back to league-only numbers.
    """

    def test_build_mvp_returns_playoff_inclusive_after_final(self):
        """
        4 matches played (1 league + 3 playoff): build_mvp must see all 4.
        Before the fix the else-branch returned None; the frontend showed
        only the league stats (1 win) via the pointsTable fallback.
        """
        db = get_database()
        for team, sid, pool in [
            ("Alpha", 1, "A"), ("Beta",    1, "A"),
            ("Gamma", 1, "B"), ("Delta",   1, "B"),
            ("Epsilon", 1, "C"),
        ]:
            _subteam(db, team, sid, pool)

        _match(db, "Alpha", 1, "Beta",    1, 3, 0, "league")
        _match(db, "Alpha", 1, "Gamma",   1, 2, 0, "quarter_final")
        _match(db, "Alpha", 1, "Delta",   1, 2, 0, "semi_final")
        _match(db, "Alpha", 1, "Epsilon", 1, 1, 0, "final")   # tournament complete

        mvp = build_mvp("cet_test")

        assert mvp is not None, "build_mvp must not return None after final is played"
        assert mvp["team_name"] == "Alpha-1"
        assert mvp["played"] == 4, (
            f"Expected played=4 (league+QF+SF+final), got {mvp['played']}. "
            "build_mvp is not counting playoff matches."
        )
        assert mvp["won"] == 4,   f"Expected won=4, got {mvp['won']}"
        assert mvp["gf"]  == 8,   f"Expected gf=8, got {mvp['gf']}"

    def test_build_mvp_league_only_subset_before_playoffs(self):
        """Baseline: with only league matches, build_mvp still works correctly."""
        db = get_database()
        _subteam(db, "Alpha", 1, "A")
        _subteam(db, "Beta",  1, "A")

        _match(db, "Alpha", 1, "Beta", 1, 3, 0, "league")

        mvp = build_mvp("cet_test")

        assert mvp is not None
        assert mvp["played"] == 1
        assert mvp["won"]    == 1
        assert mvp["gf"]     == 3

    def test_build_mvp_correctly_ranks_by_total_playoff_wins(self):
        """
        Two teams with the same league record but Alpha won the playoffs.
        build_mvp must pick Alpha because of its higher total wins/points.
        """
        db = get_database()
        for team, sid, pool in [
            ("Alpha", 1, "A"), ("Beta",  1, "A"),
            ("Gamma", 1, "B"), ("Delta", 1, "B"),
        ]:
            _subteam(db, team, sid, pool)

        # Identical league records
        _match(db, "Alpha", 1, "Beta",  1, 3, 0, "league")
        _match(db, "Gamma", 1, "Delta", 1, 3, 0, "league")

        # Alpha wins SF; Gamma loses SF
        _match(db, "Alpha", 1, "Gamma", 1, 2, 0, "semi_final")
        _match(db, "Beta",  1, "Delta", 1, 2, 0, "semi_final")

        # Alpha wins the final
        _match(db, "Alpha", 1, "Beta",  1, 1, 0, "final")

        mvp = build_mvp("cet_test")

        assert mvp is not None
        # Alpha: 3 wins (league + SF + final) → 9 points
        # Beta:  1 league win + 1 SF win = 2 wins → 6 points
        assert mvp["team_name"] == "Alpha-1", (
            f"Expected Alpha-1 as MVP, got {mvp['team_name']}. "
            "Playoff wins must be counted in MVP ranking."
        )
        assert mvp["won"] == 3
