import { useState, useEffect } from "react";
import {
  Modal,
  NumberInput,
  Select,
  SelectItem,
  InlineNotification,
  TextInput,
} from "@carbon/react";
import { updateMatch } from "../../services/api";

const MatchUpdateForm = ({ open, onClose, onSuccess, match }) => {
  const [formData, setFormData] = useState({
    team1_score: 0,
    team2_score: 0,
    match_status: "played",
    link: "",
  });

  useEffect(() => {
    if (match) {
      setFormData({
        team1_score: match.team1_score || 0,
        team2_score: match.team2_score || 0,
        match_status: match.match_status || "played",
        link: match.link || "",
      });
    }
  }, [match]);
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
      match_status: e.target.value,
    });
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const payload = {
        ...formData,
        link: formData.link ? formData.link.trim() : null,
      };
      await updateMatch(match._id, payload);
      setFormData({ team1_score: 0, team2_score: 0, match_status: "played", link: "" });
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
      modalHeading={`Update Match Result: ${match.team1}-${match.team1_subid} vs ${match.team2}-${match.team2_subid}`}
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
        id="team1_score"
        label={`${match.team1}-${match.team1_subid} Score`}
        min={0}
        value={formData.team1_score}
        onChange={handleNumberChange("team1_score")}
        style={{ marginBottom: "1rem" }}
      />
      <NumberInput
        id="team2_score"
        label={`${match.team2}-${match.team2_subid} Score`}
        min={0}
        value={formData.team2_score}
        onChange={handleNumberChange("team2_score")}
        style={{ marginBottom: "1rem" }}
      />
      <Select
        id="match_status"
        labelText="Status"
        value={formData.match_status}
        onChange={handleSelectChange}
        style={{ marginBottom: "1rem" }}
      >
        <SelectItem value="played" text="Played" />
      </Select>

      <TextInput
        id="link"
        labelText="Match Link (Optional)"
        placeholder="https://example.com/replay"
        value={formData.link || ""}
        onChange={(e) => setFormData({ ...formData, link: e.target.value })}
      />
    </Modal>
  );
};

export default MatchUpdateForm;

// Made with Bob
