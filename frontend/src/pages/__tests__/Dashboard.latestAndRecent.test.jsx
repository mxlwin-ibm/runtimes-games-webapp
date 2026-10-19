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

const makeMatch = (id, status, overrides = {}) => ({
  _id: id,
  event: 'foosball',
  team1: 'Titans',
  team1_subid: '1',
  team2: 'Vikings',
  team2_subid: '2',
  team1_score: status === 'played' ? 3 : 0,
  team2_score: status === 'played' ? 1 : 0,
  match_status: status,
  match_type: 'league',
  round: 1,
  ...overrides,
});

const defaultDashboard = {
  standings: [],
  stats: null,
  events: [],
  announcements: [],
  ongoingEvents: [{ event: 'foosball', stats: { playedMatches: 0, totalMatches: 0 } }],
};

// ── Regression: Latest Match card must show the most recently played match ─

describe('Dashboard Latest Match card', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the match with the latest date, not an earlier one', async () => {
    getDashboard.mockResolvedValue({ data: defaultDashboard });
    getMatches.mockResolvedValue({
      data: [
        // older match
        makeMatch('m1', 'played', {
          team1: 'Gladiators',
          team1_subid: '2',
          team2: 'El Dragos',
          team2_subid: '3',
          match_date: '2025-01-10',
          match_time: '10:00',
          team1_score: 5,
          team2_score: 2,
        }),
        // newer match — should appear in Latest Match card
        makeMatch('m2', 'played', {
          team1: 'Titans',
          team1_subid: '1',
          team2: 'Vikings',
          team2_subid: '2',
          match_date: '2025-01-20',
          match_time: '14:00',
          team1_score: 3,
          team2_score: 1,
        }),
      ],
    });

    renderDashboard();
    await screen.findByText('Latest Result');

    // The newer match (Titans-1 vs Vikings-2) must appear in the Latest Match card
    const latestResultSection = screen.getAllByText('Titans-1');
    expect(latestResultSection.length).toBeGreaterThan(0);
  });

  it('shows "No completed matches yet" when there are no played matches', async () => {
    getDashboard.mockResolvedValue({ data: defaultDashboard });
    getMatches.mockResolvedValue({
      data: [makeMatch('m1', 'scheduled')],
    });

    renderDashboard();
    await screen.findByText('No completed matches yet');
  });

  it('a match without match_date is not shown as the latest ahead of a dated match', async () => {
    getDashboard.mockResolvedValue({ data: defaultDashboard });
    getMatches.mockResolvedValue({
      data: [
        // undated match — must NOT appear as latestResult ahead of the dated one
        makeMatch('m1', 'played', {
          team1: 'Gladiators',
          team1_subid: '2',
          team2: 'El Dragos',
          team2_subid: '3',
          match_date: null,
          match_time: null,
          team1_score: 2,
          team2_score: 2,
          round: 1,
        }),
        // dated match — must appear as latestResult
        makeMatch('m2', 'played', {
          team1: 'Titans',
          team1_subid: '1',
          team2: 'Vikings',
          team2_subid: '2',
          match_date: '2025-06-15',
          match_time: '11:00',
          team1_score: 4,
          team2_score: 0,
          round: 2,
        }),
      ],
    });

    renderDashboard();
    await screen.findByText('Latest Result');

    // Titans-1 (the dated match) must appear in the latest result card
    const titans = screen.getAllByText('Titans-1');
    expect(titans.length).toBeGreaterThan(0);
  });
});

// ── Regression: Recent Results section must show matches in correct order ──

