import React from 'react';
import { InformationFilled } from '@carbon/icons-react';
import './AnnouncementTicker.css';

const AnnouncementTicker = ({ announcements = [] }) => {
  if (!announcements || announcements.length === 0) return null;

  return (
    <div className="announcement-ticker">
      <div className="ticker-icon">
        <InformationFilled size={20} />
      </div>
      <div className="ticker-wrapper">
        <div className="ticker-content">
          {announcements.map((announcement, index) => (
            <span key={index} className="ticker-item">
              {announcement}
              <span className="ticker-separator">•</span>
            </span>
          ))}
          {/* Duplicate for seamless loop */}
          {announcements.map((announcement, index) => (
            <span key={`dup-${index}`} className="ticker-item">
              {announcement}
              <span className="ticker-separator">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementTicker;

// Made with Bob
