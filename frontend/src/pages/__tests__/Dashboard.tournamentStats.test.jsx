import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/api', () => ({
  getDashboard: vi.fn(),
  getPlayers: vi.fn().mockResolvedValue({ data: [] }),
  getMatches: vi.fn(),
  getPointsTable: vi.fn().mockResolvedValue({ data: [] }),
  getSubteams: vi.fn().mockResolvedValue({ data: [] }),
  getEvents: vi.fn().mockResolvedValue({ data: [] }),
  updateEvents: vi.fn(),
  getAnnouncements: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false }),
}));

import { getDashboard, getMatches } from '../../services/api';
import Dashboard from '../Dashboard';

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );

/**
 * Returns the "X / Y Matches" progress text which is a unique string
 * combining both tournamentStats.completed and tournamentStats.matches.
 */
const getProgressText = () => {
  const el = screen.getByText(/\d+ \/ \d+ Matches/);
  return el.textContent.trim();
};

const makeMatch = (id, status = 'played') => ({
  _id: id,
  event: 'foosball',
  team1: 'Titans',
  team1_subid: '1',
  team2: 'Vikings',
  team2_subid: '2',
  team1_score: 3,
  team2_score: 1,
  match_status: status,
  match_type: 'league',
  round: 1,
});

/**
 * Regression: tournamentStats must be derived from the raw matches returned by
 * getMatches(), NOT from ongoingEvents[].stats which can be stale / wrong.
 *
 * Scenario that triggered the bug:
 *  - Backend cache contained ongoingEvents data with stale stats
 *    (e.g. totalMatches: 1, playedMatches: 0) for foosball even after the final
 *    was played, because the cache was written before our filter fix was deployed.
 *  - getMatches() returned the real data (many matches, all played).
 *  - The UI showed the wrong numbers because it trusted ongoingEvents.stats first.
 */
describe('Dashboard tournamentStats – computed from raw matches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows match count from getMatches, not from stale ongoingEvents stats', async () => {
    // ongoingEvents has stale stats: says 1 match, 0 played
    getDashboard.mockResolvedValue({
      data: {
        standings: [],
        stats: { totalMatches: 1, playedMatches: 0, totalTeams: 0, totalGoals: 0 },
        events: [],
        announcements: [],
        ongoingEvents: [
          { event: 'foosball', stats: { totalMatches: 1, playedMatches: 0, totalTeams: 0 } },
        ],
      },
    });

    // Real data: 5 matches, 3 played
    getMatches.mockResolvedValue({
      data: [
        makeMatch('m1', 'played'),
        makeMatch('m2', 'played'),
        makeMatch('m3', 'played'),
        makeMatch('m4', 'scheduled'),
        makeMatch('m5', 'scheduled'),
      ],
    });

    renderDashboard();
    await screen.findByRole('heading', { name: 'FOOSBALL' });

    // Progress bar text shows "completed / total Matches" from raw match data
    // Must read "3 / 5 Matches" (from getMatches), not "0 / 1 Matches" (stale cache)
    expect(getProgressText()).toBe('3 / 5 Matches');
  });

  it('shows "No ongoing events" state (not FOOSBALL) when ongoingEvents is empty', async () => {
    // Backend filtered foosball out — no ongoing events remain
    getDashboard.mockResolvedValue({
      data: {
        standings: [],
        stats: { totalMatches: 4, playedMatches: 4, totalTeams: 8, totalGoals: 20 },
        events: [],
        announcements: [],
        ongoingEvents: [], // foosball excluded – tournament complete
      },
    });

    getMatches.mockResolvedValue({
      data: [
        makeMatch('m1', 'played'),
        makeMatch('m2', 'played'),
        makeMatch('m3', 'played'),
        makeMatch('m4', 'played'),
      ],
    });

    renderDashboard();
    // Must show the empty-state tile, not a FOOSBALL hero section
    await screen.findByText('No ongoing events');
    expect(screen.queryByRole('heading', { name: 'FOOSBALL' })).not.toBeInTheDocument();
    // No progress bar rendered when there are no ongoing events
    expect(screen.queryByText(/\d+ \/ \d+ Matches/)).not.toBeInTheDocument();
  });

  it('shows 0 completed when no matches are played yet, ignoring stale ongoingEvents cache', async () => {
    getDashboard.mockResolvedValue({
      data: {
        standings: [],
        stats: null,
        events: [],
        announcements: [],
        ongoingEvents: [
          // stale cache reports 99 total / 50 played
          { event: 'foosball', stats: { totalMatches: 99, playedMatches: 50, totalTeams: 8 } },
        ],
      },
    });

    // Real data: 3 scheduled, none played
    getMatches.mockResolvedValue({
      data: [
        makeMatch('m1', 'scheduled'),
        makeMatch('m2', 'scheduled'),
        makeMatch('m3', 'scheduled'),
      ],
    });

    renderDashboard();
    await screen.findByRole('heading', { name: 'FOOSBALL' });

    // Progress: "0 / 3 Matches" (from raw), not "50 / 99 Matches" (stale cache)
    expect(getProgressText()).toBe('0 / 3 Matches');

    // Stale values must not appear anywhere on the page
    expect(screen.queryByText('99')).not.toBeInTheDocument();
    expect(screen.queryByText('50')).not.toBeInTheDocument();
  });
});
