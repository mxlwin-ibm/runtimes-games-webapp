import { useState, useEffect } from "react";
import { Grid, Column, Tile } from "@carbon/react";
import { getTeams, getMatches } from "../services/api";
import LoadingState from "../components/common/LoadingState";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalTeams: 0,
    totalMatches: 0,
    completedMatches: 0,
    upcomingMatches: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [teamsRes, matchesRes] = await Promise.all([
        getTeams(),
        getMatches(),
      ]);

      const teams = teamsRes.data;
      const matches = matchesRes.data;

      const completed = matches.filter((m) => m.status === "played").length;
      const upcoming = matches.filter((m) => m.status === "scheduled").length;

      setStats({
        totalTeams: teams.length,
        totalMatches: matches.length,
        completedMatches: completed,
        upcomingMatches: upcoming,
      });
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState type="placeholder" />;
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ marginBottom: "2rem" }}>Dashboard</h1>
      <Grid>
        <Column lg={4} md={4} sm={4}>
          <Tile style={{ padding: "2rem", textAlign: "center" }}>
            <h2 style={{ fontSize: "3rem", margin: "0" }}>{stats.totalTeams}</h2>
            <p style={{ fontSize: "1.2rem", color: "#525252", margin: "0.5rem 0 0 0" }}>
              Total Teams
            </p>
          </Tile>
        </Column>
        <Column lg={4} md={4} sm={4}>
          <Tile style={{ padding: "2rem", textAlign: "center" }}>
            <h2 style={{ fontSize: "3rem", margin: "0" }}>{stats.totalMatches}</h2>
            <p style={{ fontSize: "1.2rem", color: "#525252", margin: "0.5rem 0 0 0" }}>
              Total Matches
            </p>
          </Tile>
        </Column>
        <Column lg={4} md={4} sm={4}>
          <Tile style={{ padding: "2rem", textAlign: "center" }}>
            <h2 style={{ fontSize: "3rem", margin: "0" }}>{stats.completedMatches}</h2>
            <p style={{ fontSize: "1.2rem", color: "#525252", margin: "0.5rem 0 0 0" }}>
              Completed Matches
            </p>
          </Tile>
        </Column>
        <Column lg={4} md={4} sm={4}>
          <Tile style={{ padding: "2rem", textAlign: "center" }}>
            <h2 style={{ fontSize: "3rem", margin: "0" }}>{stats.upcomingMatches}</h2>
            <p style={{ fontSize: "1.2rem", color: "#525252", margin: "0.5rem 0 0 0" }}>
              Upcoming Matches
            </p>
          </Tile>
        </Column>
      </Grid>
    </div>
  );
};

export default Dashboard;

// Made with Bob
