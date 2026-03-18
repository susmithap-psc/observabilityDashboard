import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useWorkspace } from '../context/WorkspaceContext';

export default function AIDigest() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?._id;

  const { data: digest, isLoading } = useQuery({
    queryKey: ['ai-digest', wsId],
    queryFn: () => api.get(`/ai/digest?workspaceId=${wsId}`).then(r => r.data.data),
    enabled: !!wsId,
  });

  if (!wsId) return <div className="empty-state"><div className="empty-state-icon">✨</div><h3>No Workspace</h3></div>;
  if (isLoading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!digest) return <div className="empty-state"><h3>No digest available</h3></div>;

  return (
    <div>
      <div className="page-header">
        <h1>AI Daily Digest</h1>
        <p>Auto-generated summary — {digest.period}</p>
      </div>

      <div className="digest-card">
        <div className="digest-header">
          <div className="digest-title">✨ Daily Intelligence Report</div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
            {new Date(digest.generatedAt).toLocaleString()}
          </span>
        </div>
        <div className="digest-narrative">{digest.narrative}</div>
        <div className="digest-stats">
          <div className="digest-stat">
            <div className="digest-stat-value">{digest.summary?.totalEvents || 0}</div>
            <div className="digest-stat-label">Total Events</div>
          </div>
          <div className="digest-stat">
            <div className="digest-stat-value" style={{ color: 'var(--red)' }}>{digest.summary?.critical || 0}</div>
            <div className="digest-stat-label">Critical</div>
          </div>
          <div className="digest-stat">
            <div className="digest-stat-value" style={{ color: 'var(--amber)' }}>{digest.summary?.warnings || 0}</div>
            <div className="digest-stat-label">Warnings</div>
          </div>
          <div className="digest-stat">
            <div className="digest-stat-value" style={{ color: 'var(--green)' }}>{digest.summary?.info || 0}</div>
            <div className="digest-stat-label">Info</div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🚀 Deployments</h3>
            <span className={`badge ${digest.deploys?.failed > 0 ? 'badge-critical' : 'badge-success'}`}>{digest.deploys?.successRate || 100}%</span>
          </div>
          <div className="stats-grid" style={{ marginBottom: 0 }}>
            <div className="stat-card blue" style={{ padding: 14 }}><div className="stat-value" style={{ fontSize: '1.4rem' }}>{digest.deploys?.total || 0}</div><div className="stat-label">Total</div></div>
            <div className="stat-card green" style={{ padding: 14 }}><div className="stat-value" style={{ fontSize: '1.4rem' }}>{digest.deploys?.success || 0}</div><div className="stat-label">Success</div></div>
            <div className="stat-card red" style={{ padding: 14 }}><div className="stat-value" style={{ fontSize: '1.4rem' }}>{digest.deploys?.failed || 0}</div><div className="stat-label">Failed</div></div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🐛 Errors</h3>
            <span className={`badge ${digest.errors?.total > 0 ? 'badge-warning' : 'badge-success'}`}>{digest.errors?.total || 0}</span>
          </div>
          <div className="stats-grid" style={{ marginBottom: 0 }}>
            <div className="stat-card amber" style={{ padding: 14 }}><div className="stat-value" style={{ fontSize: '1.4rem' }}>{digest.errors?.new || 0}</div><div className="stat-label">New</div></div>
            <div className="stat-card red" style={{ padding: 14 }}><div className="stat-value" style={{ fontSize: '1.4rem' }}>{digest.errors?.spikes || 0}</div><div className="stat-label">Spikes</div></div>
            <div className="stat-card purple" style={{ padding: 14 }}><div className="stat-value" style={{ fontSize: '1.4rem' }}>{digest.errors?.regressions || 0}</div><div className="stat-label">Regressions</div></div>
          </div>
        </div>
      </div>

      {digest.topIncidents?.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header"><h3 className="card-title">⚡ Top Incidents</h3></div>
          <div className="events-feed">
            {digest.topIncidents.map((inc, i) => (
              <div key={i} className="event-item" style={{ cursor: 'default' }}>
                <div className={`event-severity-dot ${inc.severity}`} />
                <div className="event-content">
                  <div className="event-title">{inc.title}</div>
                  <div className="event-meta"><span>{inc.type}</span><span>{new Date(inc.occurredAt).toLocaleString()}</span></div>
                </div>
                <span className={`badge badge-${inc.severity}`}>{inc.severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
