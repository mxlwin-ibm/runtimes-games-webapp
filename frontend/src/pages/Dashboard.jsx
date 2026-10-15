import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Notification,
} from "@carbon/icons-react";
import { getDashboard, getMatches, getPointsTable, getPlayers, getSubteams, getEvents, updateEvents, getAnnouncements } from '../services/api';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import AnnouncementTicker from '../components/common/AnnouncementTicker';
import AnnouncementManager from '../components/forms/AnnouncementManager';
import EventManager from '../components/forms/EventManager';
import { useAuth } from '../contexts/AuthContext';

const formatTeamDisplay = (teamName, subteamId) => {
  if (subteamId === "0") {
    const placeholderMap = {
      "POOL_A_1ST": "Pool A Winner",
      "POOL_A_2ND": "Pool A Runner-up",
      "POOL_B_1ST": "Pool B Winner",
      "POOL_B_2ND": "Pool B Runner-up",
      "POOL_C_1ST": "Pool C Winner",
      "POOL_C_2ND": "Pool C Runner-up",
      "POOL_D_1ST": "Pool D Winner",
      "POOL_D_2ND": "Pool D Runner-up",
      "QF1_WINNER": "QF1 Winner",
      "QF2_WINNER": "QF2 Winner",
      "QF3_WINNER": "QF3 Winner",
      "QF4_WINNER": "QF4 Winner",
      "SF1_WINNER": "SF1 Winner",
      "SF2_WINNER": "SF2 Winner",
    };
    return placeholderMap[teamName] || teamName;
  }
  return `${teamName}-${subteamId}`;
};

