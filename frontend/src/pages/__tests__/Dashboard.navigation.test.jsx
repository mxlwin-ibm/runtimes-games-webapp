import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../services/api', () => ({
  getDashboard: vi.fn().mockResolvedValue({
    data: {
      standings: [],
      stats: null,
      events: [],
      announcements: [],
      ongoingEvents: [
        { event: 'foosball', stats: { playedMatches: 0, totalMatches: 0 } },
        { event: 'cricket', stats: { playedMatches: 0, totalMatches: 0 } },
      ],
    },
  }),
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

import Dashboard from '../Dashboard';

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );

// Regression: dashboard quick-action buttons must navigate to real routes
// and carry the dashboard's selected event as the page filter.
describe('Dashboard quick-action navigation', () => {
  const cases = [
    ['View Match Schedule', '/matches'],
    ['Full Standings Table', '/points-table'],
    ['Squad Rosters', '/squads'],
  ];

  it.each(cases)('"%s" links to %s with the selected event', async (label, path) => {
    renderDashboard();
    const el = await screen.findByText(label);
    await waitFor(() => expect(el.closest('a')).not.toBeNull());
    expect(el.closest('a')).toHaveAttribute('href', `${path}?event=foosball`);
  });

  it.each(cases)('"%s" follows the event switched on the dashboard', async (label, path) => {
    renderDashboard();
    fireEvent.click(await screen.findByText(/^CRICKET/));
    const el = await screen.findByText(label);
    await waitFor(() =>
      expect(el.closest('a')).toHaveAttribute('href', `${path}?event=cricket`)
    );
  });
});
