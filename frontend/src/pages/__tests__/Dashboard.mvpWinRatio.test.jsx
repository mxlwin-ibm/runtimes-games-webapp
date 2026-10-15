import { render, screen } from '@testing-library/react';
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
 * Regression: MVP winRatio must never display "NaN%" when `won` is missing/zero.
 *
 * The bug: calculateMVP() used mvp.won directly in the division without
 * guarding against undefined:
 *   Math.round((mvp.won / mvp.played) * 100)
 * If `won` is absent from the backend payload, this produces NaN, and
 * the rendered string becomes "NaN%".
 *
 * Fix: use (mvp.won ?? 0) so that a missing won field is treated as 0.
 */
describe('Dashboard MVP card – winRatio safety', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows "0%" win ratio (not "NaN%") when mvp.won is missing', async () => {
    getDashboard.mockResolvedValue({
      data: {
        standings: [],
        stats: null,
        events: [],
        announcements: [],
        ongoingEvents: [
          {
            event: 'foosball',
            stats: { playedMatches: 3, totalMatches: 4 },
            // `won` field is intentionally absent to simulate a stale/partial cache
            mvp: { team_name: 'Titans-2', team_id: 'Carol, Dave', played: 3, gf: 12 },
          },
        ],
      },
    });

    renderDashboard();
    await screen.findByText('Carol, Dave');

    // Win Ratio tile must be present
    expect(screen.getByText('Win Ratio')).toBeInTheDocument();

    // The win ratio must NOT be "NaN%" — it should be "0%"
    expect(screen.queryByText('NaN%')).not.toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows "0%" win ratio (not "NaN%") when mvp.played is zero and mvp.won is missing', async () => {
    getDashboard.mockResolvedValue({
      data: {
        standings: [],
        stats: null,
        events: [],
        announcements: [],
        ongoingEvents: [
          {
            event: 'foosball',
            stats: { playedMatches: 0, totalMatches: 4 },
            mvp: { team_name: 'El Dragos-1', team_id: 'Eve, Frank', played: 0, gf: 0 },
          },
        ],
      },
    });

    renderDashboard();
    await screen.findByText('Eve, Frank');

    expect(screen.queryByText('NaN%')).not.toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows correct win ratio when both won and played are present', async () => {
    getDashboard.mockResolvedValue({
      data: {
        standings: [],
        stats: null,
        events: [],
        announcements: [],
        ongoingEvents: [
          {
            event: 'foosball',
            stats: { playedMatches: 4, totalMatches: 4 },
            mvp: { team_name: 'Vikings-1', team_id: 'Grace, Hank', played: 4, won: 3, gf: 15 },
          },
        ],
      },
    });

    renderDashboard();
    await screen.findByText('Grace, Hank');

    expect(screen.queryByText('NaN%')).not.toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  /**
   * Same NaN regression but for the pointsTable fallback path:
   * when activeOngoingEventData has no mvp and pointsTable has an entry
   * with a missing `won` field.
   */
  it('shows "0%" win ratio (not "NaN%") from pointsTable fallback when won is missing', async () => {
    getDashboard.mockResolvedValue({
      data: {
        // standings has an entry with no `won` field
        standings: [
          { team_id: 'Ivan, Judy', team_name: 'Gladiators-1', played: 2, gf: 5 },
        ],
        stats: null,
        events: [],
        announcements: [],
        // mvp is null — forces pointsTable fallback
        ongoingEvents: [
          {
            event: 'foosball',
            stats: { playedMatches: 2, totalMatches: 4 },
            mvp: null,
          },
        ],
      },
    });

    renderDashboard();
    await screen.findByText('Ivan, Judy');

    expect(screen.getByText('Win Ratio')).toBeInTheDocument();
    expect(screen.queryByText('NaN%')).not.toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
