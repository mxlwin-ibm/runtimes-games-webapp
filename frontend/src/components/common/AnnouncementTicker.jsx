import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  InformationFilled,
  WarningFilled,
  Calendar,
  Radio,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Close,
  Notification,
  Launch,
} from '@carbon/icons-react';
import { Button, Tag, IconButton } from '@carbon/react';
import './AnnouncementTicker.css';

// Helper to parse announcement item whether it is an object or string
export const parseAnnouncement = (item) => {
  if (!item) return { text: '', category: 'general', link: null, linkText: null };

  if (typeof item === 'object') {
    return {
      text: item.text || '',
      category: (item.category || 'general').toLowerCase(),
      link: item.link || null,
      linkText: item.linkText || 'Learn More →',
    };
  }

  // Parse string for prefixes like [URGENT], [LIVE], [SCHEDULE], [REGISTRATION]
  const str = String(item).trim();
  const prefixMatch = str.match(/^\[(URGENT|ALERT|LIVE|MATCH DAY|SCHEDULE|FIXTURES|REGISTRATION|GENERAL)\]\s*(.*)$/i);

  let category = 'general';
  let text = str;

  if (prefixMatch) {
    const rawCat = prefixMatch[1].toUpperCase();
    if (rawCat === 'URGENT' || rawCat === 'ALERT') category = 'urgent';
    else if (rawCat === 'LIVE' || rawCat === 'MATCH DAY') category = 'live';
    else if (rawCat === 'SCHEDULE' || rawCat === 'FIXTURES') category = 'schedule';
    else if (rawCat === 'REGISTRATION') category = 'registration';
    else category = 'general';

    text = prefixMatch[2];
  }

  // Parse optional trailing link syntax: text | link:/matches | text:View Matches
  let link = null;
  let linkText = 'View →';
  if (text.includes('| link:')) {
    const parts = text.split('| link:');
    text = parts[0].trim();
    const linkParts = parts[1].split('| text:');
    link = linkParts[0].trim();
    if (linkParts[1]) {
      linkText = linkParts[1].trim();
    }
  }

  return { text, category, link, linkText };
};

const AnnouncementTicker = ({
  announcements = [],
  isAdmin = false,
  onManageClick = () => {},
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const timerRef = useRef(null);

  const parsedList = announcements.map(parseAnnouncement).filter((a) => a.text);

  // Auto-advance carousel every 6s unless paused or only 1 item
  useEffect(() => {
    if (parsedList.length <= 1 || isPaused || isDismissed) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % parsedList.length);
    }, 6000);

    return () => clearInterval(timerRef.current);
  }, [parsedList.length, isPaused, isDismissed]);

  // Adjust index if list shrinks
  useEffect(() => {
    if (currentIndex >= parsedList.length && parsedList.length > 0) {
      setCurrentIndex(0);
    }
  }, [parsedList.length, currentIndex]);

  if (isDismissed) return null;

  // Graceful empty state
  if (parsedList.length === 0) {
    if (isAdmin) {
      return (
        <div className="announcement-empty-admin">
          <div className="empty-admin-content">
            <Notification size={18} style={{ color: '#0f62fe', flexShrink: 0 }} />
            <span>
              <strong>Announcement Broadcast:</strong> No active announcements. Broadcast tournament alerts, live score updates, or registration notices.
            </span>
          </div>
          <Button
            size="sm"
            kind="ghost"
            renderIcon={Notification}
            onClick={onManageClick}
            style={{ color: '#0f62fe' }}
          >
            Manage Announcements
          </Button>
        </div>
      );
    }
    return null;
  }

  const currentItem = parsedList[currentIndex] || parsedList[0];

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? parsedList.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % parsedList.length);
  };

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'urgent':
        return {
          icon: <WarningFilled size={16} />,
          label: 'ALERT',
          className: 'badge-urgent',
        };
      case 'live':
        return {
          icon: <Radio size={16} className="live-pulse" />,
          label: 'LIVE',
          className: 'badge-live',
        };
      case 'schedule':
        return {
          icon: <Calendar size={16} />,
          label: 'SCHEDULE',
          className: 'badge-schedule',
        };
      case 'registration':
        return {
          icon: <Trophy size={16} />,
          label: 'REGISTRATION',
          className: 'badge-registration',
        };
      case 'general':
      default:
        return {
          icon: <InformationFilled size={16} />,
          label: 'UPDATE',
          className: 'badge-general',
        };
    }
  };

  const badge = getCategoryBadge(currentItem.category);

  return (
    <div
      className={`announcement-banner banner-${currentItem.category}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="banner-left">
        {/* Category Pill */}
        <span className={`category-badge ${badge.className}`}>
          {badge.icon}
          <span className="badge-text">{badge.label}</span>
        </span>

        {/* Announcement Message */}
        <div className="banner-message">
          <span className="message-text">{currentItem.text}</span>

          {/* Action Link if provided */}
          {currentItem.link && (
            <span className="action-link-wrapper">
              {currentItem.link.startsWith('http') ? (
                <a
                  href={currentItem.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="banner-action-link"
                >
                  {currentItem.linkText} <Launch size={12} style={{ marginLeft: '4px' }} />
                </a>
              ) : (
                <Link to={currentItem.link} className="banner-action-link">
                  {currentItem.linkText}
                </Link>
              )}
            </span>
          )}
        </div>
      </div>

      <div className="banner-right">
        {/* Multi-item carousel controls */}
        {parsedList.length > 1 && (
          <div className="banner-carousel-controls">
            <span className="slide-counter">
              {currentIndex + 1}/{parsedList.length}
            </span>
            <button
              className="carousel-btn"
              onClick={handlePrev}
              aria-label="Previous announcement"
              title="Previous announcement"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="carousel-btn"
              onClick={handleNext}
              aria-label="Next announcement"
              title="Next announcement"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Admin Manage Trigger */}
        {isAdmin && (
          <button
            className="banner-admin-btn"
            onClick={onManageClick}
            title="Manage Announcements"
          >
            <Notification size={16} style={{ marginRight: '4px' }} />
            Manage
          </button>
        )}

        {/* Dismiss Button */}
        <button
          className="banner-dismiss-btn"
          onClick={() => setIsDismissed(true)}
          title="Dismiss banner"
          aria-label="Dismiss banner"
        >
          <Close size={16} />
        </button>
      </div>
    </div>
  );
};

export default AnnouncementTicker;
