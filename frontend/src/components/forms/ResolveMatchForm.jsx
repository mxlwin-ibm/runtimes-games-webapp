import { useState, useEffect } from "react";
import {
  Modal,
  Select,
  SelectItem,
  InlineNotification,
} from "@carbon/react";
import { resolveMatch, getSubteams } from "../../services/api";

const ResolveMatchForm = ({ open, onClose, onSuccess, match }) => {
  const [subteams, setSubteams] = useState([]);
  const [formData, setFormData] = useState({
    team1: "",
    team1_subid: "",
    team2: "",
    team2_subid: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && match) {
      fetchSubteams();
      // Reset form
      setFormData({
        team1: "",
        team1_subid: "",
        team2: "",
        team2_subid: "",
      });
    }
  }, [open, match]);

  const fetchSubteams = async () => {
    try {
      const response = await getSubteams({ event: match.event });
      setSubteams(response.data);
    } catch (err) {
      setError("Failed to load subteams");
    }
  };

  const handleSelectChange = (e) => {
    const { id, value } = e.target;
    
    if (id === "subteam1") {
      // Parse team-subid format
      const [team, subid] = value.split("-");
      setFormData({
        ...formData,
        team1: team,
        team1_subid: subid,
        team2: "",
        team2_subid: "",
      });
    } else if (id === "subteam2") {
      // Parse team-subid format
      const [team, subid] = value.split("-");
      setFormData({
        ...formData,
        team2: team,
        team2_subid: subid,
      });
    }
  };

  const handleSubmit = async () => {
    if (formData.team1 === formData.team2 && formData.team1_subid === formData.team2_subid) {
      setError("Subteams cannot be the same");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await resolveMatch(
        match._id,
        formData.team1,
        formData.team1_subid,
        formData.team2,
        formData.team2_subid
      );
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to resolve match");
    } finally {
      setLoading(false);
    }
  };

  if (!match) return null;

  const isValid = formData.team1 && formData.team1_subid && formData.team2 && formData.team2_subid;
  
  // Filter Subteam 2 to exclude Subteam 1
  const filteredSubteamsFor2 = subteams.filter(
    (subteam) => !(subteam.team === formData.team1 && subteam.subteam_id.toString() === formData.team1_subid)
  );

  // Helper to display placeholder in readable format
  const formatPoolPosition = (team, subid) => {
    if (subid === "0") {
      // Map internal values to friendly labels
      const placeholderMap = {
        // Pool positions
        "POOL_A_1ST": "Pool A Winner",
        "POOL_A_2ND": "Pool A Runner-up",
        "POOL_B_1ST": "Pool B Winner",
        "POOL_B_2ND": "Pool B Runner-up",
        "POOL_C_1ST": "Pool C Winner",
        "POOL_C_2ND": "Pool C Runner-up",
        "POOL_D_1ST": "Pool D Winner",
        "POOL_D_2ND": "Pool D Runner-up",
        // Quarter Final winners
        "QF1_WINNER": "QF1 Winner",
        "QF2_WINNER": "QF2 Winner",
        "QF3_WINNER": "QF3 Winner",
        "QF4_WINNER": "QF4 Winner",
        // Semi Final winners
        "SF1_WINNER": "SF1 Winner",
        "SF2_WINNER": "SF2 Winner",
      };
      return placeholderMap[team] || team;
    }
    return `${team}-${subid}`;
  };

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      onRequestSubmit={handleSubmit}
      modalHeading="Resolve Playoff Match"
      primaryButtonText="Resolve Match"
      secondaryButtonText="Cancel"
      primaryButtonDisabled={!isValid || loading}
      preventCloseOnClickOutside
    >
      {error && (
        <InlineNotification
          kind="error"
          title="Error"
          subtitle={error}
          onClose={() => setError(null)}
          style={{ marginBottom: "1rem" }}
        />
      )}

      <div style={{ marginBottom: "1rem", padding: "1rem", backgroundColor: "#f4f4f4", borderRadius: "4px" }}>
        <p style={{ margin: 0, fontSize: "14px", color: "#525252" }}>
          <strong>Current Match:</strong> {formatPoolPosition(match.team1, match.team1_subid)} vs {formatPoolPosition(match.team2, match.team2_subid)}
        </p>
        <p style={{ margin: "0.5rem 0 0 0", fontSize: "12px", color: "#525252" }}>
          Select the actual qualified teams to replace the pool position placeholders.
        </p>
      </div>

      <Select
        id="subteam1"
        labelText="Team 1 (Actual Team)"
        value={formData.team1 && formData.team1_subid ? `${formData.team1}-${formData.team1_subid}` : ""}
        onChange={handleSelectChange}
        style={{ marginBottom: "1rem" }}
      >
        <SelectItem value="" text="Select Team 1" />
        {subteams.map((subteam) => {
          const value = `${subteam.team}-${subteam.subteam_id}`;
          const playerNames = Array.isArray(subteam.player_names)
            ? subteam.player_names.join(", ")
            : "No players";
          const label = `${subteam.team}-${subteam.subteam_id} (${playerNames})`;
          return (
            <SelectItem key={value} value={value} text={label} />
          );
        })}
      </Select>

      <Select
        id="subteam2"
        labelText="Team 2 (Actual Team)"
        value={formData.team2 && formData.team2_subid ? `${formData.team2}-${formData.team2_subid}` : ""}
        onChange={handleSelectChange}
        disabled={!formData.team1}
        style={{ marginBottom: "1rem" }}
      >
        <SelectItem value="" text="Select Team 2" />
        {filteredSubteamsFor2.map((subteam) => {
          const value = `${subteam.team}-${subteam.subteam_id}`;
          const playerNames = Array.isArray(subteam.player_names)
            ? subteam.player_names.join(", ")
            : "No players";
          const label = `${subteam.team}-${subteam.subteam_id} (${playerNames})`;
          return (
            <SelectItem key={value} value={value} text={label} />
          );
        })}
      </Select>
    </Modal>
  );
};

export default ResolveMatchForm;

// Made with Bob