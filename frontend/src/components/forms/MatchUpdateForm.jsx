import { useState } from "react";
import {
  Modal,
  NumberInput,
  Select,
  SelectItem,
  InlineNotification,
} from "@carbon/react";
import { updateMatch } from "../../services/api";

const MatchUpdateForm = ({ open, onClose, onSuccess, match }) => {
  const [formData, setFormData] = useState({
    score_a: 0,
    score_b: 0,
    status: "played",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleNumberChange = (field) => (e, { value }) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleSelectChange = (e) => {
    setFormData({
      ...formData,
      status: e.target.value,
    });
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      await updateMatch(match.match_id, formData);
      setFormData({ score_a: 0, score_b: 0, status: "played" });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update match");
    } finally {
      setLoading(false);
    }
  };

  if (!match) return null;

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      onRequestSubmit={handleSubmit}
      modalHeading={`Update Match Result: ${match.team_a_id} vs ${match.team_b_id}`}
      primaryButtonText="Update Result"
      secondaryButtonText="Cancel"
      primaryButtonDisabled={loading}
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
      <NumberInput
        id="score_a"
        label={`${match.team_a_id} Score`}
        min={0}
        value={formData.score_a}
        onChange={handleNumberChange("score_a")}
        style={{ marginBottom: "1rem" }}
      />
      <NumberInput
        id="score_b"
        label={`${match.team_b_id} Score`}
        min={0}
        value={formData.score_b}
        onChange={handleNumberChange("score_b")}
        style={{ marginBottom: "1rem" }}
      />
      <Select
        id="status"
        labelText="Status"
        value={formData.status}
        onChange={handleSelectChange}
      >
        <SelectItem value="played" text="Played" />
      </Select>
    </Modal>
  );
};

export default MatchUpdateForm;

// Made with Bob