describe('Dashboard Recent Results section', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the Recent Results section when there are played matches', async () => {
    getDashboard.mockResolvedValue({ data: defaultDashboard });
    getMatches.mockResolvedValue({
      data: [
        makeMatch('m1', 'played', { match_date: '2025-01-10', match_time: '09:00' }),
        makeMatch('m2', 'played', { match_date: '2025-01-12', match_time: '10:00' }),
        makeMatch('m3', 'played', { match_date: '2025-01-15', match_time: '11:00' }),
      ],
    });

    renderDashboard();
    await screen.findByText('Recent Results');
  });

  it('does not render Recent Results section when there are no played matches', async () => {
    getDashboard.mockResolvedValue({ data: defaultDashboard });
    getMatches.mockResolvedValue({
      data: [makeMatch('m1', 'scheduled')],
    });

    renderDashboard();
    // Wait for the dashboard to load (the Next Match card will show the scheduled match)
    await screen.findByText('Next Match');
    expect(screen.queryByText('Recent Results')).not.toBeInTheDocument();
  });

  it('shows at most 3 recent results', async () => {
    getDashboard.mockResolvedValue({ data: defaultDashboard });
    getMatches.mockResolvedValue({
      data: [
        makeMatch('m1', 'played', { match_date: '2025-01-10', match_time: '09:00', team1: 'Titans', team1_subid: '1', team2: 'Vikings', team2_subid: '2' }),
        makeMatch('m2', 'played', { match_date: '2025-01-12', match_time: '10:00', team1: 'Gladiators', team1_subid: '1', team2: 'El Dragos', team2_subid: '1' }),
        makeMatch('m3', 'played', { match_date: '2025-01-14', match_time: '11:00', team1: 'Titans', team1_subid: '2', team2: 'El Dragos', team2_subid: '2' }),
        makeMatch('m4', 'played', { match_date: '2025-01-16', match_time: '12:00', team1: 'Vikings', team1_subid: '3', team2: 'Gladiators', team2_subid: '2' }),
        makeMatch('m5', 'played', { match_date: '2025-01-18', match_time: '13:00', team1: 'Titans', team1_subid: '3', team2: 'Vikings', team2_subid: '1' }),
      ],
    });

    renderDashboard();
    await screen.findByText('Recent Results');

    // Only 3 tiles should be visible in the Recent Results section.
    // Each tile renders "team1 score – team2 score" as "{score} – {score}".
    // With our default scores (0 – 0 or 3 – 1 per makeMatch defaults, overridden
    // to all 3-1 here), we can count "3 – 1" occurrences.
    // All 5 matches have score 3–1 (default of makeMatch with status=played).
    const scoreTexts = screen.getAllByText(/^\d+ – \d+$/);
    // 1 for latestResult card + up to 3 for recentResults = max 4 (latest + 3 recent)
    expect(scoreTexts.length).toBeLessThanOrEqual(4);
  });
});

// ── Regression: Next Match must show the earliest DATED scheduled match ────

describe('Dashboard Next Match card', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the earliest dated scheduled match, not an undated one', async () => {
    getDashboard.mockResolvedValue({ data: defaultDashboard });
    getMatches.mockResolvedValue({
      data: [
        // undated scheduled match — must NOT appear as nextMatch before dated ones
        makeMatch('m1', 'scheduled', {
          team1: 'Gladiators',
          team1_subid: '2',
          team2: 'El Dragos',
          team2_subid: '3',
          match_date: null,
          match_time: null,
          round: 99,
        }),
        // earliest dated match — must appear as nextMatch
        makeMatch('m2', 'scheduled', {
          team1: 'Titans',
          team1_subid: '1',
          team2: 'Vikings',
          team2_subid: '2',
          match_date: '2025-06-01',
          match_time: '09:00',
          round: 1,
        }),
        // later dated match
        makeMatch('m3', 'scheduled', {
          team1: 'Titans',
          team1_subid: '3',
          team2: 'Vikings',
          team2_subid: '3',
          match_date: '2025-06-15',
          match_time: '14:00',
          round: 2,
        }),
      ],
    });

    renderDashboard();
    await screen.findByText('Next Match');

    // Titans-1 (earliest dated match) must appear in the Next Match card
    const titansTexts = screen.getAllByText('Titans-1');
    expect(titansTexts.length).toBeGreaterThan(0);
  });
});

// ── Regression: when all tournaments are complete (no ongoing events),
//    Latest Result and Recent Results must show the globally most recent
//    played match across ALL events, not just the default 'foosball' event.