// Events scored in goals; the MVP card only shows Goals for these.
const GOAL_BASED_EVENTS = ['foosball', 'football'];

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matches, setMatches] = useState([]);
  const [pointsTable, setPointsTable] = useState([]);
  const [teams, setTeams] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [ongoingEvents, setOngoingEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('foosball');
  const [overallStandings, setOverallStandings] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [isEventManagerOpen, setIsEventManagerOpen] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, [selectedEvent]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard data for selected event and supporting data in parallel
      const [dashboardRes, teamsRes, allMatchesRes] = await Promise.all([
        getDashboard({ event: selectedEvent }),
        getPlayers(),
        getMatches(),
      ]);

      const dashboardData = dashboardRes.data;
      const allMatches = allMatchesRes.data || [];
      const allTeams = teamsRes.data || [];

      setMatches(allMatches);
      setPointsTable(dashboardData.standings || []);
      setTeams(allTeams);
      setDashboardStats(dashboardData.stats || null);
      setUpcomingEvents(dashboardData.events || []);
      setAnnouncements(dashboardData.announcements || []);

      const incoming = dashboardData.ongoingEvents || [];
      setOngoingEvents(incoming);

      // If the currently selected event was filtered out (tournament complete),
      // switch to the first remaining ongoing event so the dashboard isn't stuck
      // showing a completed event.
      if (
        incoming.length > 0 &&
        !incoming.some(e => e.event.toLowerCase() === selectedEvent.toLowerCase())
      ) {
        setSelectedEvent(incoming[0].event.toLowerCase());
      }

      // Calculate overall tournament standings from final matches across all sports
      const standings = calculateOverallStandings(allMatches, allTeams);
      setOverallStandings(standings);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleEventChange = (index, field, value) => {
    setUpcomingEvents(prev =>
      prev.map((ev, i) => (i === index ? { ...ev, [field]: value } : ev))
    );
  };

  const saveEvents = async () => {
    try {
      await updateEvents(upcomingEvents);
      setIsEditingEvents(false);
      fetchDashboardData();
    } catch (err) {
      console.error('Error saving events:', err);
      alert('Failed to save events. Please try again.');
    }
  };

  // Helper to reliably parse date and time string into timestamp for sorting
  const parseMatchDateTime = (dateStr, timeStr) => {
    if (!dateStr) return 0;
    const rawTime = timeStr || '00:00';
    const formattedTime = rawTime.length === 4 ? `0${rawTime}` : rawTime;
    const dt = new Date(`${dateStr}T${formattedTime}`);
    return isNaN(dt.getTime()) ? 0 : dt.getTime();
  };

  // Calculate overall tournament standings from playoff finals
  const calculateOverallStandings = (allMatches, teamsData) => {
    const teamPoints = {};

    teamsData.forEach(player => {
      const teamName = player.team;
      if (!teamPoints[teamName]) {
        teamPoints[teamName] = { team: teamName, points: 0, breakdown: [] };
      }
    });

    const finalMatches = allMatches.filter(
      m => (m.match_type === 'final' ||
            (m.match_type === 'playoff' && m.playoff_position?.startsWith('F'))) &&
           m.match_status === 'played'
    );

    finalMatches.forEach(match => {
      const score1 = match.team1_score ?? 0;
      const score2 = match.team2_score ?? 0;
      const eventName = match.event || 'Unknown Event';
      const formattedEvent = eventName.charAt(0).toUpperCase() + eventName.slice(1);

      // Handle drawn final match gracefully
      if (score1 === score2) {
        const team1 = match.team1;
        const team2 = match.team2;
        if (!teamPoints[team1]) teamPoints[team1] = { team: team1, points: 0, breakdown: [] };
        if (!teamPoints[team2]) teamPoints[team2] = { team: team2, points: 0, breakdown: [] };
        teamPoints[team1].points += 75;
        teamPoints[team1].breakdown.push({ event: formattedEvent, position: 'Joint Winner', points: 75 });
        teamPoints[team2].points += 75;
        teamPoints[team2].breakdown.push({ event: formattedEvent, position: 'Joint Winner', points: 75 });
        return;
      }

      const winner = score1 > score2 ? match.team1 : match.team2;
      const runnerUp = score1 > score2 ? match.team2 : match.team1;

      if (!teamPoints[winner]) {
        teamPoints[winner] = { team: winner, points: 0, breakdown: [] };
      }
      if (!teamPoints[runnerUp]) {
        teamPoints[runnerUp] = { team: runnerUp, points: 0, breakdown: [] };
      }

      teamPoints[winner].points += 100;
      teamPoints[winner].breakdown.push({
        event: formattedEvent,
        position: 'Winner',
        points: 100
      });

      teamPoints[runnerUp].points += 50;
      teamPoints[runnerUp].breakdown.push({
        event: formattedEvent,
        position: 'Runner-up',
        points: 50
      });
    });

    return Object.values(teamPoints).sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return a.team.localeCompare(b.team);
    });
  };

  // Find active ongoing event item from backend response or fallback
  const activeOngoingEventData =
    ongoingEvents.find(e => e.event.toLowerCase() === selectedEvent.toLowerCase()) ||
    ongoingEvents[0] ||
    null;

  // Filter matches specifically for the selected ongoing event
  const currentEventMatches = matches.filter(
    m => (m.event || 'foosball').toLowerCase() === selectedEvent.toLowerCase()
  );

  // Tournament stats — computed directly from raw matches so they are always accurate,
  // regardless of what the backend's ongoingEvents cache contains.
  const currentEventSubteamCount = activeOngoingEventData?.stats?.totalTeams ?? (dashboardStats?.totalTeams ?? 0);
  const tournamentStats = {
    teams: currentEventSubteamCount,
    matches: currentEventMatches.length,
    round: currentEventMatches.length > 0 ? Math.max(...currentEventMatches.map(m => m.round || 1)) : 1,
    completed: currentEventMatches.filter(m => m.match_status === 'played').length,
  };

  // Next scheduled match (prioritizing selected event, then any scheduled match)
  const selectedEventScheduled = currentEventMatches.filter(m => m.match_status === 'scheduled');
  const allScheduled = matches.filter(m => m.match_status === 'scheduled');
  const candidateScheduled = selectedEventScheduled.length > 0 ? selectedEventScheduled : allScheduled;
  const nextMatch = candidateScheduled.sort((a, b) => {
    const timeA = parseMatchDateTime(a.match_date, a.match_time);
    const timeB = parseMatchDateTime(b.match_date, b.match_time);
    if (timeA && timeB) return timeA - timeB;
    if (timeA) return -1;
    if (timeB) return 1;
    return (a.round || 0) - (b.round || 0);
  })[0];

  // Latest completed match (prioritizing selected event, then any completed match)
  const selectedEventPlayed = currentEventMatches.filter(m => m.match_status === 'played');
  const allPlayed = matches.filter(m => m.match_status === 'played');
  const candidatePlayed = selectedEventPlayed.length > 0 ? selectedEventPlayed : allPlayed;
  const latestResult = candidatePlayed.sort((a, b) => {
    const timeA = parseMatchDateTime(a.match_date, a.match_time);
    const timeB = parseMatchDateTime(b.match_date, b.match_time);
    if (timeA && timeB) return timeB - timeA;
    if (timeA) return -1;
    if (timeB) return 1;
    return (b.round || 0) - (a.round || 0);
  })[0];

  // Recent results (last 3 completed matches)
  const recentResults = candidatePlayed
    .sort((a, b) => {
      const timeA = parseMatchDateTime(a.match_date, a.match_time);
      const timeB = parseMatchDateTime(b.match_date, b.match_time);
      if (timeA && timeB) return timeB - timeA;
      if (timeA) return -1;
      if (timeB) return 1;
      return (b.round || 0) - (a.round || 0);
    })
    .slice(0, 3);

  // Calculate MVP from active ongoing event or points table.
  // Returns null when there are no ongoing events — the MVP card must be
  // blank when all tournaments are complete.
  const calculateMVP = () => {
    if (ongoingEvents.length === 0) return null;

    if (activeOngoingEventData?.mvp) {
      const mvp = activeOngoingEventData.mvp;
      const wonSafe = mvp.won ?? 0;
      const winRatio = mvp.played > 0
        ? Math.round((wonSafe / mvp.played) * 100)
        : 0;

      return {
        name: mvp.team_id || 'Unknown',
        team: mvp.team_name?.split('-')[0] || 'Unknown',
        subteam: mvp.team_name || 'Unknown',
        event: activeOngoingEventData.event || selectedEvent,
        wins: wonSafe,
        goals: mvp.gf ?? 0,
        winRatio: `${winRatio}%`,
      };
    }

    if (pointsTable.length > 0) {
      const topTeam = pointsTable[0];
      const wonSafe = topTeam.won ?? 0;
      const winRatio = topTeam.played > 0
        ? Math.round((wonSafe / topTeam.played) * 100)
        : 0;

      return {
        name: topTeam.team_id || 'Unknown',
        team: topTeam.team_name?.split('-')[0] || 'Unknown',
        subteam: topTeam.team_name || 'Unknown',
        event: selectedEvent,
        wins: wonSafe,
        goals: topTeam.gf ?? 0,
        winRatio: `${winRatio}%`,
      };
    }

    return null;
  };

  // Stage milestones for selected event tournament
  const getStageMilestones = () => {
    const leagueMatches = currentEventMatches.filter(m => m.match_type === 'league');
    const qfMatches = currentEventMatches.filter(
      m => m.match_type === 'quarter_final' || (m.match_type === 'playoff' && m.playoff_position?.startsWith('QF'))
    );
    const sfMatches = currentEventMatches.filter(
      m => m.match_type === 'semi_final' || (m.match_type === 'playoff' && m.playoff_position?.startsWith('SF'))
    );
    const finalMatches = currentEventMatches.filter(
      m => m.match_type === 'final' || (m.match_type === 'playoff' && m.playoff_position?.startsWith('F'))
    );

    const getStageStatus = (matchesList) => {
      if (matchesList.length === 0) return 'upcoming';
      const played = matchesList.filter(m => m.match_status === 'played').length;
      if (played === matchesList.length && matchesList.length > 0) return 'completed';
      if (played > 0) return 'active';
      return 'scheduled';
    };

    return [
      {
        id: 'group',
        name: 'Group Stage',
        status: getStageStatus(leagueMatches),
        count: leagueMatches.length > 0 ? `${leagueMatches.filter(m => m.match_status === 'played').length}/${leagueMatches.length}` : null,
      },
      {
        id: 'qf',
        name: 'Quarter Finals',
        status: getStageStatus(qfMatches),
        count: qfMatches.length > 0 ? `${qfMatches.filter(m => m.match_status === 'played').length}/${qfMatches.length}` : null,
      },
      {
        id: 'sf',
        name: 'Semi Finals',
        status: getStageStatus(sfMatches),
        count: sfMatches.length > 0 ? `${sfMatches.filter(m => m.match_status === 'played').length}/${sfMatches.length}` : null,
      },
      {
        id: 'final',
        name: 'Final',
        status: getStageStatus(finalMatches),
        count: finalMatches.length > 0 ? `${finalMatches.filter(m => m.match_status === 'played').length}/${finalMatches.length}` : null,
      },
    ];
  };

  const stageMilestones = getStageMilestones();
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

        {/* Announcement Banner */}
        <AnnouncementTicker
          announcements={announcements}
          isAdmin={isAdmin}
          onManageClick={() => setIsAnnouncementModalOpen(true)}
        />

        {/* HERO SECTION / ONGOING EVENTS */}
        {ongoingEvents.length === 0 ? (
          <Tile style={{
            padding: 'var(--cds-spacing-07, 2rem)',
            marginBottom: 'var(--cds-spacing-05, 1rem)',
            backgroundColor: 'var(--cds-layer-01, #ffffff)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <Trophy size={40} style={{ color: 'var(--cds-icon-disabled, #8d8d8d)' }} />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '400', margin: 0, color: 'var(--cds-text-primary, #161616)' }}>
                No ongoing events
              </h2>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--cds-text-secondary, #525252)' }}>
                All tournaments have concluded. Check the Overall Standings below.
              </p>
            </div>
          </Tile>
        ) : (
        <Tile style={{
          padding: 'var(--cds-spacing-07, 2rem)',
          marginBottom: 'var(--cds-spacing-05, 1rem)',
          backgroundColor: 'var(--cds-layer-01, #ffffff)',
        }}>
          {/* Header & Parallel Event Badges */}
          <div style={{ marginBottom: 'var(--cds-spacing-06, 1.5rem)' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 'var(--cds-spacing-03, 0.5rem)',
              marginBottom: 'var(--cds-spacing-04, 0.75rem)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag type="green">Ongoing Events</Tag>
                {ongoingEvents.length > 1 && (
                  <span style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary, #525252)' }}>
                    ({ongoingEvents.length} events running in parallel)
                  </span>
                )}
              </div>

              {/* Event switcher pills when multiple events are running */}
              {ongoingEvents.length > 1 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {ongoingEvents.map(ev => {
                    const isSelected = selectedEvent.toLowerCase() === ev.event.toLowerCase();
                    return (
                      <Tag
                        key={ev.event}
                        type={isSelected ? 'blue' : 'cool-gray'}
                        style={{
                          cursor: 'pointer',
                          fontWeight: isSelected ? '600' : '400',
                          padding: '4px 10px',
                          margin: 0,
                          transition: 'all 0.2s ease',
                          border: isSelected ? '1px solid var(--cds-interactive-01, #0f62fe)' : '1px solid transparent',
                        }}
                        onClick={() => setSelectedEvent(ev.event.toLowerCase())}
                      >
                        {ev.event.toUpperCase()} ({ev.stats?.playedMatches ?? 0}/{ev.stats?.totalMatches ?? 0})
                      </Tag>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--cds-spacing-04, 0.75rem)' }}>
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
                  {selectedEvent.toUpperCase()}
                </h2>
              </div>
            </div>
          </div>

          {/* Tournament Stage Milestone Visualizer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            overflowX: 'auto',
            padding: '12px 16px',
            backgroundColor: 'var(--cds-layer-02, #f4f4f4)',
            borderRadius: '6px',
            marginBottom: 'var(--cds-spacing-06, 1.5rem)',
          }}>
            {stageMilestones.map((st, i) => {
              const isCompleted = st.status === 'completed';
              const isActive = st.status === 'active';
              const isScheduled = st.status === 'scheduled';
              const badgeBg = isCompleted ? '#24a148' : isActive ? '#0f62fe' : isScheduled ? '#0043ce' : '#8d8d8d';

              return (
                <React.Fragment key={st.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'fit-content' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: badgeBg,
                      color: '#ffffff',
                    }}>
                      {isCompleted ? '✓' : i + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--cds-text-primary, #161616)' }}>
                        {st.name}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--cds-text-secondary, #525252)' }}>
                        {isCompleted ? 'Completed' : isActive ? 'Live / In Progress' : isScheduled ? 'Scheduled' : 'Upcoming'}
                        {st.count && ` (${st.count})`}
                      </div>
                    </div>
                  </div>
                  {i < stageMilestones.length - 1 && (
                    <div style={{
                      flex: 1,
                      height: '2px',
                      backgroundColor: stageMilestones[i + 1].status !== 'upcoming' ? '#0f62fe' : '#e0e0e0',
                      minWidth: '24px',
                      margin: '0 8px',
                    }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Progress Bar for selected event */}
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
                {selectedEvent.toUpperCase()} Tournament Progress
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

          {/* Quick Stats for selected event */}
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

          {/* Quick-Action CTAs */}
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            marginTop: 'var(--cds-spacing-06, 1.5rem)',
            paddingTop: 'var(--cds-spacing-05, 1rem)',
            borderTop: '1px solid var(--cds-border-subtle-01, #e0e0e0)',
          }}>
            <Button
              size="sm"
              kind="primary"
              renderIcon={Calendar}
              as={Link}
              to={`/matches?event=${encodeURIComponent(selectedEvent)}`}
            >
              View Match Schedule
            </Button>
            <Button
              size="sm"
              kind="tertiary"
              renderIcon={Trophy}
              as={Link}
              to={`/points-table?event=${encodeURIComponent(selectedEvent)}`}
            >
              Full Standings Table
            </Button>
            <Button
              size="sm"
              kind="ghost"
              renderIcon={User}
              as={Link}
              to={`/squads?event=${encodeURIComponent(selectedEvent)}`}
            >
              Squad Rosters
            </Button>
          </div>
        </Tile>
        )}

        {/* SUMMARY CARDS */}
        <Grid narrow style={{ marginBottom: 'var(--cds-spacing-05, 1rem)' }}>
          {/* Next Match Card */}
          <Column lg={5} md={4} sm={4}>
            <ClickableTile style={{
              padding: 'var(--cds-spacing-06, 1.5rem)',
              height: '100%',
              backgroundColor: 'var(--cds-layer-01, #ffffff)',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--cds-spacing-05, 1rem)'
              }}>
                <Tag type="blue" style={{ margin: 0 }}>
                  Next Match
                </Tag>
                {nextMatch?.event && (
                  <Tag type="cyan" size="sm" style={{ margin: 0 }}>
                    {nextMatch.event.toUpperCase()}
                  </Tag>
                )}
              </div>
              {nextMatch ? (
                <>
                  <div style={{ textAlign: 'center', margin: 'var(--cds-spacing-06, 1.5rem) 0' }}>
                    <div style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      marginBottom: 'var(--cds-spacing-04, 0.75rem)',
                      color: 'var(--cds-text-primary, #161616)',
                    }}>
                      {formatTeamDisplay(nextMatch.team1, nextMatch.team1_subid)}
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
                      {formatTeamDisplay(nextMatch.team2, nextMatch.team2_subid)}
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
                    {nextMatch.match_type === 'quarter_final'
                      ? 'Quarter Final'
                      : nextMatch.match_type === 'semi_final'
                        ? 'Semi Final'
                        : nextMatch.match_type === 'final'
                          ? 'Final'
                          : `Round ${nextMatch.round}`}
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
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--cds-spacing-05, 1rem)'
              }}>
                <Tag type="green" style={{ margin: 0 }}>
                  Latest Result
                </Tag>
                {latestResult?.event && (
                  <Tag type="teal" size="sm" style={{ margin: 0 }}>
                    {latestResult.event.toUpperCase()}
                  </Tag>
                )}
              </div>
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
                    {formatTeamDisplay(latestResult.team1, latestResult.team1_subid)}
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
                    {formatTeamDisplay(latestResult.team2, latestResult.team2_subid)}
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
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--cds-spacing-05, 1rem)'
              }}>
                <Tag type="blue" style={{ margin: 0 }}>
                  Current MVP
                </Tag>
                {currentMVP?.event && (
                  <Tag type="magenta" size="sm" style={{ margin: 0 }}>
                    {currentMVP.event.toUpperCase()}
                  </Tag>
                )}
              </div>
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
                    {GOAL_BASED_EVENTS.includes(String(currentMVP.event).toLowerCase()) && (
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
                    )}
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
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--cds-spacing-03, 0.5rem)' }}>
                      {result.event && (
                        <Tag type="cool-gray" size="sm" style={{ margin: 0 }}>
                          {result.event.toUpperCase()}
                        </Tag>
                      )}
                    </div>
                    <div style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: 'var(--cds-text-primary, #161616)',
                      marginBottom: 'var(--cds-spacing-05, 1rem)',
                    }}>
                      {formatTeamDisplay(result.team1, result.team1_subid)}
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
                      {formatTeamDisplay(result.team2, result.team2_subid)}
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
                renderIcon={Edit}
                iconDescription="Manage Events"
                onClick={() => setIsEventManagerOpen(true)}
              >
                Manage Events
              </Button>
            )}
          </div>

          {upcomingEvents.length > 0 ? (
            <DataTable
              rows={upcomingEvents.map((e, i) => ({
                id: e._id || e.id || `event-${i}`,
                event: e.event,
                month: e.month,
                status: e.status || 'upcoming',
                description: e.description || '',
              }))}
              headers={[
                { key: 'event', header: 'Event' },
                { key: 'month', header: 'Month / Timing' },
                { key: 'status', header: 'Status' }
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
                      {rows.map((row) => {
                        const eventItem = upcomingEvents.find(
                          (ev, idx) => (ev._id || ev.id || `event-${idx}`) === row.id
                        );
                        const statusVal = eventItem?.status || 'upcoming';
                        const statusTagType =
                          statusVal === 'registration_open'
                            ? 'teal'
                            : statusVal === 'ongoing'
                            ? 'green'
                            : statusVal === 'completed'
                            ? 'cool-gray'
                            : 'blue';
                        const statusLabel =
                          statusVal === 'registration_open'
                            ? 'Registration Open'
                            : statusVal.charAt(0).toUpperCase() + statusVal.slice(1);

                        return (
                          <TableRow {...getRowProps({ row })} key={row.id}>
                            <TableCell>
                              <div style={{ fontWeight: 600, color: 'var(--cds-text-primary, #161616)' }}>
                                {row.cells[0].value}
                              </div>
                              {eventItem?.description && (
                                <div style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary, #525252)' }}>
                                  {eventItem.description}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <span style={{ color: 'var(--cds-text-secondary, #525252)' }}>
                                {row.cells[1].value}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Tag type={statusTagType} size="sm">
                                {statusLabel}
                              </Tag>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
                              {formatTeamDisplay(match.team1, match.team1_subid)}
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
                              {formatTeamDisplay(match.team2, match.team2_subid)}
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
                            Winner: {match.team1_score > match.team2_score ? formatTeamDisplay(match.team1, match.team1_subid) : formatTeamDisplay(match.team2, match.team2_subid)}
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

        {/* Announcement Manager Modal */}
        <AnnouncementManager
          open={isAnnouncementModalOpen}
          onClose={() => {
            setIsAnnouncementModalOpen(false);
            fetchDashboardData();
          }}
        />

        {/* Event Manager Modal */}
        <EventManager
          open={isEventManagerOpen}
          onClose={() => {
            setIsEventManagerOpen(false);
            fetchDashboardData();
          }}
        />
      </div>
    </div>
  );
};

export default Dashboard;

// Made with Bob - IBM Carbon Design System - Dynamic Version
