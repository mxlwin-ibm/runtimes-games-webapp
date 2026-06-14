import React from 'react';
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
} from "@carbon/icons-react";

// Static data
const tournamentStats = {
  teams: 24,
  matches: 48,
  round: 3,
  completed: 12,
};

const currentMVP = {
  name: "John Doe",
  team: "Titans",
  event: "Foosball",
  goals: 15,
  winRatio: "85%",
};

const nextMatch = {
  team1: "Titans-1",
  team2: "Vikings-1",
  round: 3,
};

const latestResult = {
  team1: "Titans-1",
  team1Score: 10,
  team2: "Vikings-1",
  team2Score: 7,
  winner: "Titans-1",
};

const standings = [
  {
    id: "1",
    position: 1,
    team: "Titans",
    points: 500,
    breakdown: [
      { event: "Foosball League", position: "Winner", points: 100 },
      { event: "Cricket Cup", position: "Winner", points: 100 },
      { event: "Football Championship", position: "Winner", points: 100 },
      { event: "Chess Masters", position: "Winner", points: 100 },
      { event: "Badminton Tournament", position: "Winner", points: 100 },
    ]
  },
  {
    id: "2",
    position: 2,
    team: "El Dragos",
    points: 300,
    breakdown: [
      { event: "Foosball League", position: "Runner-up", points: 50 },
      { event: "Cricket Cup", position: "Winner", points: 100 },
      { event: "Football Championship", position: "Runner-up", points: 50 },
      { event: "Chess Masters", position: "Winner", points: 100 },
    ]
  },
  {
    id: "3",
    position: 3,
    team: "Gladiators",
    points: 200,
    breakdown: [
      { event: "Cricket Cup", position: "Runner-up", points: 50 },
      { event: "Football Championship", position: "Winner", points: 100 },
      { event: "Badminton Tournament", position: "Runner-up", points: 50 },
    ]
  },
  {
    id: "4",
    position: 4,
    team: "Vikings",
    points: 100,
    breakdown: [
      { event: "Chess Masters", position: "Runner-up", points: 50 },
      { event: "Badminton Tournament", position: "Runner-up", points: 50 },
    ]
  }
];

const recentResults = [
  { team1: "Titans-1", score1: 10, team2: "Vikings-1", score2: 7 },
  { team1: "Gladiators-1", score1: 8, team2: "El Dragos-1", score2: 6 },
];

const upcomingEvents = [
  { name: "Cricket", month: "July" },
  { name: "Football", month: "August" },
  { name: "Badminton", month: "September" },
];

const pastEvents = [
  "Foosball League 2024",
  "Cricket Cup 2024",
  "Football Championship 2024",
  "Chess Masters 2024",
];

