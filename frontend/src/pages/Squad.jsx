import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  ToastNotification,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Button,
} from "@carbon/react";
import { Add } from "@carbon/icons-react";

import { getSubteams, getPlayers } from "../services/api";
import LoadingState from "../components/common/LoadingState";
import EmptyState from "../components/common/EmptyState";
import SquadForm from "../components/forms/SquadForm";
import { useAuth } from "../contexts/AuthContext";

// Headers for squad table when specific event is selected
const squadHeaders = [
  { key: "team", header: "Team" },
  { key: "subteam_id", header: "Squad ID" },
  { key: "player_names", header: "Players" },
];

// Headers for player list when "All" is selected
const playerHeaders = [
  { key: "player_name", header: "Player Name" },
];

const SPORTS = [
  "All",
  "Foosball",
  "Cricket",
  "Badminton",
  "Snooker",
  "Chess",
  "Carroms",
  "Table Tennis",
  "Football",
];

const Squad = () => {
  const { isAdmin } = useAuth();
  const [squads, setSquads] = useState([]);
  const [players, setPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [selectedSport, setSelectedSport] = useState("All");
  const [selectedTeam, setSelectedTeam] = useState("Titans");
  const [modalOpen, setModalOpen] = useState(false);

  const fetchSquads = useCallback(async (isMounted = () => true, filters = {}) => {
    try {
      setLoading(true);

      // Build query parameters for backend filtering
      const params = {};
      if (filters.event && filters.event !== "All") {
        params.event = filters.event.toLowerCase();
      }
      // Always include team filter since there's no "All" option
      if (filters.team) {
        params.team = filters.team;
      }

      const response = await getSubteams(params);

      const squadsData = Array.isArray(response?.data)
        ? response.data
        : [];

      console.log("Raw squads data:", squadsData);

      const transformedSquads = squadsData.map((squad, index) => {
        console.log("Squad player_names:", squad?.player_names);
        return {
          ...squad,
          id: squad?._id || `squad-${index}`,
          player_count: squad?.player_ids?.length || 0,
          player_names: Array.isArray(squad?.player_names)
            ? squad.player_names.join(", ")
            : (squad?.player_names || "-"),
        };
      });

      console.log("Transformed squads:", transformedSquads);

      if (!isMounted()) return;

      setSquads(transformedSquads);
    } catch (err) {
      if (!isMounted()) return;

      setToast({
        kind: "error",
        title: "Error",
        subtitle: "Failed to load squads",
      });
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  }, []);

  const fetchPlayers = useCallback(async (isMounted = () => true, team) => {
    try {
      setLoading(true);

      const response = await getPlayers(team);
      const playersData = Array.isArray(response?.data) ? response.data : [];

      const transformedPlayers = playersData.map((player, index) => ({
        ...player,
        id: player?._id || `player-${index}`,
        player_name: index === 0
          ? `${player.player_name} (C)`
          : player.player_name,
      }));

      if (!isMounted()) return;

      setPlayers(transformedPlayers);
    } catch (err) {
      if (!isMounted()) return;

      setToast({
        kind: "error",
        title: "Error",
        subtitle: "Failed to load players",
      });
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    if (selectedSport === "All") {
      // When "All" is selected, fetch players for the selected team
      fetchPlayers(() => mounted, selectedTeam);
    } else {
      // When a specific sport is selected, fetch squads
      const filters = {
        event: selectedSport.toLowerCase(),
        team: selectedTeam,
      };
      fetchSquads(() => mounted, filters);
    }

    return () => {
      mounted = false;
    };
  }, [fetchSquads, fetchPlayers, selectedSport, selectedTeam]);

  // Team names - fixed list without "All"
  const allTeams = ["Titans", "El Dragos", "Gladiators", "Vikings"];

  // Filter squads by search term only (backend handles sport/team filtering)
  const filteredSquads = useMemo(() => {
    if (!searchTerm) return squads;

    return squads.filter((squad) => {
      const team = String(squad?.team ?? "").toLowerCase();
      const subteamId = String(squad?.subteam_id ?? "").toLowerCase();
      const playerNames = String(squad?.player_names ?? "").toLowerCase();

      return (
        team.includes(searchTerm) ||
        subteamId.includes(searchTerm) ||
        playerNames.includes(searchTerm)
      );
    });
  }, [squads, searchTerm]);

  // Filter players by search term
  const filteredPlayers = useMemo(() => {
    if (!searchTerm) return players;

    return players.filter((player) => {
      const playerName = String(player?.player_name ?? "").toLowerCase();
      return playerName.includes(searchTerm);
    });
  }, [players, searchTerm]);

  const handleSearch = useCallback((event) => {
    setSearchTerm(
      String(event?.target?.value ?? "")
        .toLowerCase()
        .trim()
    );
  }, []);

  const handleCreateSuccess = useCallback(async () => {
    setModalOpen(false);
    setToast({
      kind: "success",
      title: "Success",
      subtitle: "Squad created successfully",
    });
    await fetchSquads(() => true, {
      event: selectedSport !== "All" ? selectedSport.toLowerCase() : null,
      team: selectedTeam, // Always pass team since there's no "All" option
    });
  }, [fetchSquads, selectedSport, selectedTeam]);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div style={{ padding: "1rem 2rem" }}>
      {toast && (
        <ToastNotification
          lowContrast
          kind={toast.kind}
          title={toast.title}
          subtitle={toast.subtitle}
          timeout={3000}
          onClose={() => setToast(null)}
          style={{
            position: "fixed",
            top: "3rem",
            right: "1rem",
            zIndex: 9999,
          }}
        />
      )}

      {/* Page Title with Create Button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h1 style={{ margin: 0 }}>Squads</h1>
        {isAdmin && (
          <Button
            renderIcon={Add}
            onClick={() => setModalOpen(true)}
          >
            Create Squad
          </Button>
        )}
      </div>

      {/* Sport Filter Row - Always visible */}
      <div style={{ marginBottom: "1rem" }}>
        <Tabs
          selectedIndex={SPORTS.indexOf(selectedSport)}
          onChange={(evt) => {
            const index = evt.selectedIndex;
            setSelectedSport(SPORTS[index]);
            // Don't reset team filter - keep current selection
          }}
        >
          <TabList contained aria-label="Sport filter tabs">
            {SPORTS.map((sport) => (
              <Tab key={sport}>{sport}</Tab>
            ))}
          </TabList>
          <TabPanels>
            {SPORTS.map((sport) => (
              <TabPanel key={sport}></TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </div>

      {/* Team Filter Row - Always visible */}
      <div style={{ marginBottom: "1rem" }}>
        <Tabs
          selectedIndex={allTeams.indexOf(selectedTeam)}
          onChange={(evt) => {
            const index = evt.selectedIndex;
            setSelectedTeam(allTeams[index]);
          }}
        >
          <TabList contained aria-label="Team filter tabs">
            {allTeams.map((team) => (
              <Tab key={team}>{team}</Tab>
            ))}
          </TabList>
          <TabPanels>
            {allTeams.map((team) => (
              <TabPanel key={team}></TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </div>

      {/* Show empty state or data table */}
      {!loading && ((selectedSport === "All" && players.length === 0) || (selectedSport !== "All" && squads.length === 0)) ? (
        <EmptyState
          title={selectedSport === "All" ? "No Players Yet" : "No Squads Yet"}
          description={selectedSport === "All"
            ? "Players will appear here once they are added to the team"
            : "Squads will appear here once they are created"}
        />
      ) : (
        <>
          {/* Conditional Data Table - Players or Squads */}
          {selectedSport === "All" ? (
            // Player List View
            <DataTable rows={filteredPlayers} headers={playerHeaders} isSortable>
              {({
                rows,
                headers,
                getTableProps,
                getHeaderProps,
                getRowProps,
              }) => (
                <TableContainer title={`Players - ${selectedTeam}`}>
                  <TableToolbar>
                    <TableToolbarContent>
                      <TableToolbarSearch
                        persistent
                        placeholder="Search players..."
                        onChange={handleSearch}
                      />
                    </TableToolbarContent>
                  </TableToolbar>

                  <Table {...getTableProps()}>
                    <TableHead>
                      <TableRow>
                        {headers.map((header) => (
                          <TableHeader
                            key={header.key}
                            {...getHeaderProps({ header })}
                          >
                            {header.header}
                          </TableHeader>
                        ))}
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {rows.length > 0 ? (
                        rows.map((row) => (
                          <TableRow key={row.id} {...getRowProps({ row })}>
                            {row.cells.map((cell) => (
                              <TableCell key={cell.id}>
                                {cell.value ?? "-"}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={headers.length}>
                            No players match your search criteria.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DataTable>
          ) : (
            // Squad Table View
            <DataTable rows={filteredSquads} headers={squadHeaders} isSortable>
              {({
                rows,
                headers,
                getTableProps,
                getHeaderProps,
                getRowProps,
              }) => (
                <TableContainer title={`Squads - ${selectedSport}`}>
                  <TableToolbar>
                    <TableToolbarContent>
                      <TableToolbarSearch
                        persistent
                        placeholder="Search squads..."
                        onChange={handleSearch}
                      />
                    </TableToolbarContent>
                  </TableToolbar>

                  <Table {...getTableProps()}>
                    <TableHead>
                      <TableRow>
                        {headers.map((header) => (
                          <TableHeader
                            key={header.key}
                            {...getHeaderProps({ header })}
                          >
                            {header.header}
                          </TableHeader>
                        ))}
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {rows.length > 0 ? (
                        rows.map((row) => (
                          <TableRow key={row.id} {...getRowProps({ row })}>
                            {row.cells.map((cell) => (
                              <TableCell key={cell.id}>
                                {cell.value ?? "-"}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={headers.length}>
                            No squads match your search criteria.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DataTable>
          )}
        </>
      )}

      <SquadForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default Squad;

// Made with Bob
