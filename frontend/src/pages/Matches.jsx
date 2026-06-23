import { useState, useEffect, useMemo } from "react";
import {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Button,
  Tile,
  ToastNotification,
  Select,
  SelectItem,
  Accordion,
  AccordionItem,
} from "@carbon/react";
import { Add, Edit, ChevronDown, Calendar } from "@carbon/icons-react";
import { getMatches, getSubteams } from "../services/api";
import MatchForm from "../components/forms/MatchForm";
import MatchUpdateForm from "../components/forms/MatchUpdateForm";
import MatchRescheduleForm from "../components/forms/MatchRescheduleForm";
import LoadingState from "../components/common/LoadingState";
import EmptyState from "../components/common/EmptyState";
import { useAuth } from "../contexts/AuthContext";

const EVENTS = [
  "Foosball",
  "Cricket",
  "Badminton",
  "Snooker",
  "Chess",
  "Carroms",
  "Table Tennis",
  "Football",
];

const POOLS = ["All Pools", "Pool A", "Pool B", "Pool C", "Pool D"];

const Matches = () => {
  const { isAdmin } = useAuth();
  const [matches, setMatches] = useState([]);
  const [subteams, setSubteams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState("Foosball");
  const [selectedMode, setSelectedMode] = useState("League");
  const [selectedPool, setSelectedPool] = useState("All Pools");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchData();
  }, [selectedEvent]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [matchesResponse, subteamsResponse] = await Promise.all([
        getMatches(),
        getSubteams({ event: selectedEvent.toLowerCase() }),
      ]);
      setMatches(matchesResponse.data);
      setSubteams(subteamsResponse.data);
    } catch (err) {
      setToast({
        kind: "error",
        title: "Error",
        subtitle: "Failed to load data",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClick = (match) => {
    setSelectedMatch(match);
    setUpdateModalOpen(true);
  };

  const handleRescheduleClick = (match) => {
    setSelectedMatch(match);
    setRescheduleModalOpen(true);
  };

  // Get pool for a subteam
  const getSubteamPool = (team, subteamId) => {
    const subteam = subteams.find(
      (st) => st.team === team && st.subteam_id.toString() === subteamId.toString()
    );
    return subteam?.pool || null;
  };

  // Get player names for a subteam
  const getSubteamPlayers = (team, subteamId) => {
    const subteam = subteams.find(
      (st) => st.team === team && st.subteam_id.toString() === subteamId.toString()
    );
    return subteam?.player_names || [];
  };

  // Filter matches by event, mode, and pool
  const filteredMatches = useMemo(() => {
    let filtered = matches.filter(
      (m) => String(m?.event ?? "").toLowerCase() === selectedEvent.toLowerCase()
    );

    // Filter by match type (league vs playoffs)
    const matchType = selectedMode === "League" ? "league" : ["quarter_final", "semi_final", "final"];
    filtered = filtered.filter((m) => {
      const type = m.match_type || "league";
      return Array.isArray(matchType) ? matchType.includes(type) : type === matchType;
    });

    // Filter by pool if in League mode and not "All Pools"
    if (selectedMode === "League" && selectedPool !== "All Pools") {
      const poolLetter = selectedPool.split(" ")[1]; // Extract "A", "B", etc.
      filtered = filtered.filter((m) => {
        const pool = getSubteamPool(m.team1, m.team1_subid);
        return pool === poolLetter;
      });
    }

    return filtered;
  }, [matches, selectedEvent, selectedMode, selectedPool, subteams]);

  // Sort matches by date/time, then by round
  const sortMatchesByDateTime = (matches) => {
    return [...matches].sort((a, b) => {
      // First, sort by date if both have dates
      if (a.match_date && b.match_date) {
        const dateCompare = a.match_date.localeCompare(b.match_date);
        if (dateCompare !== 0) return dateCompare;
        
        // If dates are equal, sort by time
        if (a.match_time && b.match_time) {
          return a.match_time.localeCompare(b.match_time);
        }
        // Matches with time come before matches without time
        if (a.match_time) return -1;
        if (b.match_time) return 1;
      }
      
      // Matches with dates come before matches without dates
      if (a.match_date) return -1;
      if (b.match_date) return 1;
      
      // If no dates, sort by round
      return (a.round || 1) - (b.round || 1);
    });
  };

  // Group matches by round (for League) or by playoff stage (for Playoffs)
  const matchesByRound = useMemo(() => {
    const grouped = {};
    filteredMatches.forEach((match) => {
      const round = match.round || 1;
      if (!grouped[round]) {
        grouped[round] = [];
      }
      grouped[round].push(match);
    });
    
    // Sort matches within each round by date/time
    Object.keys(grouped).forEach((round) => {
      grouped[round] = sortMatchesByDateTime(grouped[round]);
    });
    
    return grouped;
  }, [filteredMatches]);

  const matchesByPlayoffStage = useMemo(() => {
    const grouped = {
      quarter_final: [],
      semi_final: [],
      final: [],
    };
    filteredMatches.forEach((match) => {
      const type = match.match_type || "league";
      if (grouped[type]) {
        grouped[type].push(match);
      }
    });
    
    // Sort matches within each playoff stage by date/time
    Object.keys(grouped).forEach((stage) => {
      grouped[stage] = sortMatchesByDateTime(grouped[stage]);
    });
    
    return grouped;
  }, [filteredMatches]);

  const sortedRounds = Object.keys(matchesByRound).sort((a, b) => Number(a) - Number(b));

  const formatTeamDisplay = (teamName, subteamId) => {
    return `${teamName}-${subteamId}`;
  };

  const MatchRow = ({ match }) => {
    const isPlayed = match.match_status === "played";
    const team1Score = match.team1_score || 0;
    const team2Score = match.team2_score || 0;
    const team1Won = isPlayed && team1Score > team2Score;
    const team2Won = isPlayed && team2Score > team1Score;
    const team1Players = getSubteamPlayers(match.team1, match.team1_subid);
    const team2Players = getSubteamPlayers(match.team2, match.team2_subid);
    const pool = getSubteamPool(match.team1, match.team1_subid);
    const isPlayoff = match.match_type && match.match_type !== "league";

    const scoreBoxStyle = {
      display: "inline-block",
      padding: "0.25rem 0.75rem",
      backgroundColor: "#f4f4f4",
      border: "1px solid #e0e0e0",
      borderRadius: "4px",
      fontSize: "0.875rem",
      fontWeight: "600",
      textAlign: "center",
    };

    // Format date and time for enhanced display
    const formatDateTime = () => {
      if (!match.match_date && !match.match_time) return null;
      
      const result = { date: null, time: null, dayOfWeek: null, isToday: false, isTomorrow: false };
      
      if (match.match_date) {
        const [year, month, day] = match.match_date.split('-');
        const matchDate = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Check if today or tomorrow
        const matchDateOnly = new Date(matchDate);
        matchDateOnly.setHours(0, 0, 0, 0);
        result.isToday = matchDateOnly.getTime() === today.getTime();
        result.isTomorrow = matchDateOnly.getTime() === tomorrow.getTime();
        
        // Get day of week
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        result.dayOfWeek = days[matchDate.getDay()];
        
        // Format date as DD/MM/YYYY
        result.date = `${day}/${month}/${year}`;
      }
      
      if (match.match_time) {
        // Convert 24-hour to 12-hour format
        const [hours, minutes] = match.match_time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        result.time = `${hour12}:${minutes} ${ampm}`;
      }
      
      return result;
    };

    const dateTimeInfo = formatDateTime();

    return (
      <Accordion>
        <AccordionItem
          title={
            <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "1rem" }}>
              {/* Date and Time Column */}
              <div style={{
                minWidth: "140px",
                display: "flex",
                flexDirection: "column",
                gap: "0.125rem",
                fontSize: "0.75rem",
                color: "#525252"
              }}>
                {dateTimeInfo && dateTimeInfo.date && (
                  <div style={{ fontWeight: dateTimeInfo.isToday || dateTimeInfo.isTomorrow ? "600" : "400" }}>
                    {dateTimeInfo.isToday ? "Today" : dateTimeInfo.isTomorrow ? "Tomorrow" : `${dateTimeInfo.dayOfWeek}, ${dateTimeInfo.date}`}
                  </div>
                )}
                {dateTimeInfo && dateTimeInfo.time && (
                  <div>{dateTimeInfo.time}</div>
                )}
              </div>

              {/* Team Names and Score */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "2fr auto 2fr",
                gap: "1rem",
                alignItems: "center",
                flex: 1
              }}>
                <div style={{ textAlign: "right", fontWeight: team1Won ? "bold" : "normal" }}>
                  {formatTeamDisplay(match.team1, match.team1_subid)}
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  {isPlayed ? (
                    <span style={scoreBoxStyle}>{team1Score}-{team2Score}</span>
                  ) : (
                    <span style={{ fontSize: "0.875rem", color: "#525252" }}>vs</span>
                  )}
                </div>
                <div style={{ textAlign: "left", fontWeight: team2Won ? "bold" : "normal" }}>
                  {formatTeamDisplay(match.team2, match.team2_subid)}
                </div>
              </div>
              
              {/* Action Buttons Column - Fixed width to maintain alignment */}
              <div style={{ minWidth: "200px", width: "200px", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                {isAdmin && match.match_status === "scheduled" && (
                  <>
                    <Button
                      kind="tertiary"
                      size="sm"
                      renderIcon={Calendar}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRescheduleClick(match);
                      }}
                    >
                      Reschedule
                    </Button>
                    <Button
                      kind="tertiary"
                      size="sm"
                      renderIcon={Edit}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateClick(match);
                      }}
                    >
                      Update
                    </Button>
                  </>
                )}
              </div>
            </div>
          }
        >
          <div style={{ padding: "1rem", backgroundColor: "#f4f4f4" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "1rem" }}>
              <div>
                <h5 style={{ marginBottom: "0.5rem", fontWeight: "600" }}>
                  {formatTeamDisplay(match.team1, match.team1_subid)}
                </h5>
                {team1Players.length > 0 ? (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {team1Players.map((player, idx) => (
                      <li key={idx} style={{ padding: "0.25rem 0" }}>{player}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: "#525252", fontStyle: "italic" }}>No players</p>
                )}
              </div>
              <div>
                <h5 style={{ marginBottom: "0.5rem", fontWeight: "600" }}>
                  {formatTeamDisplay(match.team2, match.team2_subid)}
                </h5>
                {team2Players.length > 0 ? (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {team2Players.map((player, idx) => (
                      <li key={idx} style={{ padding: "0.25rem 0" }}>{player}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: "#525252", fontStyle: "italic" }}>No players</p>
                )}
              </div>
            </div>
            <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: "1rem", fontSize: "0.875rem", color: "#525252" }}>
              <p><strong>Match ID:</strong> {match._id}</p>
              <p><strong>Event:</strong> {match.event}</p>
              {!isPlayoff && <p><strong>Pool:</strong> {pool || "N/A"}</p>}
              {!isPlayoff && <p><strong>Round:</strong> {match.round || 1}</p>}
              <p><strong>Status:</strong> {match.match_status}</p>
              {match.match_date && <p><strong>Date:</strong> {match.match_date}</p>}
              {match.match_time && <p><strong>Time:</strong> {match.match_time}</p>}
            </div>
          </div>
        </AccordionItem>
      </Accordion>
    );
  };

  const RoundTile = ({ round, matches }) => (
    <Tile style={{ marginBottom: "1.5rem", padding: "1.5rem" }}>
      <h3 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "600" }}>
        Round {round}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {matches.map((match) => (
          <MatchRow key={match._id} match={match} />
        ))}
      </div>
    </Tile>
  );

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div style={{ padding: "2rem" }}>
      {toast && (
        <ToastNotification
          kind={toast.kind}
          title={toast.title}
          subtitle={toast.subtitle}
          timeout={3000}
          onClose={() => setToast(null)}
          style={{ position: "fixed", top: "3rem", right: "1rem", zIndex: 9999 }}
        />
      )}
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1>Matches</h1>
        {isAdmin && (
          <Button renderIcon={Add} onClick={() => setScheduleModalOpen(true)}>
            Schedule Match
          </Button>
        )}
      </div>

      {/* Event Filter Tabs */}
      <div style={{ marginBottom: "1rem" }}>
        <Tabs
          selectedIndex={EVENTS.indexOf(selectedEvent)}
          onChange={(evt) => {
            const index = evt.selectedIndex;
            setSelectedEvent(EVENTS[index]);
          }}
        >
          <TabList contained aria-label="Event filter tabs">
            {EVENTS.map((event) => (
              <Tab key={event}>{event}</Tab>
            ))}
          </TabList>
          <TabPanels>
            {EVENTS.map((event) => (
              <TabPanel key={event}></TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </div>

      {/* League/Playoffs Toggle */}
      <div style={{ marginBottom: "1rem" }}>
        <Tabs
          selectedIndex={selectedMode === "League" ? 0 : 1}
          onChange={(evt) => {
            setSelectedMode(evt.selectedIndex === 0 ? "League" : "Playoffs");
          }}
        >
          <TabList contained aria-label="Mode tabs">
            <Tab>League</Tab>
            <Tab>Playoffs</Tab>
          </TabList>
          <TabPanels>
            <TabPanel></TabPanel>
            <TabPanel></TabPanel>
          </TabPanels>
        </Tabs>
      </div>

      {/* Pool Filter (only in League mode) */}
      {selectedMode === "League" && (
        <div style={{ marginBottom: "1.5rem", maxWidth: "300px" }}>
          <Select
            id="pool-filter"
            labelText="Filter by Pool"
            value={selectedPool}
            onChange={(e) => setSelectedPool(e.target.value)}
          >
            {POOLS.map((pool) => (
              <SelectItem key={pool} value={pool} text={pool} />
            ))}
          </Select>
        </div>
      )}

      {/* Matches grouped by round (League) or stage (Playoffs) */}
      {selectedMode === "League" ? (
        sortedRounds.length === 0 ? (
          <EmptyState
            title="No league matches found"
            description="Schedule a new match to get started"
          />
        ) : (
          <div>
            {sortedRounds.map((round) => (
              <RoundTile key={round} round={round} matches={matchesByRound[round]} />
            ))}
          </div>
        )
      ) : (
        // Playoffs view - grouped by stage
        <div>
          {matchesByPlayoffStage.quarter_final.length > 0 && (
            <Tile style={{ marginBottom: "1.5rem", padding: "1.5rem" }}>
              <h3 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "600" }}>
                Quarter Finals
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {matchesByPlayoffStage.quarter_final.map((match) => (
                  <MatchRow key={match._id} match={match} />
                ))}
              </div>
            </Tile>
          )}
          
          {matchesByPlayoffStage.semi_final.length > 0 && (
            <Tile style={{ marginBottom: "1.5rem", padding: "1.5rem" }}>
              <h3 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "600" }}>
                Semi Finals
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {matchesByPlayoffStage.semi_final.map((match) => (
                  <MatchRow key={match._id} match={match} />
                ))}
              </div>
            </Tile>
          )}
          
          {matchesByPlayoffStage.final.length > 0 && (
            <Tile style={{ marginBottom: "1.5rem", padding: "1.5rem" }}>
              <h3 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "600" }}>
                Final
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {matchesByPlayoffStage.final.map((match) => (
                  <MatchRow key={match._id} match={match} />
                ))}
              </div>
            </Tile>
          )}
          
          {matchesByPlayoffStage.quarter_final.length === 0 &&
           matchesByPlayoffStage.semi_final.length === 0 &&
           matchesByPlayoffStage.final.length === 0 && (
            <EmptyState
              title="No playoff matches found"
              description="Schedule playoff matches to get started"
            />
          )}
        </div>
      )}

      <MatchForm
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        onSuccess={() => {
          setToast({
            kind: "success",
            title: "Success",
            subtitle: "Match scheduled successfully",
          });
          fetchData();
        }}
        event={selectedEvent}
        mode={selectedMode}
      />
      <MatchUpdateForm
        open={updateModalOpen}
        onClose={() => {
          setUpdateModalOpen(false);
          setSelectedMatch(null);
        }}
        onSuccess={() => {
          setToast({
            kind: "success",
            title: "Success",
            subtitle: "Match result updated successfully",
          });
          fetchData();
        }}
        match={selectedMatch}
      />
      <MatchRescheduleForm
        open={rescheduleModalOpen}
        onClose={() => {
          setRescheduleModalOpen(false);
          setSelectedMatch(null);
        }}
        onSuccess={() => {
          setToast({
            kind: "success",
            title: "Success",
            subtitle: "Match rescheduled successfully",
          });
          fetchData();
        }}
        match={selectedMatch}
      />
    </div>
  );
};

export default Matches;

// Made with Bob
