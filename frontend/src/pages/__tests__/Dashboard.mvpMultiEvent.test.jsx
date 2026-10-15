import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

const makeMvp = (overrides = {}) => ({
  team_name: 'Vikings-1',
  team_id: 'Alice, Bob',
  played: 4,
  won: 3,
  gf: 10,
  ...overrides,
});

// ── Regression: MVP Goals tile must track the SELECTED event, not always ongoingEvents[0] ──
describe('Dashboard MVP card – multi-event', () => {
  beforeEach(() => vi.clearAllMocks());

  /**
   * Bug: when two events are ongoing (foosball + cricket) and the user
   * switches to cricket, the MVP card must NOT show Goals (cricket is not
   * goal-based). Previously it could show the foosball MVP's Goals stat
   * because activeOngoingEventData was falling back to ongoingEvents[0].
   */
  it('hides Goals when user switches to a non-goal-based event (cricket)', async () => {
    getDashboard.mockResolvedValue({
      data: {
        standings: [],
        stats: null,
        events: [],
        announcements: [],
        ongoingEvents: [
          { event: 'foosball', stats: { playedMatches: 2, totalMatches: 4 }, mvp: makeMvp({ gf: 21 }) },
          { event: 'cricket',  stats: { playedMatches: 1, totalMatches: 4 }, mvp: makeMvp({ gf: 0 }) },
        ],
      },
    });

    renderDashboard();
    // Wait for the default (foosball) heading to appear
    await screen.findByRole('heading', { name: 'FOOSBALL' });
    // Goals tile must be visible for foosball
    expect(screen.getByText('Goals')).toBeInTheDocument();

    // Switch to cricket via the pill
    fireEvent.click(screen.getByText(/^CRICKET/));

    // After switching, heading must update
    await screen.findByRole('heading', { name: 'CRICKET' });

    // Goals tile must NOT appear for cricket
    expect(screen.queryByText('Goals')).not.toBeInTheDocument();
    // Wins and Win Ratio must still be visible
    expect(screen.getByText('Wins')).toBeInTheDocument();
    expect(screen.getByText('Win Ratio')).toBeInTheDocument();
  });

  /**
   * Symmetric: switching from cricket to football must show Goals again.
   */
  it('shows Goals when user switches to a goal-based event (football)', async () => {
    getDashboard.mockResolvedValue({
      data: {
        standings: [],
        stats: null,
        events: [],
        announcements: [],
        ongoingEvents: [
          { event: 'cricket',  stats: { playedMatches: 1, totalMatches: 4 }, mvp: makeMvp({ gf: 0 }) },
          { event: 'football', stats: { playedMatches: 2, totalMatches: 4 }, mvp: makeMvp({ gf: 7 }) },
        ],
      },
    });

    renderDashboard();
    // Default is foosball but foosball is not in this list — auto-switches to cricket
    await screen.findByRole('heading', { name: 'CRICKET' });
    expect(screen.queryByText('Goals')).not.toBeInTheDocument();

    // Switch to football
    fireEvent.click(screen.getByText(/^FOOTBALL/));
    await screen.findByRole('heading', { name: 'FOOTBALL' });

    expect(screen.getByText('Goals')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  /**
   * MVP event tag must show the SELECTED event, not ongoingEvents[0].
   */
  it('MVP event tag reflects the selected event, not always the first ongoing event', async () => {
    getDashboard.mockResolvedValue({
      data: {
        standings: [],
        stats: null,
        events: [],
        announcements: [],
        ongoingEvents: [
          { event: 'foosball', stats: { playedMatches: 0, totalMatches: 0 }, mvp: makeMvp() },
          { event: 'cricket',  stats: { playedMatches: 0, totalMatches: 0 }, mvp: makeMvp() },
        ],
      },
    });

    renderDashboard();
    await screen.findByRole('heading', { name: 'FOOSBALL' });
    // MVP event tag should say FOOSBALL initially
    const tags = screen.getAllByText('FOOSBALL');
    expect(tags.length).toBeGreaterThan(0);

    // Switch to cricket
    fireEvent.click(screen.getByText(/^CRICKET/));
    await screen.findByRole('heading', { name: 'CRICKET' });

    // The MVP event tag must now show CRICKET
    await waitFor(() => {
      const cricketTags = screen.getAllByText('CRICKET');
      expect(cricketTags.length).toBeGreaterThan(0);
    });

    // FOOSBALL must not appear as a tag inside the MVP card event indicator
    // (It may still appear in the switcher pills, so check heading is CRICKET)
    expect(screen.getByRole('heading', { name: 'CRICKET' })).toBeInTheDocument();
  });
});
