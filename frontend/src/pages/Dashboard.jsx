import React, { useState, useEffect } from 'react';
import {
  Grid,
  Column,
  Tile,
  ClickableTile,
  Tag,
  Accordion,
  AccordionItem,
  ProgressBar,
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableExpandRow,
  TableExpandedRow,
  TableExpandHeader,
  StructuredListWrapper,
  StructuredListHead,
  StructuredListBody,
  StructuredListRow,
  StructuredListCell,
  Heading,
  TextInput,
  Button,
  Dropdown,
} from "@carbon/react";
import {
  Trophy,
  Calendar,
  CheckmarkFilled,
  User,
  GameConsole,
  ChartLine,
  Star,
  ArrowRight,
  Events,
  Edit,
  Save,
} from "@carbon/icons-react";
import { getMatches, getPointsTable, getPlayers, getSubteams, getEvents, updateEvents } from '../services/api';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matches, setMatches] = useState([]);
  const [pointsTable, setPointsTable] = useState([]);
  const [teams, setTeams] = useState([]);
  const [subteams, setSubteams] = useState([]);
  const [overallStandings, setOverallStandings] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [isEditingEvents, setIsEditingEvents] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [matchesRes, pointsRes, teamsRes, subteamsRes, eventsRes] = await Promise.all([
        getMatches(),
        getPointsTable({ event: 'foosball' }),
        getPlayers(),
        getSubteams({ event: 'foosball' }),
        getEvents()
      ]);

      setMatches(matchesRes.data || []);
      setPointsTable(pointsRes.data || []);
      setTeams(teamsRes.data || []);
      setSubteams(subteamsRes.data || []);
      setUpcomingEvents(eventsRes.data || []);
      
      // Calculate overall tournament standings from final matches
      // Pass teamsRes.data directly instead of using state
      const standings = calculateOverallStandings(matchesRes.data || [], teamsRes.data || []);
      setOverallStandings(standings);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleEventChange = (index, field, value) => {
    const updated = [...upcomingEvents];
    updated[index][field] = value;
    setUpcomingEvents(updated);
  };

  const saveEvents = async () => {
    try {
      await updateEvents(upcomingEvents);
      setIsEditingEvents(false);
    } catch (err) {
      console.error('Error saving events:', err);
      alert('Failed to save events. Please try again.');
    }
  };

  // Calculate overall tournament standings from playoff finals
  const calculateOverallStandings = (allMatches, teamsData) => {
    // Initialize all teams with 0 points
    const teamPoints = {};
    
    // Get unique team names from teams data
    teamsData.forEach(player => {
      const teamName = player.team;
      if (!teamPoints[teamName]) {
        teamPoints[teamName] = { team: teamName, points: 0, breakdown: [] };
      }
    });

    // Find all final matches (match_type is 'final' or 'playoff' with position starting with 'F')
    const finalMatches = allMatches.filter(
      m => (m.match_type === 'final' ||
            (m.match_type === 'playoff' && m.playoff_position?.startsWith('F'))) &&
           m.match_status === 'played'
    );

    // Award points based on final match results
    finalMatches.forEach(match => {
      const winner = match.team1_score > match.team2_score ? match.team1 : match.team2;
      const runnerUp = match.team1_score > match.team2_score ? match.team2 : match.team1;
      const event = match.event || 'Unknown Event';

      // Initialize team entries if they don't exist (for teams not in players list)
      if (!teamPoints[winner]) {
        teamPoints[winner] = { team: winner, points: 0, breakdown: [] };
      }
      if (!teamPoints[runnerUp]) {
        teamPoints[runnerUp] = { team: runnerUp, points: 0, breakdown: [] };
      }

      // Award points: Winner = 100, Runner-up = 50
      teamPoints[winner].points += 100;
      teamPoints[winner].breakdown.push({
        event: event.charAt(0).toUpperCase() + event.slice(1),
        position: 'Winner',
        points: 100
      });

      teamPoints[runnerUp].points += 50;
      teamPoints[runnerUp].breakdown.push({
        event: event.charAt(0).toUpperCase() + event.slice(1),
        position: 'Runner-up',
        points: 50
      });
    });

    // Convert to array and sort by points (descending), then by team name (ascending)
    const standings = Object.values(teamPoints).sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return a.team.localeCompare(b.team);
    });
    
    return standings;
  };

  // Calculate tournament stats from real data
  // Count total subteams for the event
  const tournamentStats = {
    teams: subteams.length,
    matches: matches.length,
    round: matches.length > 0 ? Math.max(...matches.map(m => m.round || 1)) : 1,
    completed: matches.filter(m => m.match_status === 'played').length,
  };

  // Get next scheduled match - sort by date and time
  const nextMatch = matches
    .filter(m => m.match_status === 'scheduled')
    .sort((a, b) => {
      // If both have date and time, sort by datetime
      if (a.match_date && a.match_time && b.match_date && b.match_time) {
        const dateTimeA = new Date(`${a.match_date}T${a.match_time}`);
        const dateTimeB = new Date(`${b.match_date}T${b.match_time}`);
        return dateTimeA - dateTimeB;
      }
      // Fallback to round number if date/time not available
      return (a.round || 0) - (b.round || 0);
    })[0];

  // Get latest completed match
  const latestResult = matches
    .filter(m => m.match_status === 'played')
    .sort((a, b) => (b.round || 0) - (a.round || 0))[0];

  // Get recent results (last 3 completed matches)
  const recentResults = matches
    .filter(m => m.match_status === 'played')
    .sort((a, b) => (b.round || 0) - (a.round || 0))
    .slice(0, 3);

  // Calculate MVP (team with most wins, then most goals across all pools)
  const calculateMVP = () => {
    if (subteams.length === 0) return null;
    
    // Sort by: 1. Most wins (descending), 2. Most goals scored (descending)
    const topSubteam = [...subteams]
      .sort((a, b) => {
        const winsA = a.win || 0;
        const winsB = b.win || 0;
        if (winsB !== winsA) return winsB - winsA;
        return (b.gf || 0) - (a.gf || 0);
      })[0];
    
    if (!topSubteam) return null;

    const winRatio = topSubteam.played > 0
      ? Math.round((topSubteam.win / topSubteam.played) * 100)
      : 0;

    // Get player names from the subteam
    const playerNames = topSubteam.player_names || [];
    const displayName = playerNames.length > 0
      ? playerNames.join(' & ')
      : 'Unknown';

    return {
      name: displayName,
      team: topSubteam.team,
      subteam: `${topSubteam.team}-${topSubteam.subteam_id}`,
      event: topSubteam.event,
      wins: topSubteam.win || 0,
      goals: topSubteam.gf || 0,
      winRatio: `${winRatio}%`,
    };
  };

  const currentMVP = calculateMVP();

  // Prepare overall tournament standings data for DataTable
  const standingsHeaders = [
    { key: 'position', header: 'Rank' },
    { key: 'team', header: 'Team' },
    { key: 'points', header: 'Points' },
  ];

  const standingsRows = overallStandings.map((team, index) => ({
    id: `team-${index}`,
    position: index + 1,
    team: team.team,
    points: team.points || 0,
    breakdown: team.breakdown || [],
  }));

  if (loading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Error Loading Dashboard"
        description={error}
        icon={<Trophy size={48} />}
      />
    );
  }

  return (
    <div style={{ 
      backgroundColor: 'var(--cds-background, #f4f4f4)',
      minHeight: '100vh',
      padding: 'var(--cds-spacing-05, 1rem)',
    }}>
      <div style={{ 
        maxWidth: '1584px', 
        margin: '0 auto',
      }}>
        {/* Page Header */}
        <div style={{ marginBottom: 'var(--cds-spacing-07, 2rem)' }}>
          <Heading style={{ 
            marginBottom: 'var(--cds-spacing-03, 0.5rem)',
            color: 'var(--cds-text-primary, #161616)',
          }}>
            Dashboard
          </Heading>
          <p style={{ 
            color: 'var(--cds-text-secondary, #525252)',
            fontSize: '0.875rem',
            margin: 0,
          }}>
      
          </p>
        </div>

        {/* HERO SECTION */}
        <Tile style={{
          padding: 'var(--cds-spacing-07, 2rem)',
          marginBottom: 'var(--cds-spacing-05, 1rem)',
          backgroundColor: 'var(--cds-layer-01, #ffffff)',
        }}>
          {/* League Info */}
          <div style={{ marginBottom: 'var(--cds-spacing-06, 1.5rem)' }}>
            <Tag type="green" style={{ marginBottom: 'var(--cds-spacing-05, 1rem)' }}>
              Ongoing Event
            </Tag>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--cds-spacing-05, 1rem)' }}>
              <Trophy size={40} style={{ marginRight: 'var(--cds-spacing-05, 1rem)', color: 'var(--cds-icon-primary, #0f62fe)' }} />
              <div>
                <h2 style={{ 
                  fontSize: '2.25rem', 
                  fontWeight: '300',
                  lineHeight: '1.25',
                  margin: 0, 
                  color: 'var(--cds-text-primary, #161616)',
                  letterSpacing: '0',
                }}>
                  {nextMatch ? nextMatch.event.toUpperCase() : 'FOOSBALL'}
                </h2>
                <p style={{
                  fontSize: '1rem',
                  color: 'var(--cds-text-secondary, #525252)',
                  margin: 'var(--cds-spacing-02, 0.25rem) 0 0 0',
                  fontWeight: '400',
                }}>
                  {nextMatch ? `${nextMatch.match_type === 'league' ? 'League Stage' : 'Playoff Stage'} · Round ${nextMatch.round}` : `League Stage · Round ${tournamentStats.round}`}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: 'var(--cds-spacing-06, 1.5rem)' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginBottom: 'var(--cds-spacing-03, 0.5rem)',
            }}>
              <span style={{ 
                fontSize: '0.875rem', 
                fontWeight: '600', 
                color: 'var(--cds-text-primary, #161616)',
              }}>
                Tournament Progress
              </span>
              <span style={{ 
                fontSize: '0.875rem', 
                fontWeight: '600', 
                color: 'var(--cds-link-primary, #0f62fe)',
              }}>
                {tournamentStats.completed} / {tournamentStats.matches} Matches
              </span>
            </div>
            <ProgressBar
              value={tournamentStats.matches > 0 ? (tournamentStats.completed / tournamentStats.matches) * 100 : 0}
              label="Progress"
              hideLabel
              size="big"
            />
          </div>

          {/* Quick Stats */}
          <Grid narrow style={{ marginTop: 'var(--cds-spacing-05, 1rem)' }}>
            <Column lg={5} md={4} sm={4}>
              <Tile style={{
                padding: 'var(--cds-spacing-05, 1rem)',
                backgroundColor: 'var(--cds-layer-02, #f4f4f4)',
                display: 'flex',
                alignItems: 'center',
              }}>
                <User size={32} style={{ marginRight: 'var(--cds-spacing-05, 1rem)', color: 'var(--cds-icon-primary, #0f62fe)' }} />
                <div>
                  <div style={{ 
                    fontSize: '2rem', 
                    fontWeight: '300', 
                    lineHeight: '1.25',
                    color: 'var(--cds-text-primary, #161616)',
                  }}>
                    {tournamentStats.teams}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary, #525252)' }}>Teams</div>
                </div>
              </Tile>
            </Column>
            <Column lg={5} md={4} sm={4}>
              <Tile style={{
                padding: 'var(--cds-spacing-05, 1rem)',
                backgroundColor: 'var(--cds-layer-02, #f4f4f4)',
                display: 'flex',
                alignItems: 'center',
              }}>
                <GameConsole size={32} style={{ marginRight: 'var(--cds-spacing-05, 1rem)', color: 'var(--cds-icon-primary, #0f62fe)' }} />
                <div>
                  <div style={{ 
                    fontSize: '2rem', 
                    fontWeight: '300', 
                    lineHeight: '1.25',
                    color: 'var(--cds-text-primary, #161616)',
                  }}>
                    {tournamentStats.matches}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary, #525252)' }}>Total Matches</div>
                </div>
              </Tile>
            </Column>
            <Column lg={6} md={4} sm={4}>
              <Tile style={{
                padding: 'var(--cds-spacing-05, 1rem)',
                backgroundColor: 'var(--cds-layer-02, #f4f4f4)',
                display: 'flex',
                alignItems: 'center',
              }}>
                <ChartLine size={32} style={{ marginRight: 'var(--cds-spacing-05, 1rem)', color: 'var(--cds-interactive-01, #0f62fe)' }} />
                <div>
                  <div style={{ 
                    fontSize: '2rem', 
                    fontWeight: '300', 
                    lineHeight: '1.25',
                    color: 'var(--cds-text-primary, #161616)',
                  }}>
                    {tournamentStats.completed}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary, #525252)' }}>Completed</div>
                </div>
              </Tile>
            </Column>
          </Grid>
        </Tile>

        {/* SUMMARY CARDS */}
        <Grid narrow style={{ marginBottom: 'var(--cds-spacing-05, 1rem)' }}>
          {/* Next Match Card */}
          <Column lg={5} md={4} sm={4}>
            <ClickableTile style={{
              padding: 'var(--cds-spacing-06, 1.5rem)',
              height: '100%',
              backgroundColor: 'var(--cds-layer-01, #ffffff)',
            }}>
              <Tag type="blue" style={{ marginBottom: 'var(--cds-spacing-05, 1rem)' }}>
                Next Match
              </Tag>
              {nextMatch ? (
                <>
                  <div style={{ textAlign: 'center', margin: 'var(--cds-spacing-06, 1.5rem) 0' }}>
                    <div style={{ 
                      fontSize: '1.125rem', 
                      fontWeight: '600', 
                      marginBottom: 'var(--cds-spacing-04, 0.75rem)',
                      color: 'var(--cds-text-primary, #161616)',
                    }}>
                      {nextMatch.team1}-{nextMatch.team1_subid}
                    </div>
                    <div style={{
                      fontSize: '1rem',
                      color: 'var(--cds-text-secondary, #525252)',
                      margin: 'var(--cds-spacing-05, 1rem) 0',
                      fontWeight: '400',
                    }}>
                      VS
                    </div>
                    <div style={{ 
                      fontSize: '1.125rem', 
                      fontWeight: '600', 
                      marginTop: 'var(--cds-spacing-04, 0.75rem)',
                      color: 'var(--cds-text-primary, #161616)',
                    }}>
                      {nextMatch.team2}-{nextMatch.team2_subid}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'var(--cds-text-secondary, #525252)',
                    textAlign: 'center',
                    marginTop: 'var(--cds-spacing-05, 1rem)',
                    padding: 'var(--cds-spacing-03, 0.5rem)',
                    backgroundColor: 'var(--cds-layer-02, #f4f4f4)',
                  }}>
                    Round {nextMatch.round}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--cds-spacing-06, 1.5rem)', color: 'var(--cds-text-secondary, #525252)' }}>
                  No upcoming matches
                </div>
              )}
            </ClickableTile>
          </Column>

          {/* Latest Result Card */}
          <Column lg={5} md={4} sm={4}>
            <ClickableTile style={{
              padding: 'var(--cds-spacing-06, 1.5rem)',
              height: '100%',
              backgroundColor: 'var(--cds-layer-01, #ffffff)',
            }}>
              <Tag type="green" style={{ marginBottom: 'var(--cds-spacing-05, 1rem)' }}>
                Latest Result
              </Tag>
              {latestResult ? (
                <div style={{ textAlign: 'center', margin: 'var(--cds-spacing-06, 1.5rem) 0' }}>
                  <div style={{
                    fontSize: '1.125rem',
                    fontWeight: latestResult.team1_score > latestResult.team2_score ? '600' : '400',
                    marginBottom: 'var(--cds-spacing-04, 0.75rem)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--cds-text-primary, #161616)',
                  }}>
                    {latestResult.team1}-{latestResult.team1_subid}
                    {latestResult.team1_score > latestResult.team2_score && (
                      <CheckmarkFilled size={20} style={{ marginLeft: 'var(--cds-spacing-03, 0.5rem)', color: 'var(--cds-support-success, #24a148)' }} />
                    )}
                  </div>
                  <div style={{
                    display: 'inline-block',
                    padding: 'var(--cds-spacing-04, 0.75rem) var(--cds-spacing-06, 1.5rem)',
                    backgroundColor: 'var(--cds-layer-02, #f4f4f4)',
                    border: '1px solid var(--cds-border-subtle-01, #e0e0e0)',
                    fontSize: '1.75rem',
                    fontWeight: '300',
                    margin: 'var(--cds-spacing-03, 0.5rem) 0',
                    color: 'var(--cds-text-primary, #161616)',
                  }}>
                    {latestResult.team1_score} – {latestResult.team2_score}
                  </div>
                  <div style={{
                    fontSize: '1.125rem',
                    fontWeight: latestResult.team2_score > latestResult.team1_score ? '600' : '400',
                    marginTop: 'var(--cds-spacing-04, 0.75rem)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--cds-text-primary, #161616)',
                  }}>
                    {latestResult.team2}-{latestResult.team2_subid}
                    {latestResult.team2_score > latestResult.team1_score && (
                      <CheckmarkFilled size={20} style={{ marginLeft: 'var(--cds-spacing-03, 0.5rem)', color: 'var(--cds-support-success, #24a148)' }} />
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--cds-spacing-06, 1.5rem)', color: 'var(--cds-text-secondary, #525252)' }}>
                  No completed matches yet
                </div>
              )}
            </ClickableTile>
          </Column>

          {/* Current MVP Card */}
          <Column lg={6} md={4} sm={4}>
            <ClickableTile style={{
              padding: 'var(--cds-spacing-06, 1.5rem)',
              height: '100%',
              backgroundColor: 'var(--cds-layer-01, #ffffff)',
            }}>
              <Tag type="blue" style={{ marginBottom: 'var(--cds-spacing-05, 1rem)' }}>
                Current MVP
              </Tag>
              {currentMVP ? (
                <div style={{ textAlign: 'center', margin: 'var(--cds-spacing-06, 1.5rem) 0' }}>
                  <Star size={48} style={{ color: 'var(--cds-interactive-01, #0f62fe)', marginBottom: 'var(--cds-spacing-05, 1rem)' }} />
                  <div style={{
                    fontSize: '1.75rem',
                    fontWeight: '300',
                    marginBottom: 'var(--cds-spacing-02, 0.25rem)',
                    color: 'var(--cds-text-primary, #161616)',
                  }}>
                    {currentMVP.name}
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'var(--cds-text-secondary, #525252)',
                    marginBottom: 'var(--cds-spacing-05, 1rem)',
                  }}>
                    {currentMVP.subteam}
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 'var(--cds-spacing-04, 0.75rem)',
                    marginTop: 'var(--cds-spacing-05, 1rem)',
                    flexWrap: 'wrap',
                  }}>
                    <Tile style={{
                      padding: 'var(--cds-spacing-04, 0.75rem)',
                      backgroundColor: 'var(--cds-layer-02, #f4f4f4)',
                      minWidth: '70px',
                    }}>
                      <div style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: 'var(--cds-link-primary, #0f62fe)',
                      }}>
                        {currentMVP.wins}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary, #525252)' }}>Wins</div>
                    </Tile>
                    <Tile style={{
                      padding: 'var(--cds-spacing-04, 0.75rem)',
                      backgroundColor: 'var(--cds-layer-02, #f4f4f4)',
                      minWidth: '70px',
                    }}>
                      <div style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: 'var(--cds-link-primary, #0f62fe)',
                      }}>
                        {currentMVP.goals}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary, #525252)' }}>Goals</div>
                    </Tile>
                    <Tile style={{
                      padding: 'var(--cds-spacing-04, 0.75rem)',
                      backgroundColor: 'var(--cds-layer-02, #f4f4f4)',
                      minWidth: '70px',
                    }}>
                      <div style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: 'var(--cds-link-primary, #0f62fe)',
                      }}>
                        {currentMVP.winRatio}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary, #525252)' }}>Win Ratio</div>
                    </Tile>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--cds-spacing-06, 1.5rem)', color: 'var(--cds-text-secondary, #525252)' }}>
                  No data available
                </div>
              )}
            </ClickableTile>
          </Column>
        </Grid>

        {/* MAIN CONTENT */}
        
        {/* Overall Tournament Standings Table */}
        <Tile style={{
            padding: 'var(--cds-spacing-06, 1.5rem)',
            marginBottom: 'var(--cds-spacing-05, 1rem)',
            backgroundColor: 'var(--cds-layer-01, #ffffff)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 'var(--cds-spacing-06, 1.5rem)',
            }}>
              <Trophy size={24} style={{ marginRight: 'var(--cds-spacing-04, 0.75rem)', color: 'var(--cds-icon-primary, #0f62fe)' }} />
              <h3 style={{
                fontSize: '1.75rem',
                fontWeight: '300',
                margin: 0,
                color: 'var(--cds-text-primary, #161616)',
              }}>
                Overall Tournament Standings
              </h3>
            </div>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--cds-text-secondary, #525252)',
              marginBottom: 'var(--cds-spacing-05, 1rem)',
            }}>
              Points awarded based on final placements: Winner = 100 pts, Runner-up = 50 pts
            </p>
            
            {standingsRows.length > 0 ? (
              <DataTable rows={standingsRows} headers={standingsHeaders}>
                {({ rows, headers, getTableProps, getHeaderProps, getRowProps, getExpandHeaderProps }) => (
                  <TableContainer>
                    <Table {...getTableProps()} size="lg">
                      <TableHead>
                        <TableRow>
                          <TableExpandHeader enableToggle {...getExpandHeaderProps()} />
                          {headers.map((header) => (
                            <TableHeader {...getHeaderProps({ header })} key={header.key}>
                              {header.header}
                            </TableHeader>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                      {rows.map((row, index) => {
                        const getBadgeColor = (position) => {
                          if (position === 1) return 'var(--cds-interactive-01, #0f62fe)';
                          return 'var(--cds-ui-05, #8d8d8d)';
                        };

                        const getBorderLeft = (position) => {
                          if (position === 1) return '3px solid var(--cds-interactive-01, #0f62fe)';
                          return 'none';
                        };

                        const getBackground = (position) => {
                          if (position === 1) {
                            return 'var(--cds-layer-accent-01, #e8f4ff)';
                          }
                          return 'var(--cds-layer-01, #ffffff)';
                        };

                        const teamData = standingsRows.find(s => s.id === row.id);

                        return (
                          <React.Fragment key={row.id}>
                            <TableExpandRow
                              {...getRowProps({ row })}
                              style={{
                                backgroundColor: getBackground(index + 1),
                                borderLeft: getBorderLeft(index + 1),
                                transition: 'background-color 70ms cubic-bezier(0.2, 0, 0.38, 0.9)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--cds-layer-hover-01, #e8e8e8)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = getBackground(index + 1);
                              }}
                            >
                              {row.cells.map((cell) => (
                                <TableCell key={cell.id}>
                                  {cell.info.header === 'position' && (
                                    <div style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '2rem',
                                      height: '2rem',
                                      borderRadius: '50%',
                                      backgroundColor: getBadgeColor(cell.value),
                                      color: 'var(--cds-text-on-color, #ffffff)',
                                      fontWeight: '600',
                                      fontSize: '0.875rem',
                                    }}>
                                      {cell.value}
                                    </div>
                                  )}
                                  {cell.info.header === 'team' && (
                                    <span style={{
                                      fontWeight: index === 0 ? '600' : '400',
                                      fontSize: '1rem',
                                      color: 'var(--cds-text-primary, #161616)',
                                    }}>
                                      {cell.value}
                                      {index === 0 && (
                                        <Trophy size={16} style={{
                                          marginLeft: 'var(--cds-spacing-03, 0.5rem)',
                                          color: 'var(--cds-interactive-01, #0f62fe)',
                                          verticalAlign: 'middle',
                                        }} />
                                      )}
                                    </span>
                                  )}
                                  {cell.info.header === 'points' && (
                                    <span style={{
                                      fontWeight: '600',
                                      fontSize: '1rem',
                                      color: index === 0 ? 'var(--cds-link-primary, #0f62fe)' : 'var(--cds-text-primary, #161616)',
                                    }}>
                                      {cell.value}
                                    </span>
                                  )}
                                </TableCell>
                              ))}
                            </TableExpandRow>
                            <TableExpandedRow colSpan={headers.length + 1}>
                              <div style={{
                                padding: 'var(--cds-spacing-05, 1rem)',
                                backgroundColor: 'var(--cds-layer-02, #f4f4f4)',
                              }}>
                                <h4 style={{
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  marginBottom: 'var(--cds-spacing-04, 0.75rem)',
                                  color: 'var(--cds-text-primary, #161616)',
                                }}>
                                  Point Breakdown
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cds-spacing-03, 0.5rem)' }}>
                                  {teamData?.breakdown?.length > 0 ? (
                                    teamData.breakdown.map((item, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          padding: 'var(--cds-spacing-04, 0.75rem)',
                                          backgroundColor: 'var(--cds-layer-01, #ffffff)',
                                          borderRadius: '4px',
                                          border: '1px solid var(--cds-border-subtle-01, #e0e0e0)',
                                        }}
                                      >
                                        <span style={{
                                          flex: 1,
                                          fontSize: '0.875rem',
                                          color: 'var(--cds-text-primary, #161616)',
                                        }}>
                                          {item.event}
                                        </span>
                                        <Tag
                                          type={item.position === 'Winner' ? 'green' : 'blue'}
                                          size="sm"
                                          style={{ marginRight: 'var(--cds-spacing-04, 0.75rem)' }}
                                        >
                                          {item.position}
                                        </Tag>
                                        <span style={{
                                          fontWeight: '600',
                                          fontSize: '1rem',
                                          color: 'var(--cds-link-primary, #0f62fe)',
                                          minWidth: '60px',
                                          textAlign: 'right',
                                        }}>
                                          {item.points} pts
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <div style={{
                                      padding: 'var(--cds-spacing-04, 0.75rem)',
                                      textAlign: 'center',
                                      color: 'var(--cds-text-secondary, #525252)',
                                      fontSize: '0.875rem',
                                    }}>
                                      No event placements yet
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableExpandedRow>
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DataTable>
            ) : (
              <div style={{
                padding: 'var(--cds-spacing-07, 2rem)',
                textAlign: 'center',
                color: 'var(--cds-text-secondary, #525252)',
              }}>
                <p>No teams found. Add teams to see standings.</p>
              </div>
            )}
          </Tile>

        {/* Recent Results */}
        {recentResults.length > 0 && (
          <Tile style={{
            padding: 'var(--cds-spacing-06, 1.5rem)',
            marginBottom: 'var(--cds-spacing-05, 1rem)',
            backgroundColor: 'var(--cds-layer-01, #ffffff)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 'var(--cds-spacing-06, 1.5rem)',
            }}>
              <CheckmarkFilled size={24} style={{ marginRight: 'var(--cds-spacing-04, 0.75rem)', color: 'var(--cds-support-success, #24a148)' }} />
              <h3 style={{
                fontSize: '1.75rem',
                fontWeight: '300',
                margin: 0,
                color: 'var(--cds-text-primary, #161616)',
              }}>
                Recent Results
              </h3>
            </div>
            
            <Grid narrow>
              {recentResults.map((result, index) => (
                <Column key={index} lg={5} md={4} sm={4}>
                  <Tile style={{
                    padding: 'var(--cds-spacing-06, 1.5rem)',
                    backgroundColor: 'var(--cds-layer-02, #f4f4f4)',
                    textAlign: 'center',
                    height: '100%',
                  }}>
                    <div style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: 'var(--cds-text-primary, #161616)',
                      marginBottom: 'var(--cds-spacing-05, 1rem)',
                    }}>
                      {result.team1}-{result.team1_subid}
                    </div>
                    <div style={{
                      padding: 'var(--cds-spacing-04, 0.75rem) var(--cds-spacing-06, 1.5rem)',
                      backgroundColor: 'var(--cds-layer-01, #ffffff)',
                      border: '1px solid var(--cds-border-subtle-01, #e0e0e0)',
                      fontWeight: '300',
                      fontSize: '1.75rem',
                      color: 'var(--cds-text-primary, #161616)',
                      margin: 'var(--cds-spacing-05, 1rem) 0',
                    }}>
                      {result.team1_score} – {result.team2_score}
                    </div>
                    <div style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: 'var(--cds-text-primary, #161616)',
                      marginTop: 'var(--cds-spacing-05, 1rem)',
                    }}>
                      {result.team2}-{result.team2_subid}
                    </div>
                  </Tile>
                </Column>
              ))}
            </Grid>
          </Tile>
        )}

        {/* Upcoming Events */}
        <Tile style={{
          padding: 'var(--cds-spacing-06, 1.5rem)',
          marginBottom: 'var(--cds-spacing-05, 1rem)',
          backgroundColor: 'var(--cds-layer-01, #ffffff)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--cds-spacing-05, 1rem)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Events size={24} style={{ marginRight: 'var(--cds-spacing-04, 0.75rem)', color: 'var(--cds-icon-primary, #0f62fe)' }} />
              <h3 style={{
                fontSize: '1.75rem',
                fontWeight: '300',
                margin: 0,
                color: 'var(--cds-text-primary, #161616)',
              }}>
                Upcoming Events
              </h3>
            </div>
            {isAdmin && (
              <Button
                size="sm"
                kind="ghost"
                renderIcon={isEditingEvents ? Save : Edit}
                iconDescription={isEditingEvents ? "Save" : "Edit"}
                onClick={() => isEditingEvents ? saveEvents() : setIsEditingEvents(true)}
              >
                {isEditingEvents ? 'Save' : 'Edit'}
              </Button>
            )}
          </div>

          {upcomingEvents.length > 0 ? (
            <DataTable
              rows={upcomingEvents.map((e, i) => ({ id: i, event: e.event, month: e.month }))}
              headers={[
                { key: 'event', header: 'Event' },
                { key: 'month', header: 'Month' }
              ]}
            >
              {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                <TableContainer>
                  <Table {...getTableProps()} size="md">
                    <TableHead>
                      <TableRow>
                        {headers.map(h => (
                          <TableHeader {...getHeaderProps({ header: h })} key={h.key}>
                            {h.header}
                          </TableHeader>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row, idx) => (
                        <TableRow {...getRowProps({ row })} key={row.id}>
                          <TableCell>
                            {isEditingEvents ? (
                              <TextInput
                                id={`event-${idx}`}
                                labelText=""
                                value={upcomingEvents[idx].event}
                                onChange={(e) => handleEventChange(idx, 'event', e.target.value)}
                              />
                            ) : (
                              row.cells[0].value
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditingEvents ? (
                              <TextInput
                                id={`month-${idx}`}
                                labelText=""
                                value={upcomingEvents[idx].month}
                                onChange={(e) => handleEventChange(idx, 'month', e.target.value)}
                              />
                            ) : (
                              row.cells[1].value
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DataTable>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: 'var(--cds-spacing-06, 1.5rem)',
              color: 'var(--cds-text-secondary, #525252)',
            }}>
              No upcoming events scheduled
            </div>
          )}
        </Tile>

        {/* Past Events */}
        <Tile style={{
          padding: 'var(--cds-spacing-06, 1.5rem)',
          marginBottom: 'var(--cds-spacing-05, 1rem)',
          backgroundColor: 'var(--cds-layer-01, #ffffff)',
        }}>
          <h3 style={{
            fontSize: '1.75rem',
            fontWeight: '300',
            margin: '0 0 var(--cds-spacing-05, 1rem) 0',
            color: 'var(--cds-text-primary, #161616)',
          }}>
            Past Events
          </h3>

          {matches.filter(m => (m.match_type === 'final' || (m.match_type === 'playoff' && m.playoff_position?.startsWith('F'))) && m.match_status === 'played').length > 0 ? (
            <Accordion>
              {matches
                .filter(m => (m.match_type === 'final' || (m.match_type === 'playoff' && m.playoff_position?.startsWith('F'))) && m.match_status === 'played')
                .map((match, index) => {
                  // Extract month from match_date (YYYY-MM-DD format)
                  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                     'July', 'August', 'September', 'October', 'November', 'December'];
                  let displayMonth = 'Unknown';
                  if (match.match_date) {
                    const dateParts = match.match_date.split('-');
                    if (dateParts.length >= 2) {
                      const monthIndex = parseInt(dateParts[1]) - 1;
                      displayMonth = `${monthNames[monthIndex]} ${dateParts[0]}`;
                    }
                  }
                  
                  return (
                    <AccordionItem
                      key={index}
                      title={`${match.event.charAt(0).toUpperCase() + match.event.slice(1)} - ${displayMonth}`}
                    >
                      <div style={{ padding: 'var(--cds-spacing-05, 1rem)' }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: 'var(--cds-spacing-04, 0.75rem)',
                          backgroundColor: 'var(--cds-layer-02, #f4f4f4)',
                          borderRadius: '4px',
                          marginBottom: 'var(--cds-spacing-04, 0.75rem)',
                        }}>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '1rem', marginBottom: 'var(--cds-spacing-02, 0.25rem)' }}>
                              Final Match
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary, #525252)' }}>
                              {match.match_date} {match.match_time && `• ${match.match_time}`}
                            </div>
                          </div>
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: 'var(--cds-spacing-05, 1rem)',
                          backgroundColor: 'var(--cds-layer-02, #f4f4f4)',
                          borderRadius: '4px',
                        }}>
                          <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{
                              fontSize: '1.125rem',
                              fontWeight: match.team1_score > match.team2_score ? '600' : '400',
                              color: 'var(--cds-text-primary, #161616)',
                            }}>
                              {match.team1}-{match.team1_subid}
                            </div>
                          </div>
                          <div style={{
                            padding: 'var(--cds-spacing-04, 0.75rem) var(--cds-spacing-05, 1rem)',
                            backgroundColor: 'var(--cds-layer-01, #ffffff)',
                            border: '1px solid var(--cds-border-subtle-01, #e0e0e0)',
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            margin: '0 var(--cds-spacing-05, 1rem)',
                          }}>
                            {match.team1_score} – {match.team2_score}
                          </div>
                          <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{
                              fontSize: '1.125rem',
                              fontWeight: match.team2_score > match.team1_score ? '600' : '400',
                              color: 'var(--cds-text-primary, #161616)',
                            }}>
                              {match.team2}-{match.team2_subid}
                            </div>
                          </div>
                        </div>
                        {match.team1_score !== match.team2_score && (
                          <div style={{
                            marginTop: 'var(--cds-spacing-04, 0.75rem)',
                            padding: 'var(--cds-spacing-04, 0.75rem)',
                            backgroundColor: 'var(--cds-support-success-inverse, #e8f5e9)',
                            borderRadius: '4px',
                            textAlign: 'center',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: 'var(--cds-support-success, #24a148)',
                          }}>
                            Winner: {match.team1_score > match.team2_score ? `${match.team1}-${match.team1_subid}` : `${match.team2}-${match.team2_subid}`}
                          </div>
                        )}
                      </div>
                    </AccordionItem>
                  );
                })}
            </Accordion>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: 'var(--cds-spacing-06, 1.5rem)',
              color: 'var(--cds-text-secondary, #525252)',
            }}>
              No past finals available
            </div>
          )}
        </Tile>
      </div>
    </div>
  );
};

export default Dashboard;

// Made with Bob - IBM Carbon Design System - Dynamic Version
