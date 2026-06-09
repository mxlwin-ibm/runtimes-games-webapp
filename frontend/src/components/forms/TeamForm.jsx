import { useState } from "react";
import {
  Modal,
  TextInput,
  Select,
  SelectItem,
  InlineNotification,
} from "@carbon/react";
import { createTeam } from "../../services/api";

const TeamForm = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    team_id: "",
    team_name: "",
    club: "",
    pool: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      await createTeam(formData);
      setFormData({ team_id: "", team_name: "", club: "", pool: "" });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create team");
    } finally {
      setLoading(false);
    }
  };

  const isValid = formData.team_id && formData.team_name && formData.club && formData.pool;

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      onRequestSubmit={handleSubmit}
      modalHeading="Add New Team"
      primaryButtonText="Create Team"
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
      <TextInput
        id="team_id"
        labelText="Team ID"
        placeholder="e.g., TEAM001"
        value={formData.team_id}
        onChange={handleChange}
        required
        style={{ marginBottom: "1rem" }}
      />
      <TextInput
        id="team_name"
        labelText="Team Name"
        placeholder="e.g., Thunder Strikers"
        value={formData.team_name}
        onChange={handleChange}
        required
        style={{ marginBottom: "1rem" }}
      />
      <TextInput
        id="club"
        labelText="Club"
        placeholder="e.g., Downtown Sports Club"
        value={formData.club}
        onChange={handleChange}
        required
        style={{ marginBottom: "1rem" }}
      />
      <Select
        id="pool"
        labelText="Pool"
        value={formData.pool}
        onChange={handleChange}
        required
      >
        <SelectItem value="" text="Select a pool" />
        <SelectItem value="A" text="Pool A" />
        <SelectItem value="B" text="Pool B" />
      </Select>
    </Modal>
  );
};

export default TeamForm;

// Made with Bob
