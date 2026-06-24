import React, { useState, useEffect } from 'react';
import {
  Modal,
  TextArea,
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
import { Add, TrashCan, Edit, Save, Close } from '@carbon/icons-react';
import { getAnnouncements, updateAnnouncements } from '../../services/api';

const AnnouncementManager = ({ open, onClose }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState('');

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
      setAnnouncements(response.data || []);
    } catch (err) {
      setError('Failed to load announcements');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      await updateAnnouncements(announcements);
      
      // Refetch announcements to get the updated data from backend
      await fetchAnnouncements();
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to save announcements');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (newAnnouncement.trim()) {
      setAnnouncements([...announcements, newAnnouncement.trim()]);
      setNewAnnouncement('');
    }
  };

  const handleDelete = (index) => {
    setAnnouncements(announcements.filter((_, i) => i !== index));
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditingText(announcements[index]);
  };

  const handleSaveEdit = () => {
    if (editingText.trim()) {
      const updated = [...announcements];
      updated[editingIndex] = editingText.trim();
      setAnnouncements(updated);
      setEditingIndex(null);
      setEditingText('');
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingText('');
  };

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading="Manage Announcements"
      primaryButtonText="Save Changes"
      secondaryButtonText="Cancel"
      onRequestSubmit={handleSave}
      onSecondarySubmit={onClose}
      primaryButtonDisabled={loading}
      size="lg"
    >
      <div style={{ marginBottom: '1rem' }}>
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
            subtitle="Announcements updated successfully"
            onClose={() => setSuccess(false)}
            style={{ marginBottom: '1rem' }}
          />
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <TextArea
            labelText="Add New Announcement"
            placeholder="Enter announcement text (e.g., 🏆 Championship Finals - June 2026)"
            value={newAnnouncement}
            onChange={(e) => setNewAnnouncement(e.target.value)}
            rows={2}
            maxLength={200}
            helperText={`${newAnnouncement.length}/200 characters`}
          />
          <Button
            kind="primary"
            size="sm"
            renderIcon={Add}
            onClick={handleAdd}
            disabled={!newAnnouncement.trim() || loading}
            style={{ marginTop: '0.5rem' }}
          >
            Add Announcement
          </Button>
        </div>

        <div>
          <h4 style={{ marginBottom: '1rem', fontSize: '14px', fontWeight: 600 }}>
            Current Announcements ({announcements.length})
          </h4>
          
          {announcements.length === 0 ? (
            <div style={{ 
              padding: '2rem', 
              textAlign: 'center', 
              color: '#525252',
              border: '1px dashed #e0e0e0',
              borderRadius: '4px'
            }}>
              No announcements yet. Add one above!
            </div>
          ) : (
            <StructuredListWrapper>
              <StructuredListHead>
                <StructuredListRow head>
                  <StructuredListCell head>Announcement</StructuredListCell>
                  <StructuredListCell head>Actions</StructuredListCell>
                </StructuredListRow>
              </StructuredListHead>
              <StructuredListBody>
                {announcements.map((announcement, index) => (
                  <StructuredListRow key={index}>
                    <StructuredListCell>
                      {editingIndex === index ? (
                        <TextArea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          rows={2}
                          maxLength={200}
                        />
                      ) : (
                        <div style={{ 
                          padding: '0.5rem 0',
                          wordBreak: 'break-word'
                        }}>
                          {announcement}
                        </div>
                      )}
                    </StructuredListCell>
                    <StructuredListCell>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {editingIndex === index ? (
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
                              onClick={() => handleEdit(index)}
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
                ))}
              </StructuredListBody>
            </StructuredListWrapper>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AnnouncementManager;

// Made with Bob
