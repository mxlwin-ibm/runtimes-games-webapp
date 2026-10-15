import React, { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  TextArea,
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
import { Add, TrashCan, Edit, Save, Close, WarningFilled, Radio, Calendar, Trophy, InformationFilled, ArrowUp, ArrowDown } from '@carbon/icons-react';
import { getAnnouncements, updateAnnouncements } from '../../services/api';
import { parseAnnouncement } from '../common/AnnouncementTicker';

const CATEGORIES = [
  { value: 'general', label: 'General Update' },
  { value: 'urgent', label: 'Urgent Alert' },
  { value: 'live', label: 'Match Day / Live' },
  { value: 'schedule', label: 'Schedule / Fixtures' },
  { value: 'registration', label: 'Registration Notice' },
];

const AnnouncementManager = ({ open, onClose }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // New Announcement Form State
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newLink, setNewLink] = useState('');
  const [newLinkText, setNewLinkText] = useState('');

  // Editing Item State
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editingCategory, setEditingCategory] = useState('general');
  const [editingLink, setEditingLink] = useState('');
  const [editingLinkText, setEditingLinkText] = useState('');

  useEffect(() => {
    if (open) {
      fetchAnnouncements();
    }
  }, [open]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAnnouncements();
      const rawData = response.data || [];
      const parsed = rawData.map(parseAnnouncement);
      setAnnouncements(parsed);
    } catch (err) {
      setError('Failed to load announcements');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToBackend = async (listToSave) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      await updateAnnouncements(listToSave);
      setSuccess('Announcements updated successfully');
      setTimeout(() => setSuccess(false), 3000);
      await fetchAnnouncements();
    } catch (err) {
      setError('Failed to save announcements');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newText.trim()) {
      setError('Announcement message is required');
      return;
    }

    const newItem = {
      text: newText.trim(),
      category: newCategory,
      link: newLink.trim() || null,
      linkText: newLinkText.trim() || (newLink.trim() ? 'View Details →' : null),
    };

    const updated = [...announcements, newItem];
    setAnnouncements(updated);
    setNewText('');
    setNewCategory('general');
    setNewLink('');
    setNewLinkText('');

    await handleSaveToBackend(updated);
  };

  const handleDelete = async (index) => {
    const updated = announcements.filter((_, i) => i !== index);
    setAnnouncements(updated);
    await handleSaveToBackend(updated);
  };

  const handleStartEdit = (index) => {
    setEditingIndex(index);
    const item = announcements[index];
    setEditingText(item.text);
    setEditingCategory(item.category || 'general');
    setEditingLink(item.link || '');
    setEditingLinkText(item.linkText || '');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingText('');
    setEditingCategory('general');
    setEditingLink('');
    setEditingLinkText('');
  };

  const handleSaveEdit = async () => {
    if (!editingText.trim()) {
      setError('Announcement message cannot be empty');
      return;
    }

    const updated = [...announcements];
    updated[editingIndex] = {
      text: editingText.trim(),
      category: editingCategory,
      link: editingLink.trim() || null,
      linkText: editingLinkText.trim() || (editingLink.trim() ? 'View Details →' : null),
    };

    setAnnouncements(updated);
    handleCancelEdit();
    await handleSaveToBackend(updated);
  };

  const handleMove = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= announcements.length) return;

    const reordered = [...announcements];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setAnnouncements(reordered);
    await handleSaveToBackend(reordered);
  };

  const getCategoryBadgeType = (cat) => {
    switch (cat) {
      case 'urgent':
        return { type: 'red', label: 'ALERT' };
      case 'live':
        return { type: 'green', label: 'LIVE' };
      case 'schedule':
        return { type: 'blue', label: 'SCHEDULE' };
      case 'registration':
        return { type: 'warm-gray', label: 'REGISTRATION' };
      case 'general':
      default:
        return { type: 'cyan', label: 'UPDATE' };
    }
  };

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading="Broadcast Announcements"
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

        {/* Add Announcement Form */}
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--cds-layer-02, #f4f4f4)',
          borderRadius: '4px',
          marginBottom: '1.5rem',
        }}>
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            New Announcement
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <TextArea
              id="new-announcement-text"
              labelText="Message"
              placeholder="e.g. Titans vs Vikings Quarterfinal match is starting now on Table 1!"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              rows={2}
              maxLength={250}
              helperText={`${newText.length}/250 characters`}
            />

            <Select
              id="new-announcement-cat"
              labelText="Category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value} text={c.label} />
              ))}
            </Select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <TextInput
              id="new-announcement-link"
              labelText="Action Link (Optional)"
              placeholder="e.g. /matches, /points-table, or URL"
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
            />
            <TextInput
              id="new-announcement-linktext"
              labelText="Link Button Label"
              placeholder="e.g. View Match Schedule →"
              value={newLinkText}
              onChange={(e) => setNewLinkText(e.target.value)}
            />
          </div>

          <Button
            kind="primary"
            size="sm"
            renderIcon={Add}
            onClick={handleAdd}
            disabled={!newText.trim() || loading}
          >
            Broadcast Announcement
          </Button>
        </div>

        {/* Current Active Announcements List */}
        <div>
          <h4 style={{ marginBottom: '1rem', fontSize: '0.9375rem', fontWeight: 600 }}>
            Active Announcements ({announcements.length})
          </h4>

          {announcements.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--cds-text-secondary, #525252)',
              border: '1px dashed var(--cds-border-subtle-01, #e0e0e0)',
              borderRadius: '4px',
            }}>
              No announcements active. Broadcast one above!
            </div>
          ) : (
            <StructuredListWrapper>
              <StructuredListHead>
                <StructuredListRow head>
                  <StructuredListCell head style={{ width: '40px' }}>Order</StructuredListCell>
                  <StructuredListCell head style={{ width: '120px' }}>Category</StructuredListCell>
                  <StructuredListCell head>Message & Action</StructuredListCell>
                  <StructuredListCell head style={{ width: '100px' }}>Actions</StructuredListCell>
                </StructuredListRow>
              </StructuredListHead>
              <StructuredListBody>
                {announcements.map((item, index) => {
                  const isEditing = editingIndex === index;
                  const badge = getCategoryBadgeType(item.category);

                  return (
                    <StructuredListRow key={index}>
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
                            disabled={index === announcements.length - 1 || loading || isEditing}
                            onClick={() => handleMove(index, 1)}
                          >
                            <ArrowDown />
                          </IconButton>
                        </div>
                      </StructuredListCell>

                      <StructuredListCell>
                        {isEditing ? (
                          <Select
                            id={`edit-cat-${index}`}
                            labelText=""
                            value={editingCategory}
                            onChange={(e) => setEditingCategory(e.target.value)}
                            size="sm"
                          >
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c.value} value={c.value} text={c.label} />
                            ))}
                          </Select>
                        ) : (
                          <Tag type={badge.type} size="sm">
                            {badge.label}
                          </Tag>
                        )}
                      </StructuredListCell>

                      <StructuredListCell>
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <TextArea
                              id={`edit-text-${index}`}
                              labelText=""
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              rows={2}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                              <TextInput
                                id={`edit-link-${index}`}
                                labelText=""
                                placeholder="Link (e.g. /matches)"
                                value={editingLink}
                                onChange={(e) => setEditingLink(e.target.value)}
                                size="sm"
                              />
                              <TextInput
                                id={`edit-linktext-${index}`}
                                labelText=""
                                placeholder="Link Text"
                                value={editingLinkText}
                                onChange={(e) => setEditingLinkText(e.target.value)}
                                size="sm"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontWeight: 500, color: 'var(--cds-text-primary, #161616)', marginBottom: '4px' }}>
                              {item.text}
                            </div>
                            {item.link && (
                              <div style={{ fontSize: '0.8125rem', color: '#0f62fe', fontWeight: 600 }}>
                                Link: {item.link} {item.linkText && `(${item.linkText})`}
                              </div>
                            )}
                          </div>
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
                                onClick={handleSaveEdit}
                                disabled={!editingText.trim()}
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
                                onClick={() => handleStartEdit(index)}
                                disabled={loading}
                              >
                                <Edit />
                              </IconButton>
                              <IconButton
                                kind="danger--ghost"
                                label="Delete"
                                size="sm"
                                onClick={() => handleDelete(index)}
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

export default AnnouncementManager;
