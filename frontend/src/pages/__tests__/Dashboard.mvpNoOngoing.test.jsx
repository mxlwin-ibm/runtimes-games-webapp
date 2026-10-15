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

const getMvpCard = () => {
  const tag = screen.getByText('Current MVP');
  return tag.closest('.cds--tile') ?? tag.parentElement?.parentElement;
};

/**
 * Regression: when ongoingEvents is empty (all tournaments complete) the
 * "Current MVP" card must show "No data available", NOT stale standings data.
 *
 * Before the fix, calculateMVP() fell through to the pointsTable fallback
 * even when ongoingEvents was empty, displaying the top standings entry as
 * if the tournament were still live.
 */
describe('Dashboard MVP card – no ongoing events', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows "No data available" when ongoingEvents is empty, even if standings exist', async () => {
    getDashboard.mockResolvedValue({
      data: {
        // standings has data — this must NOT be used to populate the MVP card
        standings: [
          {
            team_id: 'Akash, Pardhiv',
            team_name: 'Vikings-4',
            played: 6,
            won: 6,
            lost: 0,
            gf: 60,
            gd: 41,
            points: 18,
          },
        ],
        stats: null,
        events: [],
        announcements: [],
        ongoingEvents: [],   // all tournaments complete — no ongoing event
      },
    });

    renderDashboard();
    // The "No ongoing events" hero tile must appear
    await screen.findByText('No ongoing events');

    // The MVP card must NOT show player names or stats from standings
    expect(screen.queryByText('Akash, Pardhiv')).not.toBeInTheDocument();
    expect(screen.queryByText('Vikings-4')).not.toBeInTheDocument();

    // The MVP card must show its empty-state message
    const card = getMvpCard();
    expect(within(card).getByText('No data available')).toBeInTheDocument();
  });

  it('still shows MVP when at least one event is ongoing', async () => {
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
            mvp: {
              team_name: 'Vikings-4',
              team_id: 'Akash, Pardhiv',
              played: 3,
              won: 3,
              gf: 30,
            },
          },
        ],
      },
    });

    renderDashboard();
    await screen.findByText('Akash, Pardhiv');

    const card = getMvpCard();
    expect(within(card).getByText('Akash, Pardhiv')).toBeInTheDocument();
    expect(within(card).queryByText('No data available')).not.toBeInTheDocument();
  });
});