const Dashboard = () => {
  // DataTable headers and rows for standings
  const standingsHeaders = [
    { key: 'position', header: 'Rank' },
    { key: 'team', header: 'Team' },
    { key: 'points', header: 'Points' },
  ];

  const standingsRows = standings.map(team => ({
    id: team.id,
    position: team.position,
    team: team.team,
    points: team.points,
  }));

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
            Overview of the Foosball League 2024
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
                  FOOSBALL LEAGUE 2024
                </h2>
                <p style={{ 
                  fontSize: '1rem', 
                  color: 'var(--cds-text-secondary, #525252)', 
                  margin: 'var(--cds-spacing-02, 0.25rem) 0 0 0',
                  fontWeight: '400',
                }}>
                  League Stage · Round {tournamentStats.round}
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
              value={(tournamentStats.completed / tournamentStats.matches) * 100}
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
              <div style={{ textAlign: 'center', margin: 'var(--cds-spacing-06, 1.5rem) 0' }}>
                <div style={{ 
                  fontSize: '1.125rem', 
                  fontWeight: '600', 
                  marginBottom: 'var(--cds-spacing-04, 0.75rem)',
                  color: 'var(--cds-text-primary, #161616)',
                }}>
                  {nextMatch.team1}
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
                  {nextMatch.team2}
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
              <div style={{ textAlign: 'center', margin: 'var(--cds-spacing-06, 1.5rem) 0' }}>
                <div style={{
                  fontSize: '1.125rem',
                  fontWeight: latestResult.winner === latestResult.team1 ? '600' : '400',
                  marginBottom: 'var(--cds-spacing-04, 0.75rem)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--cds-text-primary, #161616)',
                }}>
                  {latestResult.team1}
                  {latestResult.winner === latestResult.team1 && (
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
                  {latestResult.team1Score} – {latestResult.team2Score}
                </div>
                <div style={{
                  fontSize: '1.125rem',
                  fontWeight: latestResult.winner === latestResult.team2 ? '600' : '400',
                  marginTop: 'var(--cds-spacing-04, 0.75rem)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--cds-text-primary, #161616)',
                }}>
                  {latestResult.team2}
                  {latestResult.winner === latestResult.team2 && (
                    <CheckmarkFilled size={20} style={{ marginLeft: 'var(--cds-spacing-03, 0.5rem)', color: 'var(--cds-support-success, #24a148)' }} />
                  )}
                </div>
              </div>
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
                  {currentMVP.team}
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
                      {currentMVP.event}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary, #525252)' }}>Event</div>
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
            </ClickableTile>
          </Column>
        </Grid>

        {/* MAIN CONTENT */}
        
        {/* Standings Table with DataTable */}
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
              Current Standings
            </h3>
          </div>
          
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
                      // IBM Carbon compliant styling - Blue only for #1
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

                      // Get breakdown data for this team
                      const teamData = standings.find(s => s.id === row.id);

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
                                {teamData?.breakdown.map((item, idx) => (
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
                                ))}
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
        </Tile>

        {/* Recent Results with StructuredList */}
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
              <Column key={index} lg={8} md={4} sm={4}>
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
                    {result.team1}
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
                    {result.score1} – {result.score2}
                  </div>
                  <div style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: '600',
                    color: 'var(--cds-text-primary, #161616)',
                    marginTop: 'var(--cds-spacing-05, 1rem)',
                  }}>
                    {result.team2}
                  </div>
                </Tile>
              </Column>
            ))}
          </Grid>
        </Tile>

        {/* Upcoming Events */}
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
            <Calendar size={24} style={{ marginRight: 'var(--cds-spacing-04, 0.75rem)', color: 'var(--cds-icon-primary, #0f62fe)' }} />
            <h3 style={{ 
              fontSize: '1.75rem', 
              fontWeight: '300', 
              margin: 0, 
              color: 'var(--cds-text-primary, #161616)',
            }}>
              Upcoming Events
            </h3>
          </div>
          
          <Grid narrow>
            {upcomingEvents.map((event, index) => (
              <Column key={index} lg={5} md={4} sm={4}>
                <ClickableTile style={{
                  padding: 'var(--cds-spacing-06, 1.5rem)',
                  backgroundColor: 'var(--cds-layer-02, #f4f4f4)',
                  textAlign: 'center',
                }}>
                  <Calendar size={40} style={{ marginBottom: 'var(--cds-spacing-05, 1rem)', color: 'var(--cds-icon-primary, #0f62fe)' }} />
                  <h4 style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: '400', 
                    marginBottom: 'var(--cds-spacing-03, 0.5rem)', 
                    color: 'var(--cds-text-primary, #161616)',
                  }}>
                    {event.name}
                  </h4>
                  <Tag type="blue" style={{ marginTop: 'var(--cds-spacing-03, 0.5rem)' }}>
                    {event.month}
                  </Tag>
                </ClickableTile>
              </Column>
            ))}
          </Grid>
        </Tile>

        {/* ACCORDION - Past Events */}
        <Tile style={{
          padding: 'var(--cds-spacing-06, 1.5rem)',
          backgroundColor: 'var(--cds-layer-01, #ffffff)',
        }}>
          <h3 style={{ 
            fontSize: '1.75rem', 
            fontWeight: '300', 
            marginBottom: 'var(--cds-spacing-05, 1rem)', 
            color: 'var(--cds-text-primary, #161616)',
          }}>
            Past Events
          </h3>
          <Accordion>
            <AccordionItem title={`View All Past Events (${pastEvents.length})`}>
              <StructuredListWrapper>
                <StructuredListBody>
                  {pastEvents.map((event, index) => (
                    <StructuredListRow key={index}>
                      <StructuredListCell>
                        <CheckmarkFilled size={20} style={{ marginRight: 'var(--cds-spacing-05, 1rem)', color: 'var(--cds-support-success, #24a148)' }} />
                        {event}
                      </StructuredListCell>
                    </StructuredListRow>
                  ))}
                </StructuredListBody>
              </StructuredListWrapper>
            </AccordionItem>
          </Accordion>
        </Tile>
      </div>
    </div>
  );
};

export default Dashboard;

// Made with Bob - IBM Carbon Design System
