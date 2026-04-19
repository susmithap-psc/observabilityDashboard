import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import api from '../lib/api';
import { useWorkspace } from '../context/WorkspaceContext';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7'];
const SOURCE_ICONS = { github: '🐙', sentry: '🐛', uptimerobot: '🟢' };

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?._id;
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(null);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`).then(r => r.data.data),
    enabled: !!projectId,
  });

  const { data: eventsData } = useQuery({
    queryKey: ['project-events', wsId, projectId],
    queryFn: () =>
      api.get(`/events?workspaceId=${wsId}&projectId=${projectId}&limit=20`).then(r => r.data),
    enabled: !!wsId && !!projectId,
  });

  const integrationMutation = useMutation({
    mutationFn: ({ github, sentry, uptimeRobot }) =>
      api.put(`/projects/${projectId}/integrations`, { github, sentry, uptimeRobot }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setShowConfigModal(null);
    },
  });

  if (projectLoading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  if (!project) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">❓</div>
        <h3>Project not found</h3>
        <Link to="/projects" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
          ← Back to Projects
        </Link>
      </div>
    );
  }

  const events = eventsData?.data || [];
  const statusColor = project.status === 'healthy' ? 'green' : project.status === 'degraded' ? 'amber' : project.status === 'critical' ? 'red' : 'blue';

  // Build distribution for this project
  const typeCounts = {};
  events.forEach(e => {
    typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
  });
  const pieData = Object.entries(typeCounts).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));

  const severityCounts = { critical: 0, warning: 0, info: 0 };
  events.forEach(e => { severityCounts[e.severity] = (severityCounts[e.severity] || 0) + 1; });

  const integrations = project.integrations || {};

  return (
    <div>
      {/* Breadcrumb + Header */}
      <div style={{ marginBottom: 8 }}>
        <Link to="/projects" style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
          ← Back to Projects
        </Link>
      </div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>{project.name}</h1>
          <p>{project.description || 'No description'}</p>
        </div>
        <span className={`badge badge-${statusColor === 'green' ? 'success' : statusColor === 'red' ? 'critical' : statusColor === 'amber' ? 'warning' : 'info'}`}
          style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
          {project.status}
        </span>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{events.length}</div>
          <div className="stat-label">Recent Events</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">🔴</div>
          <div className="stat-value">{severityCounts.critical}</div>
          <div className="stat-label">Critical</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon">⚠️</div>
          <div className="stat-value">{severityCounts.warning}</div>
          <div className="stat-label">Warnings</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">ℹ️</div>
          <div className="stat-value">{severityCounts.info}</div>
          <div className="stat-label">Info</div>
        </div>
      </div>

      {/* Integrations Status + Chart */}
      <div className="charts-grid">
        {/* Connected Integrations */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🔗 Integrations</h3>
            <button className="btn btn-secondary btn-sm"
              onClick={() => setShowConfigModal('all')}>
              Configure
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['github', 'sentry', 'uptimeRobot'].map(key => {
              const int = integrations[key] || {};
              const isEnabled = int.enabled;
              return (
                <div key={key} className="integration-row" style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--border-secondary)',
                }}>
                  <span style={{ fontSize: '1.3rem' }}>{SOURCE_ICONS[key]}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', textTransform: 'capitalize' }}>{key}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                      {isEnabled ? getIntegrationDetail(key, int) : 'Not configured'}
                    </div>
                  </div>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: isEnabled ? 'var(--green)' : 'var(--text-muted)',
                    boxShadow: isEnabled ? '0 0 6px rgba(16, 185, 129, 0.4)' : 'none',
                  }} />
                </div>
              );
            })}
          </div>

          {/* Webhook URLs */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 8, fontWeight: 600 }}>
              Webhook Endpoints
            </div>
            {['github', 'sentry', 'uptimerobot'].map(src => (
              <div key={src} style={{ marginBottom: 6 }}>
                <code style={{
                  display: 'block', padding: '6px 10px', background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', color: 'var(--accent-light)',
                  wordBreak: 'break-all',
                }}>
                  /api/webhooks/{src}/{project._id}
                </code>
              </div>
            ))}
          </div>
        </div>

        {/* Event Distribution Pie */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📈 Event Distribution</h3>
          </div>
          {pieData.length > 0 ? (
            <div className="chart-container" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1a2236', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <p>No events recorded yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Events */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📬 Recent Events</h3>
          <Link to="/events" className="btn btn-ghost btn-sm">View All →</Link>
        </div>
        <div className="events-feed">
          {events.slice(0, 10).map(event => (
            <div key={event._id} className="event-item" onClick={() => setSelectedEvent(event)}>
              <div className={`event-severity-dot ${event.severity}`} />
              <div className="event-content">
                <div className="event-title">{event.title}</div>
                <div className="event-meta">
                  <span className="event-meta-item">📡 {event.source}</span>
                  <span className="event-meta-item">🕐 {formatTimeAgo(event.occurredAt)}</span>
                </div>
              </div>
              <div className="event-actions">
                <span className={`badge badge-${event.severity}`}>{event.severity}</span>
                <span className={`badge ${event.status === 'resolved' ? 'badge-success' : 'badge-warning'}`}>{event.status}</span>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="empty-state" style={{ padding: 30 }}>
              <p>No events for this project. Connect an integration to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}

      {/* Integration Config Modal */}
      {showConfigModal && (
        <IntegrationConfigModal
          project={project}
          onClose={() => setShowConfigModal(null)}
          onSave={(data) => integrationMutation.mutate(data)}
          isSaving={integrationMutation.isPending}
        />
      )}
    </div>
  );
}

function EventDetailModal({ event, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h2 className="modal-title">{event.title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <span className={`badge badge-${event.severity}`}>{event.severity}</span>
          <span className="badge badge-info">{event.source}</span>
          <span className="badge badge-purple">{event.type}</span>
          <span className={`badge ${event.status === 'resolved' ? 'badge-success' : 'badge-warning'}`}>{event.status}</span>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 16 }}>
          {event.description}
        </p>

        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginBottom: 20 }}>
          Occurred: {new Date(event.occurredAt).toLocaleString()}
        </p>

        {/* Rich Metadata Panel */}
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <div className="metadata-panel" style={{
            background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
            padding: 16, marginBottom: 20, border: '1px solid var(--border-secondary)',
          }}>
            <div style={{
              fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 10,
            }}>
              Event Metadata
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              {Object.entries(event.metadata).filter(([k]) => k !== 'demo').map(([key, value]) => (
                <div key={key} style={{
                  padding: '8px 10px', background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-secondary)',
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Summary */}
        {event.aiSummary && (
          <div className="ai-summary">
            <div className="ai-summary-label">AI-Generated Incident Summary</div>
            <div className="ai-summary-text">{event.aiSummary.summary}</div>
            {event.aiSummary.possibleCause && (
              <div className="ai-summary-cause">
                <strong>Possible Cause:</strong> {event.aiSummary.possibleCause}
              </div>
            )}
            {event.aiSummary.suggestedActions?.length > 0 && (
              <>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Suggested Actions:
                </div>
                <ul className="ai-summary-actions">
                  {event.aiSummary.suggestedActions.map((action, i) => (
                    <li key={i}>{action}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function IntegrationConfigModal({ project, onClose, onSave, isSaving }) {
  const ints = project.integrations || {};
  const [github, setGithub] = useState({
    enabled: ints.github?.enabled || false,
    repoOwner: ints.github?.repoOwner || '',
    repoName: ints.github?.repoName || '',
  });
  const [sentry, setSentry] = useState({
    enabled: ints.sentry?.enabled || false,
    projectSlug: ints.sentry?.projectSlug || '',
    organizationSlug: ints.sentry?.organizationSlug || '',
  });
  const [uptimeRobot, setUptimeRobot] = useState({
    enabled: ints.uptimeRobot?.enabled || false,
    monitorId: ints.uptimeRobot?.monitorId || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ github, sentry, uptimeRobot });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <h2 className="modal-title">Configure Integrations</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* GitHub */}
          <div className="config-section" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: '1.3rem' }}>🐙</span>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>GitHub</h3>
              <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={github.enabled}
                  onChange={e => setGithub(p => ({ ...p, enabled: e.target.checked }))}
                  style={{ accentColor: 'var(--accent)' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Enabled</span>
              </label>
            </div>
            {github.enabled && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Repo Owner</label>
                  <input className="form-input" placeholder="e.g. acme" value={github.repoOwner}
                    onChange={e => setGithub(p => ({ ...p, repoOwner: e.target.value }))} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Repo Name</label>
                  <input className="form-input" placeholder="e.g. frontend-app" value={github.repoName}
                    onChange={e => setGithub(p => ({ ...p, repoName: e.target.value }))} />
                </div>
              </div>
            )}
          </div>

          {/* Sentry */}
          <div className="config-section" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: '1.3rem' }}>🐛</span>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Sentry</h3>
              <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={sentry.enabled}
                  onChange={e => setSentry(p => ({ ...p, enabled: e.target.checked }))}
                  style={{ accentColor: 'var(--accent)' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Enabled</span>
              </label>
            </div>
            {sentry.enabled && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Organization Slug</label>
                  <input className="form-input" placeholder="e.g. acme" value={sentry.organizationSlug}
                    onChange={e => setSentry(p => ({ ...p, organizationSlug: e.target.value }))} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Project Slug</label>
                  <input className="form-input" placeholder="e.g. frontend-app" value={sentry.projectSlug}
                    onChange={e => setSentry(p => ({ ...p, projectSlug: e.target.value }))} />
                </div>
              </div>
            )}
          </div>

          {/* UptimeRobot */}
          <div className="config-section" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: '1.3rem' }}>🟢</span>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>UptimeRobot</h3>
              <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={uptimeRobot.enabled}
                  onChange={e => setUptimeRobot(p => ({ ...p, enabled: e.target.checked }))}
                  style={{ accentColor: 'var(--accent)' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Enabled</span>
              </label>
            </div>
            {uptimeRobot.enabled && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Monitor ID</label>
                <input className="form-input" placeholder="e.g. mon-001" value={uptimeRobot.monitorId}
                  onChange={e => setUptimeRobot(p => ({ ...p, monitorId: e.target.value }))} />
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </form>
      </div>
    </div>
  );
}

function getIntegrationDetail(key, data) {
  if (key === 'github') return `${data.repoOwner}/${data.repoName}`;
  if (key === 'sentry') return `${data.organizationSlug}/${data.projectSlug}`;
  if (key === 'uptimeRobot') return `Monitor: ${data.monitorId}`;
  return '';
}

function formatTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
