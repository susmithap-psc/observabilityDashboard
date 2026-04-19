import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useWorkspace } from '../context/WorkspaceContext';

const SEARCH_SHORTCUTS = [
  { label: 'Overview', path: '/', icon: '📊', group: 'Pages' },
  { label: 'Events Inbox', path: '/events', icon: '📬', group: 'Pages' },
  { label: 'Projects', path: '/projects', icon: '📁', group: 'Pages' },
  { label: 'Integrations', path: '/integrations', icon: '🔗', group: 'Pages' },
  { label: 'AI Digest', path: '/ai-digest', icon: '✨', group: 'Pages' },
  { label: 'Settings', path: '/settings', icon: '⚙️', group: 'Pages' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?._id;

  const { data: eventsData } = useQuery({
    queryKey: ['search-events', wsId, query],
    queryFn: () => api.get(`/events?workspaceId=${wsId}&limit=5`).then(r => r.data.data || []),
    enabled: !!wsId && open && query.length === 0,
  });

  // Ctrl+K / Cmd+K to open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (!open) setQuery('');
  }, [open]);

  const filteredPages = SEARCH_SHORTCUTS.filter(s =>
    s.label.toLowerCase().includes(query.toLowerCase())
  );

  const filteredEvents = (eventsData || []).filter(e =>
    query.length === 0 || e.title.toLowerCase().includes(query.toLowerCase())
  );

  const handleNavigate = (path) => {
    navigate(path);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="cmd-overlay" onClick={() => setOpen(false)}>
      <div className="cmd-modal" onClick={e => e.stopPropagation()}>
        <div className="cmd-input-wrapper">
          <svg className="cmd-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Search pages, events, projects..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            id="command-palette-input"
          />
          <kbd className="cmd-kbd">ESC</kbd>
        </div>

        <div className="cmd-results">
          {filteredPages.length > 0 && (
            <div className="cmd-group">
              <div className="cmd-group-label">Pages</div>
              {filteredPages.map(item => (
                <button
                  key={item.path}
                  className="cmd-item"
                  onClick={() => handleNavigate(item.path)}
                >
                  <span className="cmd-item-icon">{item.icon}</span>
                  <span className="cmd-item-label">{item.label}</span>
                  <span className="cmd-item-arrow">→</span>
                </button>
              ))}
            </div>
          )}

          {filteredEvents.length > 0 && (
            <div className="cmd-group">
              <div className="cmd-group-label">Recent Events</div>
              {filteredEvents.slice(0, 5).map(event => (
                <button
                  key={event._id}
                  className="cmd-item"
                  onClick={() => handleNavigate('/events')}
                >
                  <span className="cmd-item-icon">
                    {event.severity === 'critical' ? '🔴' : event.severity === 'warning' ? '🟡' : '🟢'}
                  </span>
                  <span className="cmd-item-label">{event.title}</span>
                  <span className="cmd-item-meta">{event.source}</span>
                </button>
              ))}
            </div>
          )}

          {filteredPages.length === 0 && filteredEvents.length === 0 && (
            <div className="cmd-empty">
              <span>🔍</span>
              <p>No results found for "{query}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
