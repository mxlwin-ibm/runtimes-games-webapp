import { useState, useEffect } from "react";
import {
  Modal,
  Select,
  SelectItem,
  NumberInput,
  InlineNotification,
} from "@carbon/react";
import { createMatch, getTeams } from "../../services/api";

const MatchForm = ({ open, onClose, onSuccess }) => {
  const [teams, setTeams] = useState([]);
  const [formData, setFormData] = useState({
    pool: "",
    team_a_id: "",
    team_b_id: "",
    round: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      fetchTeams();
    }
  }, [open]);

  const fetchTeams = async () => {
    try {
      const response = await getTeams();
      setTeams(response.data);
    } catch (err) {
      setError("Failed to load teams");
    }
  };

  const handleSelectChange = (e) => {
    const { id, value } = e.target;
    
    // If pool is changed, reset team selections
    if (id === "pool") {
      setFormData({
        ...formData,
        pool: value,
        team_a_id: "",
        team_b_id: "",
      });
    } else {
      setFormData({
        ...formData,
        [id]: value,
      });
    }
  };

  const handleNumberChange = (e, { value }) => {
    setFormData({
      ...formData,
      round: value,
    });
  };

  const handleSubmit = async () => {
    if (formData.team_a_id === formData.team_b_id) {
      setError("Teams cannot be the same");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await createMatch({
        team_a_id: formData.team_a_id,
        team_b_id: formData.team_b_id,
        round: formData.round,
      });
      setFormData({ pool: "", team_a_id: "", team_b_id: "", round: 1 });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to schedule match");
    } finally {
      setLoading(false);
    }
  };

  const isValid = formData.pool && formData.team_a_id && formData.team_b_id && formData.round > 0;
  
  // Filter teams based on selected pool
  const filteredTeams = formData.pool
    ? teams.filter((team) => team.pool === formData.pool)
    : [];
  
  // Filter Team B to exclude Team A
  const filteredTeamsForB = filteredTeams.filter(
    (team) => team.team_id !== formData.team_a_id
  );

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      onRequestSubmit={handleSubmit}
      modalHeading="Schedule New Match"
      primaryButtonText="Schedule Match"
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
      <Select
        id="pool"
        labelText="Pool"
        value={formData.pool}
        onChange={handleSelectChange}
        style={{ marginBottom: "1rem" }}
      >
        <SelectItem value="" text="Select Pool" />
        <SelectItem value="A" text="Pool A" />
        <SelectItem value="B" text="Pool B" />
      </Select>
      <Select
        id="team_a_id"
        labelText="Team A"
        value={formData.team_a_id}
        onChange={handleSelectChange}
        disabled={!formData.pool}
        style={{ marginBottom: "1rem" }}
      >
        <SelectItem value="" text="Select Team A" />
        {filteredTeams.map((team) => (
          <SelectItem key={team.team_id} value={team.team_id} text={team.team_name} />
        ))}
      </Select>
      <Select
        id="team_b_id"
        labelText="Team B"
        value={formData.team_b_id}
        onChange={handleSelectChange}
        disabled={!formData.pool || !formData.team_a_id}
        style={{ marginBottom: "1rem" }}
      >
        <SelectItem value="" text="Select Team B" />
        {filteredTeamsForB.map((team) => (
          <SelectItem key={team.team_id} value={team.team_id} text={team.team_name} />
        ))}
      </Select>
      <NumberInput
        id="round"
        label="Round"
        min={1}
        value={formData.round}
        onChange={handleNumberChange}
      />
    </Modal>
  );
};

export default MatchForm;

// Made with Bob
