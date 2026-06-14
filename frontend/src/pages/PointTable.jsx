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
  Button,
  ToastNotification,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Select,
  SelectItem,
} from "@carbon/react";
import { Renew } from "@carbon/icons-react";

import { getPointsTable } from "../services/api";
import LoadingState from "../components/common/LoadingState";
import EmptyState from "../components/common/EmptyState";

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

const headers = [
  { key: "rank", header: "Rank" },
  { key: "team_id", header: "Players" },
  { key: "team_name", header: "Team Name" },
  { key: "played", header: "Played" },
  { key: "won", header: "Won" },
  { key: "lost", header: "Lost" },
  { key: "gf", header: "GF" },
  { key: "ga", header: "GA" },
  { key: "gd", header: "GD" },
  { key: "points", header: "Points" },
];

const PoolTable = ({ title, standings }) => {
  const standingsMap = useMemo(
    () => new Map(standings.map((team) => [team.id, team])),
    [standings]
  );

  if (standings.length === 0) {
    return (
      <div style={{ marginBottom: "3rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>{title}</h2>
        <EmptyState
          title={`No teams in ${title}`}
          description={`${title} standings will appear once teams are added`}
        />
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "3rem" }}>
      <h2 style={{ marginBottom: "1rem" }}>{title}</h2>

      <DataTable rows={standings} headers={headers} isSortable>
        {({
          rows,
          headers,
          getTableProps,
          getHeaderProps,
          getRowProps,
        }) => (
          <TableContainer>
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
                {rows.map((row) => {
                  const rank = standingsMap.get(row.id)?.rank;

                  const rowStyle =
                    rank === 1 || rank === 2
                      ? {
                          backgroundColor: "#d9f2e6",
                          fontWeight: "bold",
                        }
                      : {};

                  return (
                    <TableRow
                      key={row.id}
                      {...getRowProps({ row })}
                      style={rowStyle}
                    >
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}>
                          {cell.value ?? "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
    </div>
  );
};

const PointTable = () => {
  const [allStandings, setAllStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState("Foosball");
  const [selectedPool, setSelectedPool] = useState("All Pools");

  const fetchPointsTable = useCallback(
    async (isMounted = () => true, showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const response = await getPointsTable({ event: selectedEvent.toLowerCase() });

        const data = Array.isArray(response?.data)
          ? response.data
          : [];

        if (!isMounted()) return;

        setAllStandings(data);
      } catch (err) {
        if (!isMounted()) return;

        setToast({
          kind: "error",
          title: "Error",
          subtitle: "Failed to load points table",
        });
      } finally {
        if (!isMounted()) return;

        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedEvent]
  );

  // Filter and group standings by pool
  const { poolAStandings, poolBStandings, poolCStandings, poolDStandings } = useMemo(() => {
    const sortAndRankTeams = (teams, poolPrefix) => {
      return [...teams]
        .sort((a, b) => {
          const pointsDiff = (b?.points || 0) - (a?.points || 0);
          if (pointsDiff !== 0) {
            return pointsDiff;
          }
          return (b?.gd || 0) - (a?.gd || 0);
        })
        .map((team, index) => ({
          ...team,
          rank: index + 1,
          id: team?.team_id || team?._id || `${poolPrefix}-${index}`,
        }));
    };

    const poolATeams = allStandings.filter(
      (team) => String(team?.pool ?? "").toUpperCase() === "A"
    );
    const poolBTeams = allStandings.filter(
      (team) => String(team?.pool ?? "").toUpperCase() === "B"
    );
    const poolCTeams = allStandings.filter(
      (team) => String(team?.pool ?? "").toUpperCase() === "C"
    );
    const poolDTeams = allStandings.filter(
      (team) => String(team?.pool ?? "").toUpperCase() === "D"
    );

    return {
      poolAStandings: sortAndRankTeams(poolATeams, "poolA"),
      poolBStandings: sortAndRankTeams(poolBTeams, "poolB"),
      poolCStandings: sortAndRankTeams(poolCTeams, "poolC"),
      poolDStandings: sortAndRankTeams(poolDTeams, "poolD"),
    };
  }, [allStandings]);

  // Filter pools based on selected pool
  const displayPools = useMemo(() => {
    if (selectedPool === "All Pools") {
      return [
        { title: "Pool A", standings: poolAStandings },
        { title: "Pool B", standings: poolBStandings },
        { title: "Pool C", standings: poolCStandings },
        { title: "Pool D", standings: poolDStandings },
      ].filter(pool => pool.standings.length > 0);
    }

    const poolLetter = selectedPool.split(" ")[1]; // Extract "A", "B", etc.
    const poolMap = {
      A: { title: "Pool A", standings: poolAStandings },
      B: { title: "Pool B", standings: poolBStandings },
      C: { title: "Pool C", standings: poolCStandings },
      D: { title: "Pool D", standings: poolDStandings },
    };

    return poolMap[poolLetter] ? [poolMap[poolLetter]] : [];
  }, [selectedPool, poolAStandings, poolBStandings, poolCStandings, poolDStandings]);

  useEffect(() => {
    let mounted = true;

    fetchPointsTable(() => mounted);

    return () => {
      mounted = false;
    };
  }, [fetchPointsTable]);

  const handleRefresh = async () => {
    await fetchPointsTable(() => true, false);

    setToast({
      kind: "success",
      title: "Updated",
      subtitle: "Points table refreshed",
    });
  };

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
          style={{
            position: "fixed",
            top: "3rem",
            right: "1rem",
            zIndex: 9999,
          }}
        />
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h1 style={{ margin: 0 }}>Point Table</h1>

        <Button
          kind="ghost"
          renderIcon={Renew}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
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

      {/* Pool Filter */}
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

      {displayPools.length === 0 ? (
        <EmptyState
          title="No standings yet"
          description="Points table will appear once matches are played"
        />
      ) : (
        <>
          {displayPools.map((pool) => (
            <PoolTable
              key={pool.title}
              title={pool.title}
              standings={pool.standings}
            />
          ))}
        </>
      )}
    </div>
  );
};

export default PointTable;