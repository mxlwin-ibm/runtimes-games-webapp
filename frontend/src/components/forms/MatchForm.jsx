import { useState, useEffect } from "react";
import {
  Modal,
  Select,
  SelectItem,
  NumberInput,
  InlineNotification,
  TextInput,
  DatePicker,
  DatePickerInput,
  TimePicker,
  TimePickerSelect,
  SelectItem as TimeSelectItem,
} from "@carbon/react";
import { createMatch, getSubteams } from "../../services/api";

const MatchForm = ({ open, onClose, onSuccess, event = "foosball", mode = "League" }) => {
  const [subteams, setSubteams] = useState([]);
  const [formData, setFormData] = useState({
    pool: "",
    team1: "",
    team1_subid: "",
    team2: "",
    team2_subid: "",
    round: 1,
    event: event.toLowerCase(),
    match_type: mode === "Playoffs" ? "quarter_final" : "league",
    match_date: "",
    match_time: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      fetchSubteams();
      // Update event and match_type in formData when props change
      setFormData(prev => ({
        ...prev,
        event: event.toLowerCase(),
        match_type: mode === "Playoffs" ? "quarter_final" : "league",
        pool: "",
        team1: "",
        team1_subid: "",
        team2: "",
        team2_subid: "",
        match_date: "",
        match_time: "",
      }));
    }
  }, [open, event, mode]);

  const fetchSubteams = async () => {
    try {
      const response = await getSubteams({ event: event.toLowerCase() });
      setSubteams(response.data);
    } catch (err) {
      setError("Failed to load subteams");
    }
  };

  const handleSelectChange = (e) => {
    const { id, value } = e.target;
    
    // If pool is changed, reset subteam selections
    if (id === "pool") {
      setFormData({
        ...formData,
        pool: value,
        team1: "",
        team1_subid: "",
        team2: "",
        team2_subid: "",
      });
    } else if (id === "subteam1") {
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

  const handleDateChange = (dates) => {
    if (dates && dates.length > 0) {
      const date = dates[0];
      // Format date as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      setFormData({
        ...formData,
        match_date: formattedDate,
      });
    }
  };

  const handleTimeChange = (e) => {
    setFormData({
      ...formData,
      match_time: e.target.value,
    });
  };

  const handleSubmit = async () => {
    if (formData.team1 === formData.team2 && formData.team1_subid === formData.team2_subid) {
      setError("Subteams cannot be the same");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const matchData = {
        team1: formData.team1,
        team1_subid: formData.team1_subid,
        team2: formData.team2,
        team2_subid: formData.team2_subid,
        round: formData.round,
        event: formData.event,
        match_type: formData.match_type,
        match_date: formData.match_date,
        match_time: formData.match_time,
      };

      await createMatch(matchData);
      
      setFormData({
        pool: "",
        team1: "",
        team1_subid: "",
        team2: "",
        team2_subid: "",
        round: 1,
        event: event.toLowerCase(),
        match_type: mode === "Playoffs" ? "quarter_final" : "league",
        match_date: "",
        match_time: "",
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to schedule match");
    } finally {
      setLoading(false);
    }
  };

  // For league matches, pool is required. For playoffs, it's not.
  // Date and time are now required for all matches
  const isValid = mode === "League"
    ? formData.pool && formData.team1 && formData.team1_subid && formData.team2 && formData.team2_subid && formData.round > 0 && formData.match_date && formData.match_time
    : formData.team1 && formData.team1_subid && formData.team2 && formData.team2_subid && formData.round > 0 && formData.match_date && formData.match_time;
  
  // Filter subteams based on selected pool (only for league matches)
  const filteredSubteams = mode === "League" && formData.pool
    ? subteams.filter((subteam) => subteam.pool === formData.pool)
    : subteams;
  
  // Filter Subteam 2 to exclude Subteam 1
  const filteredSubteamsFor2 = filteredSubteams.filter(
    (subteam) => !(subteam.team === formData.team1 && subteam.subteam_id.toString() === formData.team1_subid)
  );

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      onRequestSubmit={handleSubmit}
      modalHeading={`Schedule New ${mode} Match`}
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
      
      {mode === "Playoffs" && (
        <Select
          id="match_type"
          labelText="Playoff Stage"
          value={formData.match_type}
          onChange={handleSelectChange}
          style={{ marginBottom: "1rem" }}
        >
          <SelectItem value="quarter_final" text="Quarter Final" />
          <SelectItem value="semi_final" text="Semi Final" />
          <SelectItem value="final" text="Final" />
        </Select>
      )}

      {mode === "League" && (
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
          <SelectItem value="C" text="Pool C" />
          <SelectItem value="D" text="Pool D" />
        </Select>
      )}

      <Select
        id="subteam1"
        labelText="Team 1"
        value={formData.team1 && formData.team1_subid ? `${formData.team1}-${formData.team1_subid}` : ""}
        onChange={handleSelectChange}
        disabled={mode === "League" && !formData.pool}
        style={{ marginBottom: "1rem" }}
      >
        <SelectItem value="" text="Select Team 1" />
        {filteredSubteams.map((subteam) => {
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
        labelText="Team 2"
        value={formData.team2 && formData.team2_subid ? `${formData.team2}-${formData.team2_subid}` : ""}
        onChange={handleSelectChange}
        disabled={(mode === "League" && !formData.pool) || !formData.team1}
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
      {mode === "League" && (
        <NumberInput
          id="round"
          label="Round"
          min={1}
          value={formData.round}
          onChange={handleNumberChange}
          style={{ marginBottom: "1rem" }}
        />
      )}

      <DatePicker
        datePickerType="single"
        onChange={handleDateChange}
        dateFormat="Y-m-d"
        style={{ marginBottom: "1rem" }}
      >
        <DatePickerInput
          id="match_date"
          placeholder="yyyy-mm-dd"
          labelText="Match Date *"
          required
        />
      </DatePicker>

      <TextInput
        id="match_time"
        labelText="Match Time *"
        placeholder="HH:MM (24-hour format)"
        value={formData.match_time}
        onChange={handleTimeChange}
        pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
        invalidText="Please enter time in HH:MM format (e.g., 14:30)"
        required
      />
    </Modal>
  );
};

export default MatchForm;

// Made with Bob
