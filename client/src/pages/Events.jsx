import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useWorkspace } from '../context/WorkspaceContext';

export default function Events() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?._id;
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    severity: '',
    type: '',
    source: '',
    status: '',
    page: 1,
  });
  const [selectedEvent, setSelectedEvent] = useState(null);

  const queryStr = Object.entries(filters)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  const { data, isLoading } = useQuery({
    queryKey: ['events', wsId, queryStr],
    queryFn: () =>
      api.get(`/events?workspaceId=${wsId}&${queryStr}&limit=30`).then(r => r.data),
    enabled: !!wsId,
  });

  const statusMutation = useMutation({
    mutationFn: ({ eventId, status }) => api.patch(`/events/${eventId}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const aiMutation = useMutation({
    mutationFn: (eventId) => api.post(`/ai/summarize/${eventId}`),
    onSuccess: (res) => {
      setSelectedEvent(prev => prev ? { ...prev, aiSummary: res.data.data } : prev);
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  if (!wsId) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📬</div>
        <h3>No Workspace Selected</h3>
        <p>Select or create a workspace to view events.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Events Inbox</h1>
        <p>Central feed of all deploy, CI, error, and uptime events</p>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <select className="filter-select" value={filters.severity} onChange={e => handleFilterChange('severity', e.target.value)}>
          <option value="">All Severities</option>
          <option value="critical">🔴 Critical</option>
          <option value="warning">🟡 Warning</option>
          <option value="info">🟢 Info</option>
        </select>

        <select className="filter-select" value={filters.type} onChange={e => handleFilterChange('type', e.target.value)}>
          <option value="">All Types</option>
          <option value="deploy_success">Deploy Success</option>
          <option value="deploy_failed">Deploy Failed</option>
          <option value="ci_success">CI Success</option>
          <option value="ci_failure">CI Failure</option>
          <option value="error_new">New Error</option>
          <option value="error_spike">Error Spike</option>
          <option value="error_regression">Error Regression</option>
          <option value="downtime_started">Downtime Started</option>
          <option value="downtime_resolved">Downtime Resolved</option>
        </select>

        <select className="filter-select" value={filters.source} onChange={e => handleFilterChange('source', e.target.value)}>
          <option value="">All Sources</option>
          <option value="github">GitHub</option>
          <option value="sentry">Sentry</option>
          <option value="uptimerobot">UptimeRobot</option>
        </select>

        <select className="filter-select" value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
          <option value="ignored">Ignored</option>
        </select>

        <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
          {data?.pagination?.total || 0} events
        </span>
      </div>

      {/* Events Feed */}
      {isLoading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : (
        <>
          <div className="events-feed">
            {(data?.data || []).map(event => (
              <div key={event._id} className="event-item" onClick={() => setSelectedEvent(event)}>
                <div className={`event-severity-dot ${event.severity}`} />
                <div className="event-content">
                  <div className="event-title">{event.title}</div>
                  <div className="event-meta">
                    <span className="event-meta-item">📡 {event.source}</span>
                    <span className="event-meta-item">📁 {event.project?.name || '—'}</span>
                    <span className="event-meta-item">🕐 {formatTime(event.occurredAt)}</span>
                  </div>
                </div>
                <div className="event-actions">
                  <span className={`badge badge-${event.severity}`}>{event.severity}</span>
                  <span className={`badge ${event.status === 'resolved' ? 'badge-success' : event.status === 'acknowledged' ? 'badge-info' : 'badge-warning'}`}>
                    {event.status}
                  </span>
                </div>
              </div>
            ))}
            {data?.data?.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <h3>No events found</h3>
                <p>Adjust filters or wait for new events from your integrations.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {data?.pagination && data.pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setFilters(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                disabled={filters.page <= 1}
              >
                ← Previous
              </button>
              <span style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Page {filters.page} of {data.pagination.pages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
                disabled={filters.page >= data.pagination.pages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedEvent.title}</h2>
              <button className="modal-close" onClick={() => setSelectedEvent(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <span className={`badge badge-${selectedEvent.severity}`}>{selectedEvent.severity}</span>
              <span className="badge badge-info">{selectedEvent.source}</span>
              <span className="badge badge-purple">{selectedEvent.type}</span>
              <span className={`badge ${selectedEvent.status === 'resolved' ? 'badge-success' : 'badge-warning'}`}>
                {selectedEvent.status}
              </span>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 16 }}>
              {selectedEvent.description}
            </p>

            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginBottom: 20 }}>
              Occurred: {new Date(selectedEvent.occurredAt).toLocaleString()}
            </p>

            {/* Rich Metadata Panel */}
            {selectedEvent.metadata && Object.keys(selectedEvent.metadata).filter(k => k !== 'demo').length > 0 && (
              <div style={{
                background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
                padding: 16, marginBottom: 20, border: '1px solid var(--border-secondary)',
              }}>
                <div style={{
                  fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 10,
                }}>
                  Event Metadata
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                  {Object.entries(selectedEvent.metadata).filter(([k]) => k !== 'demo').map(([key, value]) => (
                    <div key={key} style={{
                      padding: '8px 10px', background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-secondary)',
                    }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {selectedEvent.status === 'open' && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    statusMutation.mutate({ eventId: selectedEvent._id, status: 'acknowledged' });
                    setSelectedEvent(prev => ({ ...prev, status: 'acknowledged' }));
                  }}
                >
                  ✓ Acknowledge
                </button>
              )}
              {selectedEvent.status !== 'resolved' && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    statusMutation.mutate({ eventId: selectedEvent._id, status: 'resolved' });
                    setSelectedEvent(prev => ({ ...prev, status: 'resolved' }));
                  }}
                >
                  ✅ Resolve
                </button>
              )}
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  statusMutation.mutate({ eventId: selectedEvent._id, status: 'ignored' });
                  setSelectedEvent(prev => ({ ...prev, status: 'ignored' }));
                }}
              >
                🚫 Ignore
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => aiMutation.mutate(selectedEvent._id)}
                disabled={aiMutation.isPending}
              >
                {aiMutation.isPending ? '⏳ Generating...' : '✨ AI Summary'}
              </button>
            </div>

            {/* AI Summary */}
            {selectedEvent.aiSummary && (
              <div className="ai-summary">
                <div className="ai-summary-label">AI-Generated Incident Summary</div>
                <div className="ai-summary-text">{selectedEvent.aiSummary.summary}</div>
                {selectedEvent.aiSummary.possibleCause && (
                  <div className="ai-summary-cause">
                    <strong>Possible Cause:</strong> {selectedEvent.aiSummary.possibleCause}
                  </div>
                )}
                {selectedEvent.aiSummary.suggestedActions?.length > 0 && (
                  <>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                      Suggested Actions:
                    </div>
                    <ul className="ai-summary-actions">
                      {selectedEvent.aiSummary.suggestedActions.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString();
}
