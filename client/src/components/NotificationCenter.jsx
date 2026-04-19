import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useWorkspace } from '../context/WorkspaceContext';

const SEVERITY_ICONS = {
  critical: '🔴',
  warning: '🟡',
  info: '🟢',
};

export default function NotificationCenter() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?._id;
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pb_read_notifs') || '[]');
    } catch { return []; }
  });
  const ref = useRef(null);

  const { data: events } = useQuery({
    queryKey: ['notifications', wsId],
    queryFn: () => api.get(`/events?workspaceId=${wsId}&limit=15&severity=critical`).then(r => r.data.data || []),
    enabled: !!wsId,
    refetchInterval: 30000,
  });

  const notifications = (events || []).slice(0, 10);
  const unreadCount = notifications.filter(n => !readIds.includes(n._id)).length;

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = () => {
    const ids = notifications.map(n => n._id);
    setReadIds(ids);
    localStorage.setItem('pb_read_notifs', JSON.stringify(ids));
  };

  const handleClick = (notif) => {
    if (!readIds.includes(notif._id)) {
      const newReadIds = [...readIds, notif._id];
      setReadIds(newReadIds);
      localStorage.setItem('pb_read_notifs', JSON.stringify(newReadIds));
    }
    setOpen(false);
    navigate('/events');
  };

  const formatTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <div className="notification-center" ref={ref}>
      <button
        className="notification-bell"
        onClick={() => setOpen(!open)}
        id="notification-bell"
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <span className="notification-dropdown-title">Notifications</span>
            {unreadCount > 0 && (
              <button className="notification-mark-read" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <span>🔔</span>
                <p>No critical alerts</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif._id}
                  className={`notification-item ${readIds.includes(notif._id) ? 'read' : 'unread'}`}
                  onClick={() => handleClick(notif)}
                >
                  <span className="notification-icon">{SEVERITY_ICONS[notif.severity] || '📌'}</span>
                  <div className="notification-body">
                    <div className="notification-text">{notif.title}</div>
                    <div className="notification-time">
                      <span>{notif.source}</span>
                      <span>•</span>
                      <span>{formatTime(notif.occurredAt)}</span>
                    </div>
                  </div>
                  {!readIds.includes(notif._id) && <span className="notification-unread-dot" />}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <button className="notification-view-all" onClick={() => { setOpen(false); navigate('/events'); }}>
              View all events →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
