import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useWorkspace } from '../context/WorkspaceContext';

const integrationInfo = [
  {
    key: 'github',
    name: 'GitHub',
    icon: '🐙',
    color: '#333',
    description: 'Deployments, CI failures, workflow runs, push events',
    features: ['Deployment tracking', 'CI/CD pipeline monitoring', 'Push event detection', 'Workflow run analysis'],
  },
  {
    key: 'sentry',
    name: 'Sentry',
    icon: '🐛',
    color: '#362D59',
    description: 'New issues, regressions, error spikes',
    features: ['Error tracking', 'Regression detection', 'Error spike alerts', 'Issue fingerprinting'],
  },
  {
    key: 'uptimerobot',
    name: 'UptimeRobot',
    icon: '🟢',
    color: '#3BD671',
    description: 'Downtime events, recovery events, uptime metrics',
    features: ['Downtime detection', 'Recovery alerts', 'Uptime percentage', 'Response time monitoring'],
  },
];

export default function Integrations() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?._id;

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', wsId],
    queryFn: () => api.get(`/projects?workspaceId=${wsId}`).then(r => r.data.data),
    enabled: !!wsId,
  });

  if (!wsId) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔗</div>
        <h3>No Workspace</h3>
        <p>Select a workspace to manage integrations.</p>
      </div>
    );
  }

  // Aggregate integration status across projects
  const integrationStatus = {};
  integrationInfo.forEach(info => {
    const enabled = (projects || []).filter(p => p.integrations?.[info.key]?.enabled);
    integrationStatus[info.key] = {
      connectedProjects: enabled.length,
      totalProjects: (projects || []).length,
    };
  });

  return (
    <div>
      <div className="page-header">
        <h1>Integrations</h1>
        <p>Connect your tools to aggregate observability signals</p>
      </div>

      {isLoading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : (
        <div className="integrations-grid">
          {integrationInfo.map(info => {
            const status = integrationStatus[info.key];
            const isConnected = status.connectedProjects > 0;

            return (
              <div key={info.key} className="integration-card">
                <div className="integration-header">
                  <div
                    className="integration-logo"
                    style={{ background: `${info.color}22`, border: `1px solid ${info.color}44` }}
                  >
                    {info.icon}
                  </div>
                  <div>
                    <div className="integration-name">{info.name}</div>
                    <div className="integration-desc">{info.description}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                    Features:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {info.features.map((f, i) => (
                      <span key={i} className="badge badge-info">{f}</span>
                    ))}
                  </div>
                </div>

                <div className={`integration-status ${isConnected ? 'connected' : 'disconnected'}`}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: isConnected ? 'var(--green)' : 'var(--text-muted)',
                    display: 'inline-block',
                  }} />
                  {isConnected
                    ? `Connected to ${status.connectedProjects} project(s)`
                    : 'Not connected'}
                </div>

                {isConnected && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 6 }}>
                      Webhook URL:
                    </div>
                    <code style={{
                      display: 'block', padding: '8px 12px', background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--accent-light)',
                      wordBreak: 'break-all',
                    }}>
                      {window.location.origin}/api/webhooks/{info.key}/{'<projectId>'}
                    </code>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Webhook Info Card */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <h3 className="card-title">📡 Event Ingestion Pipeline</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 8 }}>
          {['1. Receive Webhook', '2. Verify Signature', '3. Normalize Event', '4. Enrich Metadata', '5. Deduplicate', '6. Store Event'].map((step, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: '14px 10px',
              background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)',
              border: '1px solid var(--border-secondary)',
            }}>
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
