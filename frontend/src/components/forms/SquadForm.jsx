import { useState, useEffect } from "react";
import {
  Modal,
  Select,
  SelectItem,
  NumberInput,
  Button,
  InlineNotification,
  IconButton,
} from "@carbon/react";
import { Add, TrashCan } from "@carbon/icons-react";
import { createSubteam, getPlayers } from "../../services/api";

const EVENTS = [
  "Foosball",
  "Cricket",
  "Badminton",
  "Snooker",
  "Chess",
  "Carroms",
  "Table Tennis",
  "Football",
];

const TEAMS = ["Titans", "El Dragos", "Gladiators", "Vikings"];

const POOLS = ["A", "B", "C", "D"];

const SquadForm = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    event: "",
    team: "",
    subteam_id: 1,
    pool: "",
    player_ids: [],
  });
  const [selectedPlayers, setSelectedPlayers] = useState(['']); // Array of player IDs
  const [players, setPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch players when team is selected
  useEffect(() => {
    const fetchPlayers = async () => {
      if (!formData.team) {
        setPlayers([]);
        return;
      }

      setLoadingPlayers(true);
      try {
        const response = await getPlayers(formData.team);
        const playersData = Array.isArray(response?.data) ? response.data : [];
        setPlayers(playersData);
      } catch (err) {
        setError("Failed to load players for selected team");
        setPlayers([]);
      } finally {
        setLoadingPlayers(false);
      }
    };

    fetchPlayers();
  }, [formData.team]);

  // Sync selectedPlayers with formData.player_ids
  useEffect(() => {
    const validPlayerIds = selectedPlayers.filter(id => id !== '');
    setFormData(prev => ({
      ...prev,
      player_ids: validPlayerIds
    }));
  }, [selectedPlayers]);

  // Add player field
  const addPlayerField = () => {
    if (selectedPlayers.length < 10) {
      setSelectedPlayers([...selectedPlayers, '']);
    }
  };

  // Remove player field
  const removePlayerField = (index) => {
    if (selectedPlayers.length > 1) {
      setSelectedPlayers(selectedPlayers.filter((_, i) => i !== index));
    }
  };

  // Update player selection
  const updatePlayer = (index, playerId) => {
    const updated = [...selectedPlayers];
    updated[index] = playerId;
    setSelectedPlayers(updated);
  };

  // Get available players for a dropdown (excluding already selected)
  const getAvailablePlayers = (currentIndex) => {
    return players.filter(player => {
      const playerId = player._id || player.id;
      return !selectedPlayers.includes(playerId) || selectedPlayers[currentIndex] === playerId;
    });
  };

  const handleSelectChange = (e) => {
    const { id, value } = e.target;
    setFormData({
      ...formData,
      [id]: value,
    });

    // Reset player selection when team changes
    if (id === "team") {
      setSelectedPlayers(['']);
      setFormData((prev) => ({
        ...prev,
        team: value,
        player_ids: [],
      }));
    }
  };

  const handleNumberChange = (e, { value }) => {
    setFormData({
      ...formData,
      subteam_id: value,
    });
  };

  const handleSubmit = async () => {
    setError(null);

    // Validate player count
    if (formData.player_ids.length === 0) {
      setError("Please select at least 1 player");
      return;
    }

    if (formData.player_ids.length > 10) {
      setError("Maximum 10 players allowed per squad");
      return;
    }

    setLoading(true);

    try {
      await createSubteam({
        ...formData,
        event: formData.event.toLowerCase()
      });
      setFormData({
        event: "",
        team: "",
        subteam_id: 1,
        pool: "",
        player_ids: [],
      });
      setSelectedPlayers(['']);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create squad");
    } finally {
      setLoading(false);
    }
  };

  const isValid =
    formData.event &&
    formData.team &&
    formData.subteam_id >= 1 &&
    formData.pool &&
    formData.player_ids.length > 0 &&
    formData.player_ids.length <= 10;

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      onRequestSubmit={handleSubmit}
      modalHeading="Create New Squad"
      primaryButtonText="Create Squad"
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
        id="event"
        labelText="Event"
        value={formData.event}
        onChange={handleSelectChange}
        required
        style={{ marginBottom: "1rem" }}
      >
        <SelectItem value="" text="Select an event" />
        {EVENTS.map((event) => (
          <SelectItem key={event} value={event} text={event} />
        ))}
      </Select>

      <Select
        id="team"
        labelText="Team"
        value={formData.team}
        onChange={handleSelectChange}
        required
        style={{ marginBottom: "1rem" }}
      >
        <SelectItem value="" text="Select a team" />
        {TEAMS.map((team) => (
          <SelectItem key={team} value={team} text={team} />
        ))}
      </Select>

      <NumberInput
        id="subteam_id"
        label="Squad ID"
        value={formData.subteam_id}
        onChange={handleNumberChange}
        min={1}
        step={1}
        required
        style={{ marginBottom: "1rem" }}
      />

      <Select
        id="pool"
        labelText="Pool"
        value={formData.pool}
        onChange={handleSelectChange}
        required
        style={{ marginBottom: "1rem" }}
      >
        <SelectItem value="" text="Select a pool" />
        {POOLS.map((pool) => (
          <SelectItem key={pool} value={pool} text={`Pool ${pool}`} />
        ))}
      </Select>

      <div style={{ marginBottom: "1rem" }}>
        <label
          style={{
            display: "block",
            marginBottom: "0.5rem",
            fontSize: "0.75rem",
            fontWeight: 400,
            color: "#525252",
          }}
        >
          Players (1-10 required)
        </label>

        {selectedPlayers.map((playerId, index) => {
          const availablePlayers = getAvailablePlayers(index);
          
          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              <div style={{ flex: 1 }}>
                <Select
                  id={`player-${index}`}
                  labelText=""
                  value={playerId}
                  onChange={(e) => updatePlayer(index, e.target.value)}
                  disabled={!formData.team || loadingPlayers}
                >
                  <SelectItem value="" text="Select a player" />
                  {availablePlayers.map((player) => {
                    const id = player._id || player.id;
                    const name = player.player_name || player.name || "Unknown Player";
                    return (
                      <SelectItem key={id} value={id} text={name} />
                    );
                  })}
                </Select>
              </div>

              {selectedPlayers.length > 1 && (
                <IconButton
                  kind="ghost"
                  label="Remove player"
                  onClick={() => removePlayerField(index)}
                  disabled={loadingPlayers}
                  style={{ marginBottom: "0.125rem" }}
                >
                  <TrashCan />
                </IconButton>
              )}
            </div>
          );
        })}

        {selectedPlayers.length < 10 && (
          <Button
            kind="tertiary"
            size="sm"
            renderIcon={Add}
            onClick={addPlayerField}
            disabled={!formData.team || loadingPlayers}
            style={{ marginTop: "0.5rem" }}
          >
            Add Player
          </Button>
        )}

        {formData.team && players.length === 0 && !loadingPlayers && (
          <InlineNotification
            kind="warning"
            title="No Players"
            subtitle="No players found for the selected team"
            hideCloseButton
            lowContrast
            style={{ marginTop: "0.5rem" }}
          />
        )}

        <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#525252" }}>
          {formData.player_ids.length}/10 player{formData.player_ids.length !== 1 ? "s" : ""} selected
        </div>
      </div>
    </Modal>
  );
};

export default SquadForm;

// Made with Bob