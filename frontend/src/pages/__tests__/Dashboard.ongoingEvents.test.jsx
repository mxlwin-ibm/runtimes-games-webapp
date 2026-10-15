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

const makeEvent = (name, overrides = {}) => ({
  event: name,
  stats: { playedMatches: 0, totalMatches: 0 },
  ...overrides,
});

// ── Regression: "League Stage · Round N" subtitle must not appear ──────────

describe('Dashboard event title subtitle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not render "League Stage" below the event title', async () => {
    getDashboard.mockResolvedValue({
      data: {
        standings: [],
        stats: null,
        events: [],
        announcements: [],
        ongoingEvents: [makeEvent('foosball')],
      },
    });
    renderDashboard();
    // Wait for the hero h2 to appear
    await screen.findByRole('heading', { name: 'FOOSBALL' });
    expect(screen.queryByText(/League Stage/)).not.toBeInTheDocument();
  });

  it('does not render "Round N" below the event title', async () => {
    getDashboard.mockResolvedValue({
      data: {
        standings: [],
        stats: null,
        events: [],
        announcements: [],
        ongoingEvents: [makeEvent('foosball')],
      },
    });
    renderDashboard();
    await screen.findByRole('heading', { name: 'FOOSBALL' });
    expect(screen.queryByText(/Round \d/)).not.toBeInTheDocument();
  });
});

// ── Regression: completed events (final played) must not appear in Ongoing ─

describe('Dashboard ongoing events – completed event filtering', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows an event that has no final matches as ongoing', async () => {
    getDashboard.mockResolvedValue({
      data: {
        standings: [],
        stats: null,
        events: [],
        announcements: [],
        ongoingEvents: [makeEvent('foosball')],
      },
    });
    renderDashboard();
    // "Ongoing Events" tag and the h2 event title should both be present
    await screen.findByRole('heading', { name: 'FOOSBALL' });
    expect(screen.getByText('Ongoing Events')).toBeInTheDocument();
  });

  it('hides a completed event from the ongoing events list', async () => {
    // Backend returns only the non-completed event after filtering
    getDashboard.mockResolvedValue({
      data: {
        standings: [],
        stats: null,
        events: [],
        announcements: [],
        // cricket was filtered out by backend because its final is played
        ongoingEvents: [makeEvent('foosball')],
      },
    });
    renderDashboard();
    await screen.findByRole('heading', { name: 'FOOSBALL' });
    // With only one event there are no switcher pills at all
    expect(screen.queryByText(/CRICKET/i)).not.toBeInTheDocument();
  });

  it('shows multiple events when none are completed', async () => {
    getDashboard.mockResolvedValue({
      data: {
        standings: [],
        stats: null,
        events: [],
        announcements: [],
        ongoingEvents: [makeEvent('foosball'), makeEvent('cricket')],
      },
    });
    renderDashboard();
    await screen.findByText('Ongoing Events');
    // With 2+ events the switcher pills are rendered — check those
    const foosballPills = screen.getAllByText(/FOOSBALL/);
    expect(foosballPills.length).toBeGreaterThan(0);
    const cricketPills = screen.getAllByText(/CRICKET/);
    expect(cricketPills.length).toBeGreaterThan(0);
  });

  it('shows only the single remaining ongoing event when one completes', async () => {
    // Backend filters out cricket; only foosball remains
    getDashboard.mockResolvedValue({
      data: {
        standings: [],
        stats: null,
        events: [],
        announcements: [],
        ongoingEvents: [makeEvent('foosball')],
      },
    });
    renderDashboard();
    await screen.findByRole('heading', { name: 'FOOSBALL' });
    // CRICKET should not appear anywhere
    expect(screen.queryByText(/CRICKET/i)).not.toBeInTheDocument();
    // Single-event mode: no "(N events running in parallel)" text
    expect(screen.queryByText(/events running in parallel/i)).not.toBeInTheDocument();
  });

  it('shows "No ongoing events" message when ongoingEvents is empty', async () => {
    getDashboard.mockResolvedValue({
      data: {
        standings: [],
        stats: null,
        events: [],
        announcements: [],
        ongoingEvents: [], // all tournaments complete
      },
    });
    renderDashboard();
    await screen.findByText('No ongoing events');
    // FOOSBALL heading must NOT appear — no active event to display
    expect(screen.queryByRole('heading', { name: 'FOOSBALL' })).not.toBeInTheDocument();
    expect(screen.queryByText('Ongoing Events')).not.toBeInTheDocument();
  });

  it('auto-switches away from foosball when it is filtered out and another event is ongoing', async () => {
    // The default selectedEvent is 'foosball', but the backend has filtered it out
    // because its final has been played. Only 'cricket' remains.
    // The dashboard must display CRICKET, not FOOSBALL.
    getDashboard.mockResolvedValue({
      data: {
        standings: [],
        stats: null,
        events: [],
        announcements: [],
        ongoingEvents: [makeEvent('cricket')], // foosball excluded
      },
    });
    renderDashboard();
    // CRICKET heading must appear (auto-switched to)
    await screen.findByRole('heading', { name: 'CRICKET' });
    // FOOSBALL heading must NOT appear
    expect(screen.queryByRole('heading', { name: 'FOOSBALL' })).not.toBeInTheDocument();
  });
});
