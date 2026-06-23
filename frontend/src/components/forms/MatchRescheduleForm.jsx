import { useState, useEffect } from "react";
import {
  Modal,
  DatePicker,
  DatePickerInput,
  TimePicker,
  TimePickerSelect,
  SelectItem,
  InlineNotification,
} from "@carbon/react";
import { updateMatch } from "../../services/api";

const MatchRescheduleForm = ({ open, onClose, onSuccess, match }) => {
  const [formData, setFormData] = useState({
    match_date: "",
    match_time: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize form with existing match date/time when match changes
  useEffect(() => {
    if (match) {
      setFormData({
        match_date: match.match_date || "",
        match_time: match.match_time || "",
      });
    }
  }, [match]);

  const handleDateChange = (dates) => {
    if (dates && dates.length > 0) {
      const date = dates[0];
      // Format date as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
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
    setError(null);

    // Validate that at least one field is provided
    if (!formData.match_date && !formData.match_time) {
      setError("Please provide at least a date or time");
      return;
    }

    setLoading(true);

    try {
      // Send update with current scores and status, plus new date/time
      const updateData = {
        team1_score: match.team1_score || 0,
        team2_score: match.team2_score || 0,
        match_status: match.match_status || "scheduled",
        match_date: formData.match_date || match.match_date,
        match_time: formData.match_time || match.match_time,
      };

      await updateMatch(match._id, updateData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to reschedule match");
    } finally {
      setLoading(false);
    }
  };

  if (!match) return null;

  // Parse existing date for DatePicker
  const getInitialDate = () => {
    if (match.match_date) {
      const [year, month, day] = match.match_date.split("-");
      return new Date(year, month - 1, day);
    }
    return new Date();
  };

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      onRequestSubmit={handleSubmit}
      modalHeading={`Reschedule Match: ${match.team1}-${match.team1_subid} vs ${match.team2}-${match.team2_subid}`}
      primaryButtonText="Reschedule"
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

      <DatePicker
        datePickerType="single"
        dateFormat="Y-m-d"
        onChange={handleDateChange}
        value={getInitialDate()}
      >
        <DatePickerInput
          id="match_date"
          labelText="Match Date"
          placeholder="YYYY-MM-DD"
          size="md"
        />
      </DatePicker>

      <div style={{ marginTop: "1rem" }}>
        <TimePicker
          id="match_time"
          labelText="Match Time (24-hour format)"
          value={formData.match_time}
          onChange={handleTimeChange}
          placeholder="HH:MM"
        >
          <TimePickerSelect id="time-picker-select-1" labelText="Timezone">
            <SelectItem value="AM" text="AM" />
            <SelectItem value="PM" text="PM" />
          </TimePickerSelect>
        </TimePicker>
      </div>

      <div style={{ marginTop: "1rem", fontSize: "0.875rem", color: "#525252" }}>
        <p><strong>Current Date:</strong> {match.match_date || "Not set"}</p>
        <p><strong>Current Time:</strong> {match.match_time || "Not set"}</p>
      </div>
    </Modal>
  );
};

export default MatchRescheduleForm;

// Made with Bob