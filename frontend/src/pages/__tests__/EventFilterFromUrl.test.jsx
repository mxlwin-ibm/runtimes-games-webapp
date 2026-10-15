import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/api', () => ({
  getMatches: vi.fn().mockResolvedValue({ data: [] }),
  getSubteams: vi.fn().mockResolvedValue({ data: [] }),
  getPlayers: vi.fn().mockResolvedValue({ data: [] }),
  getPointsTable: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false }),
}));

import { getMatches, getSubteams, getPointsTable, getPlayers } from '../../services/api';
import Matches from '../Matches';
import PointTable from '../PointTable';
import Squad from '../Squad';

const renderAt = (ui, url) =>
  render(<MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>);

// Regression: ?event=<sport> from dashboard quick links must drive each page's filter.
describe('Event filter is initialised from ?event=', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Matches loads the requested event', async () => {
    renderAt(<Matches />, '/matches?event=cricket');
    await waitFor(() => expect(getSubteams).toHaveBeenCalled());
    expect(getSubteams).toHaveBeenCalledWith({ event: 'cricket' });
    expect(getSubteams).not.toHaveBeenCalledWith({ event: 'foosball' });
    expect(getMatches).toHaveBeenCalled();
  });

  it('Matches defaults to foosball without the param', async () => {
    renderAt(<Matches />, '/matches');
    await waitFor(() => expect(getSubteams).toHaveBeenCalledWith({ event: 'foosball' }));
  });

  it('PointTable loads the requested event', async () => {
    renderAt(<PointTable />, '/points-table?event=cricket');
    await waitFor(() => expect(getPointsTable).toHaveBeenCalled());
    expect(getPointsTable).toHaveBeenCalledWith({ event: 'cricket' });
    expect(getPointsTable).not.toHaveBeenCalledWith({ event: 'foosball' });
  });

  it('PointTable defaults to foosball without the param', async () => {
    renderAt(<PointTable />, '/points-table');
    await waitFor(() => expect(getPointsTable).toHaveBeenCalledWith({ event: 'foosball' }));
  });

  it('Squad loads squads for the requested event', async () => {
    renderAt(<Squad />, '/squads?event=cricket');
    await waitFor(() => expect(getSubteams).toHaveBeenCalled());
    expect(getSubteams).toHaveBeenCalledWith({ event: 'cricket', team: 'Titans' });
    expect(getPlayers).not.toHaveBeenCalled();
  });

  it('Squad defaults to the All players view without the param', async () => {
    renderAt(<Squad />, '/squads');
    await waitFor(() => expect(getPlayers).toHaveBeenCalledWith('Titans'));
    expect(getSubteams).not.toHaveBeenCalled();
  });

  it('ignores unknown event values', async () => {
    renderAt(<PointTable />, '/points-table?event=bogus');
    await waitFor(() => expect(getPointsTable).toHaveBeenCalledWith({ event: 'foosball' }));
  });
});
