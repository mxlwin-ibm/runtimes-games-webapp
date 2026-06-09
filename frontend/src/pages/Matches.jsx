import { useState, useEffect } from "react";
import {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Button,
  Tile,
  Grid,
  Column,
  ToastNotification,
} from "@carbon/react";
import { Add, Edit } from "@carbon/icons-react";
import { getMatches } from "../services/api";
import MatchForm from "../components/forms/MatchForm";
import MatchUpdateForm from "../components/forms/MatchUpdateForm";
import LoadingState from "../components/common/LoadingState";
import EmptyState from "../components/common/EmptyState";

const Matches = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const response = await getMatches();
      setMatches(response.data);
    } catch (err) {
      setToast({
        kind: "error",
        title: "Error",
        subtitle: "Failed to load matches",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClick = (match) => {
    setSelectedMatch(match);
    setUpdateModalOpen(true);
  };

  const scheduledMatches = matches.filter((m) => m.status === "scheduled");
  const playedMatches = matches.filter((m) => m.status === "played");

  const formatTeamDisplay = (teamId, teamName) =>
    teamName ? `${teamId} (${teamName})` : teamId;

  const MatchTile = ({ match, showUpdateButton }) => (
    <Tile style={{ marginBottom: "1rem", padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h4 style={{ marginBottom: "0.5rem" }}>
            {formatTeamDisplay(match.team_a_id, match.team_a)} vs{" "}
            {formatTeamDisplay(match.team_b_id, match.team_b)}
          </h4>
          <p style={{ color: "#525252", marginBottom: "0.25rem" }}>
            Round: {match.round}
          </p>
          <p style={{ color: "#525252", marginBottom: "0.25rem" }}>
            Match ID: {match.match_id}
          </p>
          {match.status === "played" && (
            <p style={{ fontWeight: "bold", marginTop: "0.5rem" }}>
              Score: {match.score_a} - {match.score_b}
            </p>
          )}
        </div>
        {showUpdateButton && (
          <Button
            kind="tertiary"
            renderIcon={Edit}
            onClick={() => handleUpdateClick(match)}
          >
            Update Result
          </Button>
        )}
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
        <Button
          renderIcon={Add}
          onClick={() => setScheduleModalOpen(true)}
        >
          Schedule Match
        </Button>
      </div>
      <Tabs>
        <TabList aria-label="Match tabs">
          <Tab>Scheduled ({scheduledMatches.length})</Tab>
          <Tab>Played ({playedMatches.length})</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            {scheduledMatches.length === 0 ? (
              <EmptyState
                title="No scheduled matches"
                description="Schedule a new match to get started"
              />
            ) : (
              <Grid>
                <Column lg={16}>
                  {scheduledMatches.map((match) => (
                    <MatchTile
                      key={match.match_id}
                      match={match}
                      showUpdateButton={true}
                    />
                  ))}
                </Column>
              </Grid>
            )}
          </TabPanel>
          <TabPanel>
            {playedMatches.length === 0 ? (
              <EmptyState
                title="No played matches"
                description="Update match results to see them here"
              />
            ) : (
              <Grid>
                <Column lg={16}>
                  {playedMatches.map((match) => (
                    <MatchTile
                      key={match.match_id}
                      match={match}
                      showUpdateButton={false}
                    />
                  ))}
                </Column>
              </Grid>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
      <MatchForm
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        onSuccess={() => {
          setToast({
            kind: "success",
            title: "Success",
            subtitle: "Match scheduled successfully",
          });
          fetchMatches();
        }}
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
          fetchMatches();
        }}
        match={selectedMatch}
      />
    </div>
  );
};

export default Matches;

// Made with Bob
