import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/api', () => ({
  getDashboard: vi.fn(),
  getPlayers: vi.fn().mockResolvedValue({ data: [] }),
  getMatches: vi.fn().mockResolvedValue({ data: [] }),
  getPointsTable: vi.fn().mockResolvedValue({ data: [] }),
  getSubteams: vi.fn().mockResolvedValue({ data: [] }),
  getEvents: vi.fn().mockResolvedValue({ data: [] }),
  updateEvents: vi.fn(),
  getAnnouncements: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false }),
}));

import { getDashboard } from '../../services/api';
import Dashboard from '../Dashboard';

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );

/**
 * Finds the "Current MVP" card tile by looking for the "Current MVP" tag,
 * then returning its nearest ClickableTile ancestor.
 */
const getMvpCard = () => {
  const mvpTag = screen.getByText('Current MVP');
  // The tag is inside the ClickableTile — walk up to the tile container
  return mvpTag.closest('.cds--tile') ?? mvpTag.parentElement?.parentElement;
};

/**
 * Regression: the MVP card must display the playoff-inclusive stats that come
 * from ongoingEvents[x].mvp (built with include_playoffs=True on the backend),
 * NOT the league-only stats from pointsTable / ongoingEvents[x].standings.
 *
 * Scenario:
 *   - League stats: played=3, won=2, gf=8  (what the standings table shows)
 *   - MVP stats   : played=5, won=4, gf=12 (league + 2 QF/SF wins)
 *
 * The MVP card must show 4 wins and "80%" win ratio, not 2 wins and "67%".
 */
describe('Dashboard MVP card – shows playoff-inclusive stats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows playoff-inclusive wins and win ratio, not league-only stats', async () => {
    const leagueOnlyStandings = [
      {
        team_id: 'Alice, Bob',
        team_name: 'Vikings-1',
        played: 3,    // league only
        won: 2,
        lost: 1,
        gf: 8,
        gd: 4,
        points: 6,
      },
    ];

    const playoffInclusiveMvp = {
      team_name: 'Vikings-1',
      team_id: 'Alice, Bob',
      played: 5,   // league + QF + SF
      won: 4,
      lost: 1,
      gf: 12,
      gd: 7,
      points: 12,
    };

    getDashboard.mockResolvedValue({
      data: {
        standings: leagueOnlyStandings,   // league-only — must NOT drive MVP card
        stats: null,
        events: [],
        announcements: [],
        ongoingEvents: [
          {
            event: 'foosball',
            stats: { playedMatches: 5, totalMatches: 6 },
            mvp: playoffInclusiveMvp,     // playoff-inclusive — must be used
          },
        ],
      },
    });

    renderDashboard();
    await screen.findByText('Alice, Bob');

    const card = getMvpCard();
    expect(card).not.toBeNull();

    // Must show the playoff-inclusive win count (4), not the league-only (2)
    expect(within(card).getByText('Wins')).toBeInTheDocument();
    expect(within(card).getByText('4')).toBeInTheDocument();
    expect(within(card).queryByText('2')).not.toBeInTheDocument();

    // Win ratio from playoffs: 4/5 = 80%, not league-only 2/3 = 67%
    expect(within(card).getByText('80%')).toBeInTheDocument();
    expect(within(card).queryByText('67%')).not.toBeInTheDocument();

    // Goals from playoffs: 12, not league-only 8
    expect(within(card).getByText('Goals')).toBeInTheDocument();
    expect(within(card).getByText('12')).toBeInTheDocument();
    expect(within(card).queryByText('8')).not.toBeInTheDocument();
  });

  /**
   * When mvp is null (no ongoingEvents[x].mvp) the fallback reads pointsTable
   * which is the LEAGUE-ONLY standings. That's the known degraded path —
   * test that it at least doesn't crash and shows valid numbers.
   */
  it('falls back to pointsTable (league-only) when ongoingEvents mvp is null, without crashing', async () => {
    getDashboard.mockResolvedValue({
      data: {
        standings: [
          {
            team_id: 'Carol, Dave',
            team_name: 'Titans-1',
            played: 3,
            won: 2,
            lost: 1,
            gf: 9,
            gd: 3,
            points: 6,
          },
        ],
        stats: null,
        events: [],
        announcements: [],
        ongoingEvents: [
          {
            event: 'foosball',
            stats: { playedMatches: 3, totalMatches: 4 },
            mvp: null,  // forces pointsTable fallback
          },
        ],
      },
    });

    renderDashboard();
    await screen.findByText('Carol, Dave');

    const card = getMvpCard();
    expect(card).not.toBeNull();

    // Fallback shows league-only wins (2) — degraded but not broken
    expect(within(card).getByText('2')).toBeInTheDocument();
    expect(within(card).getByText('Win Ratio')).toBeInTheDocument();
    expect(within(card).queryByText('NaN%')).not.toBeInTheDocument();
  });
});
