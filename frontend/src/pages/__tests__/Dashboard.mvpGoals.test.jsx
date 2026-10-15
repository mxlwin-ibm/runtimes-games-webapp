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

const mvp = {
  team_name: 'Vikings-1',
  team_id: 'Alice, Bob',
  played: 4,
  won: 3,
  gf: 21,
};

const mockEvent = (event) =>
  getDashboard.mockResolvedValue({
    data: {
      standings: [],
      stats: null,
      events: [],
      announcements: [],
      ongoingEvents: [{ event, stats: { playedMatches: 0, totalMatches: 0 }, mvp }],
    },
  });

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );

// Regression: the MVP card shows Goals only for goal-based events.
describe('Dashboard MVP card goals', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['foosball', 'football'])('shows Goals for %s', async (event) => {
    mockEvent(event);
    renderDashboard();
    await screen.findByText('Alice, Bob');
    expect(screen.getByText('Goals')).toBeInTheDocument();
    expect(screen.getByText('21')).toBeInTheDocument();
  });

  it.each(['cricket', 'snooker', 'chess', 'carroms', 'badminton', 'table tennis'])(
    'hides Goals for %s',
    async (event) => {
      mockEvent(event);
      renderDashboard();
      await screen.findByText('Alice, Bob');
      expect(screen.queryByText('Goals')).not.toBeInTheDocument();
      expect(screen.getByText('Wins')).toBeInTheDocument();
      expect(screen.getByText('Win Ratio')).toBeInTheDocument();
    }
  );
});
