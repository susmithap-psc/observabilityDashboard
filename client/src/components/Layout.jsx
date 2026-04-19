import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import NotificationCenter from './NotificationCenter';
import CommandPalette from './CommandPalette';

const navItems = [
  { path: '/', label: 'Overview', icon: '📊' },
  { path: '/events', label: 'Events Inbox', icon: '📬' },
  { path: '/projects', label: 'Projects', icon: '📁' },
  { path: '/integrations', label: 'Integrations', icon: '🔗' },
  { path: '/ai-digest', label: 'AI Digest', icon: '✨' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { currentWorkspace, workspaces, selectWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const wsRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wsRef.current && !wsRef.current.contains(e.target)) {
        setWsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [children]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : '?';

  return (
    <div className="app-layout">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">⚡</div>
          <span className="sidebar-brand-name">PulseBoard</span>
        </div>

        {/* Workspace selector */}
        {currentWorkspace && (
          <div className="workspace-selector-container" ref={wsRef}>
            <div
              className="workspace-selector"
              onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
            >
              <div className="workspace-icon">
                {currentWorkspace.name?.[0]?.toUpperCase() || 'W'}
              </div>
              <span className="workspace-name">{currentWorkspace.name}</span>
              <span className={`ws-chevron ${wsDropdownOpen ? 'open' : ''}`}>▼</span>
            </div>

            {wsDropdownOpen && workspaces.length > 1 && (
              <div className="workspace-dropdown">
                <div className="workspace-dropdown-label">Switch Workspace</div>
                {workspaces.map((ws) => (
                  <div
                    key={ws._id}
                    className={`workspace-dropdown-item ${ws._id === currentWorkspace._id ? 'active' : ''}`}
                    onClick={() => {
                      selectWorkspace(ws);
                      setWsDropdownOpen(false);
                    }}
                  >
                    <div className="workspace-icon sm">
                      {ws.name?.[0]?.toUpperCase() || 'W'}
                    </div>
                    <span>{ws.name}</span>
                    {ws._id === currentWorkspace._id && <span className="ws-check">✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="link-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={handleLogout} title="Click to logout">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-email">{user?.email}</div>
            </div>
            <span className="logout-icon">↗</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-wrapper">
        {/* Top Header Bar */}
        <header className="top-header">
          <div className="top-header-left">
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              id="mobile-menu-toggle"
            >
              <span className={`hamburger ${mobileMenuOpen ? 'active' : ''}`}>
                <span />
                <span />
                <span />
              </span>
            </button>

            <button
              className="search-trigger"
              onClick={() => {
                const event = new KeyboardEvent('keydown', {
                  key: 'k',
                  ctrlKey: true,
                  bubbles: true,
                });
                window.dispatchEvent(event);
              }}
              id="search-trigger"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Search...</span>
              <kbd>Ctrl+K</kbd>
            </button>
          </div>

          <div className="top-header-right">
            {/* Live clock */}
            <LiveClock />

            {/* Status indicator */}
            <div className="system-status-pill" title="System status">
              <span className="status-dot-live" />
              <span>Live</span>
            </div>

            {/* Notifications */}
            <NotificationCenter />
          </div>
        </header>

        <main className="main-content">
          {children}
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette />
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="live-clock">
      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}
