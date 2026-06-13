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
  Button,
  ToastNotification,
} from "@carbon/react";
import { Add } from "@carbon/icons-react";

import { getTeams } from "../services/api";
import TeamForm from "../components/forms/TeamForm";
import LoadingState from "../components/common/LoadingState";
import EmptyState from "../components/common/EmptyState";

const headers = [
  { key: "team_id", header: "Team ID" },
  { key: "team_name", header: "Team Name" },
  { key: "club", header: "Club" },
  { key: "pool", header: "Pool" },
];

const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchTeams = useCallback(async (isMounted = () => true) => {
    try {
      setLoading(true);

      const response = await getTeams();

      const teamsData = Array.isArray(response?.data)
        ? response.data
        : [];

      const transformedTeams = teamsData.map((team, index) => ({
        ...team,
        id:
          team?._id ||
          team?.team_id ||
          `team-${index}`,
      }));

      const uniqueTeams = [
        ...new Map(
          transformedTeams.map((team) => [
            team?._id ||
              team?.team_id ||
              team?.id,
            team,
          ])
        ).values(),
      ].sort((a, b) =>
        String(a?.club ?? "").localeCompare(
          String(b?.club ?? "")
        )
      );

      if (!isMounted()) return;

      setTeams(uniqueTeams);
    } catch (err) {
      if (!isMounted()) return;

      setToast({
        kind: "error",
        title: "Error",
        subtitle: "Failed to load teams",
      });
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    fetchTeams(() => mounted);

    return () => {
      mounted = false;
    };
  }, [fetchTeams]);

  const filteredTeams = useMemo(() => {
    if (!searchTerm) return teams;

    return teams.filter((team) => {
      const teamId = String(
        team?.team_id ?? ""
      ).toLowerCase();

      const teamName = String(
        team?.team_name ?? ""
      ).toLowerCase();

      const club = String(
        team?.club ?? ""
      ).toLowerCase();

      return (
        teamId.includes(searchTerm) ||
        teamName.includes(searchTerm) ||
        club.includes(searchTerm)
      );
    });
  }, [teams, searchTerm]);

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
      subtitle: "Team created successfully",
    });

    await fetchTeams();
  }, [fetchTeams]);

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

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h1 style={{ margin: 0 }}>Teams</h1>

        <Button
          renderIcon={Add}
          onClick={() => setModalOpen(true)}
        >
          Add Team
        </Button>
      </div>

      {teams.length === 0 ? (
        <EmptyState
          title="No teams yet"
          description="Get started by adding your first team"
        />
      ) : (
        <DataTable
          rows={filteredTeams}
          headers={headers}
          isSortable
        >
          {({
            rows,
            headers,
            getTableProps,
            getHeaderProps,
            getRowProps,
          }) => (
            <TableContainer title="Teams">
              <TableToolbar>
                <TableToolbarContent>
                  <TableToolbarSearch
                    persistent
                    placeholder="Search teams..."
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
                      <TableRow
                        key={row.id}
                        {...getRowProps({ row })}
                      >
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
                        No teams match your search criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      )}

      <TeamForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default Teams;