describe('Dashboard Latest Match – cross-event when no ongoing events', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the most recent match across all events when ongoingEvents is empty', async () => {
    // All tournaments complete → ongoingEvents = []
    getDashboard.mockResolvedValue({
      data: {
        standings: [],
        stats: null,
        events: [],
        announcements: [],
        ongoingEvents: [],
      },
    });

    getMatches.mockResolvedValue({
      data: [
        // older foosball match
        makeMatch('m1', 'played', {
          event: 'foosball',
          team1: 'Titans',
          team1_subid: '1',
          team2: 'Vikings',
          team2_subid: '1',
          match_date: '2025-06-20',
          match_time: '10:00',
          team1_score: 3,
          team2_score: 1,
        }),
        // newer snooker match — the globally latest played match
        makeMatch('m2', 'played', {
          event: 'snooker',
          team1: 'El Dragos',
          team1_subid: '2',
          team2: 'Gladiators',
          team2_subid: '3',
          match_date: '2025-08-01',
          match_time: '11:00',
          team1_score: 1,
          team2_score: 0,
        }),
      ],
    });

    renderDashboard();
    await screen.findByText('Latest Result');

    // El Dragos-2 (the more recent snooker match across all events) must
    // appear in the Latest Result card when no events are ongoing.
    const elDragos = screen.getAllByText('El Dragos-2');
    expect(elDragos.length).toBeGreaterThan(0);
  });

  it('shows Recent Results from all events when ongoingEvents is empty', async () => {
    getDashboard.mockResolvedValue({
      data: {
        standings: [],
        stats: null,
        events: [],
        announcements: [],
        ongoingEvents: [],
      },
    });

    getMatches.mockResolvedValue({
      data: [
        makeMatch('m1', 'played', {
          event: 'foosball',
          team1: 'Titans',
          team1_subid: '1',
          team2: 'Vikings',
          team2_subid: '1',
          match_date: '2025-06-20',
          match_time: '10:00',
        }),
        makeMatch('m2', 'played', {
          event: 'snooker',
          team1: 'El Dragos',
          team1_subid: '2',
          team2: 'Gladiators',
          team2_subid: '3',
          match_date: '2025-08-01',
          match_time: '11:00',
        }),
        makeMatch('m3', 'played', {
          event: 'cricket',
          team1: 'Vikings',
          team1_subid: '4',
          team2: 'Titans',
          team2_subid: '2',
          match_date: '2025-09-10',
          match_time: '09:00',
        }),
      ],
    });

    renderDashboard();
    await screen.findByText('Recent Results');

    // The most recent match (Vikings-4 vs Titans-2 on 2025-09-10) must be visible
    const vikings4 = screen.getAllByText('Vikings-4');
    expect(vikings4.length).toBeGreaterThan(0);
  });
});

// ── Regression: when foosball is ongoing but has NO played matches yet,
//    Latest Result must NOT show a played match from another event.

describe('Dashboard Latest Match – no cross-event bleed when selected event has no plays', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows "No completed matches yet" when foosball is ongoing but only snooker has played matches', async () => {
    // foosball is ongoing, snooker is NOT in ongoingEvents (already complete or separate)
    getDashboard.mockResolvedValue({
      data: {
        standings: [],
        stats: null,
        events: [],
        announcements: [],
        ongoingEvents: [{ event: 'foosball', stats: { playedMatches: 0, totalMatches: 5 } }],
      },
    });

    getMatches.mockResolvedValue({
      data: [
        // foosball scheduled match — no played foosball matches
        makeMatch('m1', 'scheduled', {
          event: 'foosball',
          team1: 'Titans',
          team1_subid: '1',
          team2: 'Vikings',
          team2_subid: '2',
          match_date: '2025-10-01',
        }),
        // played match from ANOTHER event — must NOT bleed into foosball Latest Result
        makeMatch('m2', 'played', {
          event: 'snooker',
          team1: 'El Dragos',
          team1_subid: '3',
          team2: 'Gladiators',
          team2_subid: '1',
          match_date: '2025-09-15',
          match_time: '14:00',
          team1_score: 2,
          team2_score: 0,
        }),
      ],
    });

    renderDashboard();
    await screen.findByText('Next Match');

    // The Latest Result card must say "No completed matches yet" — not show El Dragos-3
    expect(screen.queryByText('El Dragos-3')).not.toBeInTheDocument();
    expect(screen.getByText('No completed matches yet')).toBeInTheDocument();
  });

  it('shows "No completed matches yet" in Recent Results when foosball is ongoing and has no foosball played matches', async () => {
    getDashboard.mockResolvedValue({
      data: {
        standings: [],
        stats: null,
        events: [],
        announcements: [],
        ongoingEvents: [{ event: 'foosball', stats: { playedMatches: 0, totalMatches: 5 } }],
      },
    });

    getMatches.mockResolvedValue({
      data: [
        makeMatch('m1', 'scheduled', {
          event: 'foosball',
          team1: 'Titans',
          team1_subid: '1',
          team2: 'Vikings',
          team2_subid: '2',
          match_date: '2025-10-01',
        }),
        makeMatch('m2', 'played', {
          event: 'snooker',
          team1: 'El Dragos',
          team1_subid: '3',
          team2: 'Gladiators',
          team2_subid: '1',
          match_date: '2025-09-15',
          match_time: '14:00',
          team1_score: 2,
          team2_score: 0,
        }),
      ],
    });

    renderDashboard();
    await screen.findByText('Next Match');

    // The Recent Results section must NOT appear when there are no foosball played matches
    expect(screen.queryByText('Recent Results')).not.toBeInTheDocument();
  });
});
