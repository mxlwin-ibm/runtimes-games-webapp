import React, { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Select,
  SelectItem,
  Button,
  InlineNotification,
  Tag,
  StructuredListWrapper,
  StructuredListHead,
  StructuredListBody,
  StructuredListRow,
  StructuredListCell,
  IconButton,
} from '@carbon/react';
import { Add, TrashCan, Edit, Save, Close, ArrowUp, ArrowDown } from '@carbon/icons-react';
import { getEvents, createEvent, updateEvent, deleteEvent, reorderEvents } from '../../services/api';

const STATUS_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'registration_open', label: 'Registration Open' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
];

const EventManager = ({ open, onClose }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // New Event Form State
  const [newEventName, setNewEventName] = useState('');
  const [newEventMonth, setNewEventMonth] = useState('');
  const [newEventStatus, setNewEventStatus] = useState('upcoming');
  const [newEventDescription, setNewEventDescription] = useState('');

  // Editing Event State
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingMonth, setEditingMonth] = useState('');
  const [editingStatus, setEditingStatus] = useState('upcoming');
  const [editingDescription, setEditingDescription] = useState('');

  useEffect(() => {
    if (open) {
      fetchEventsList();
    }
  }, [open]);

  const fetchEventsList = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getEvents({ include_inactive: false });
      setEvents(res.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load upcoming events');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!newEventName.trim() || !newEventMonth.trim()) {
      setError('Event name and month/date are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await createEvent({
        event: newEventName.trim(),
        month: newEventMonth.trim(),
        status: newEventStatus,
        description: newEventDescription.trim() || null,
        order: events.length,
      });

      setNewEventName('');
      setNewEventMonth('');
      setNewEventStatus('upcoming');
      setNewEventDescription('');
      setSuccess('Event added successfully');
      setTimeout(() => setSuccess(false), 3000);
      await fetchEventsList();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create event');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (item) => {
    setEditingId(item._id || item.id);
    setEditingName(item.event);
    setEditingMonth(item.month);
    setEditingStatus(item.status || 'upcoming');
    setEditingDescription(item.description || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingMonth('');
    setEditingStatus('upcoming');
    setEditingDescription('');
  };

  const handleSaveEdit = async (id) => {
    if (!editingName.trim() || !editingMonth.trim()) {
      setError('Event name and month/date cannot be empty');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await updateEvent(id, {
        event: editingName.trim(),
        month: editingMonth.trim(),
        status: editingStatus,
        description: editingDescription.trim() || null,
      });

      handleCancelEdit();
      setSuccess('Event updated successfully');
      setTimeout(() => setSuccess(false), 3000);
      await fetchEventsList();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update event');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      setLoading(true);
      setError(null);
      await deleteEvent(id, true);
      setSuccess('Event deleted successfully');
      setTimeout(() => setSuccess(false), 3000);
      await fetchEventsList();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete event');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= events.length) return;

    const reordered = [...events];
    const [movedItem] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, movedItem);

    // Update local state immediately for responsive UI
    setEvents(reordered);

    try {
      const payload = reordered.map((item, idx) => ({
        id: item._id || item.id,
        order: idx,
      }));
      await reorderEvents(payload);
    } catch (err) {
      console.error('Failed to save reordered events:', err);
      // Rollback on failure
      fetchEventsList();
    }
  };

  const getStatusTagType = (status) => {
    switch (status) {
      case 'registration_open':
        return 'teal';
      case 'ongoing':
        return 'green';
      case 'completed':
        return 'cool-gray';
      case 'upcoming':
      default:
        return 'blue';
    }
  };

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading="Manage Upcoming Events"
      primaryButtonText="Done"
      onRequestSubmit={onClose}
      size="lg"
    >
      <div style={{ marginBottom: '1.5rem' }}>
        {error && (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={error}
            onClose={() => setError(null)}
            style={{ marginBottom: '1rem' }}
          />
        )}
        {success && (
          <InlineNotification
            kind="success"
            title="Success"
            subtitle={success}
            onClose={() => setSuccess(false)}
            style={{ marginBottom: '1rem' }}
          />
        )}

        {/* Add New Event Form */}
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--cds-layer-02, #f4f4f4)',
          borderRadius: '4px',
          marginBottom: '1.5rem',
        }}>
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Add New Event
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <TextInput
              id="new-event-name"
              labelText="Event Name"
              placeholder="e.g. Cricket, Chess, Snooker"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
            />
            <TextInput
              id="new-event-month"
              labelText="Month / Timing"
              placeholder="e.g. September 2026, Q3 2026"
              value={newEventMonth}
              onChange={(e) => setNewEventMonth(e.target.value)}
            />
            <Select
              id="new-event-status"
              labelText="Status"
              value={newEventStatus}
              onChange={(e) => setNewEventStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} text={opt.label} />
              ))}
            </Select>
          </div>
          <TextInput
            id="new-event-desc"
            labelText="Description (Optional)"
            placeholder="e.g. Intra-office 8-team knockout cup"
            value={newEventDescription}
            onChange={(e) => setNewEventDescription(e.target.value)}
            style={{ marginBottom: '0.75rem' }}
          />
          <Button
            kind="primary"
            size="sm"
            renderIcon={Add}
            onClick={handleAddEvent}
            disabled={!newEventName.trim() || !newEventMonth.trim() || loading}
          >
            Add Event
          </Button>
        </div>

        {/* Current Events List */}
        <div>
          <h4 style={{ marginBottom: '1rem', fontSize: '0.9375rem', fontWeight: 600 }}>
            Scheduled Events ({events.length})
          </h4>

          {events.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--cds-text-secondary, #525252)',
              border: '1px dashed var(--cds-border-subtle-01, #e0e0e0)',
              borderRadius: '4px',
            }}>
              No upcoming events yet. Add one above!
            </div>
          ) : (
            <StructuredListWrapper>
              <StructuredListHead>
                <StructuredListRow head>
                  <StructuredListCell head style={{ width: '40px' }}>Order</StructuredListCell>
                  <StructuredListCell head>Event Details</StructuredListCell>
                  <StructuredListCell head style={{ width: '130px' }}>Status</StructuredListCell>
                  <StructuredListCell head style={{ width: '120px' }}>Actions</StructuredListCell>
                </StructuredListRow>
              </StructuredListHead>
              <StructuredListBody>
                {events.map((item, index) => {
                  const itemId = item._id || item.id;
                  const isEditing = editingId === itemId;

                  return (
                    <StructuredListRow key={itemId || index}>
                      <StructuredListCell>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <IconButton
                            kind="ghost"
                            label="Move Up"
                            size="sm"
                            disabled={index === 0 || loading || isEditing}
                            onClick={() => handleMove(index, -1)}
                          >
                            <ArrowUp />
                          </IconButton>
                          <IconButton
                            kind="ghost"
                            label="Move Down"
                            size="sm"
                            disabled={index === events.length - 1 || loading || isEditing}
                            onClick={() => handleMove(index, 1)}
                          >
                            <ArrowDown />
                          </IconButton>
                        </div>
                      </StructuredListCell>

                      <StructuredListCell>
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <TextInput
                                id={`edit-name-${index}`}
                                labelText=""
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                placeholder="Event Name"
                              />
                              <TextInput
                                id={`edit-month-${index}`}
                                labelText=""
                                value={editingMonth}
                                onChange={(e) => setEditingMonth(e.target.value)}
                                placeholder="Month / Date"
                              />
                            </div>
                            <TextInput
                              id={`edit-desc-${index}`}
                              labelText=""
                              value={editingDescription}
                              onChange={(e) => setEditingDescription(e.target.value)}
                              placeholder="Description"
                            />
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--cds-text-primary, #161616)' }}>
                              {item.event}
                            </div>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary, #525252)' }}>
                              {item.month} {item.description && `• ${item.description}`}
                            </div>
                          </div>
                        )}
                      </StructuredListCell>

                      <StructuredListCell>
                        {isEditing ? (
                          <Select
                            id={`edit-status-${index}`}
                            labelText=""
                            value={editingStatus}
                            onChange={(e) => setEditingStatus(e.target.value)}
                            size="sm"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} text={opt.label} />
                            ))}
                          </Select>
                        ) : (
                          <Tag type={getStatusTagType(item.status)} size="sm">
                            {STATUS_OPTIONS.find((o) => o.value === item.status)?.label || item.status || 'Upcoming'}
                          </Tag>
                        )}
                      </StructuredListCell>

                      <StructuredListCell>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {isEditing ? (
                            <>
                              <IconButton
                                kind="primary"
                                label="Save"
                                size="sm"
                                onClick={() => handleSaveEdit(itemId)}
                                disabled={!editingName.trim() || !editingMonth.trim()}
                              >
                                <Save />
                              </IconButton>
                              <IconButton
                                kind="secondary"
                                label="Cancel"
                                size="sm"
                                onClick={handleCancelEdit}
                              >
                                <Close />
                              </IconButton>
                            </>
                          ) : (
                            <>
                              <IconButton
                                kind="ghost"
                                label="Edit"
                                size="sm"
                                onClick={() => handleStartEdit(item)}
                                disabled={loading}
                              >
                                <Edit />
                              </IconButton>
                              <IconButton
                                kind="danger--ghost"
                                label="Delete"
                                size="sm"
                                onClick={() => handleDeleteEvent(itemId)}
                                disabled={loading}
                              >
                                <TrashCan />
                              </IconButton>
                            </>
                          )}
                        </div>
                      </StructuredListCell>
                    </StructuredListRow>
                  );
                })}
              </StructuredListBody>
            </StructuredListWrapper>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default EventManager;
