import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const [connectModal, setConnectModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { projectId, projectName, integrationKey, integrationName }

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', wsId],
    queryFn: () => api.get(`/projects?workspaceId=${wsId}`).then(r => r.data.data),
    enabled: !!wsId,
  });

  const disconnectMutation = useMutation({
    mutationFn: ({ projectId, integrationKey }) => {
      const payload = {};
      if (integrationKey === 'github') {
        payload.github = { enabled: false, repoOwner: '', repoName: '' };
      } else if (integrationKey === 'sentry') {
        payload.sentry = { enabled: false, projectSlug: '', organizationSlug: '' };
      } else if (integrationKey === 'uptimeRobot') {
        payload.uptimeRobot = { enabled: false, monitorId: '' };
      }
      return api.put(`/projects/${projectId}/integrations`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', wsId] });
      setConfirmDelete(null);
    },
  });

  const connectMutation = useMutation({
    mutationFn: ({ projectId, integrationKey, config }) => {
      const payload = {};
      payload[integrationKey] = { enabled: true, ...config };
      return api.put(`/projects/${projectId}/integrations`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', wsId] });
      setConnectModal(null);
    },
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

  const integrationStatus = {};
  integrationInfo.forEach(info => {
    const mapKey = info.key === 'uptimerobot' ? 'uptimeRobot' : info.key;
    const enabled = (projects || []).filter(p => p.integrations?.[mapKey]?.enabled);
    integrationStatus[info.key] = {
      connectedProjects: enabled,
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
            const isConnected = status.connectedProjects.length > 0;
            const mapKey = info.key === 'uptimerobot' ? 'uptimeRobot' : info.key;

            return (
              <div key={info.key} className="integration-card" id={`integration-card-${info.key}`}>
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
                    ? `Connected to ${status.connectedProjects.length} project(s)`
                    : 'Not connected'}
                </div>

                {isConnected && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{
                      fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 8,
                    }}>
                      Connected Projects
                    </div>
                    {status.connectedProjects.map(project => {
                      const intData = project.integrations?.[mapKey] || {};
                      return (
                        <div key={project._id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 12px', marginBottom: 6,
                          background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-secondary)',
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                              {project.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                              {getIntegrationDetail(info.key, intData)}
                            </div>
                          </div>
                          <button
                            id={`delete-${info.key}-${project.name.replace(/\s+/g, '-').toLowerCase()}`}
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              setConfirmDelete({
                                projectId: project._id,
                                projectName: project.name,
                                integrationKey: mapKey,
                                integrationName: info.name,
                              });
                            }}
                            style={{ marginLeft: 10, flexShrink: 0 }}
                          >
                            Delete
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  id={`connect-${info.key}`}
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 14, width: '100%', justifyContent: 'center' }}
                  onClick={() => setConnectModal(info.key)}
                >
                  + Connect a Project
                </button>

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

      {/* Custom Confirm Delete Modal (replaces native confirm()) */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 className="modal-title">⚠️ Remove Integration</h2>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
              Are you sure you want to remove <strong>{confirmDelete.integrationName}</strong> integration
              from <strong>"{confirmDelete.projectName}"</strong>? This will disconnect the integration
              and stop receiving events.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                id="cancel-delete"
                className="btn btn-secondary"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button
                id="confirm-delete"
                className="btn btn-danger"
                onClick={() => {
                  disconnectMutation.mutate({
                    projectId: confirmDelete.projectId,
                    integrationKey: confirmDelete.integrationKey,
                  });
                }}
                disabled={disconnectMutation.isPending}
              >
                {disconnectMutation.isPending ? 'Removing...' : 'Remove Integration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect Modal */}
      {connectModal && (
        <ConnectProjectModal
          integrationKey={connectModal}
          integrationInfo={integrationInfo.find(i => i.key === connectModal)}
          projects={projects || []}
          onClose={() => setConnectModal(null)}
          onSave={(data) => connectMutation.mutate(data)}
          isSaving={connectMutation.isPending}
        />
      )}
    </div>
  );
}

function ConnectProjectModal({ integrationKey, integrationInfo, projects, onClose, onSave, isSaving }) {
  const mapKey = integrationKey === 'uptimerobot' ? 'uptimeRobot' : integrationKey;
  const availableProjects = projects.filter(p => !p.integrations?.[mapKey]?.enabled);

  const [selectedProjectId, setSelectedProjectId] = useState(availableProjects[0]?._id || '');

  const [githubConfig, setGithubConfig] = useState({ repoOwner: 'susmithap-psc', repoName: 'pixel-perfect' });
  const [sentryConfig, setSentryConfig] = useState({ organizationSlug: '', projectSlug: '' });
  const [uptimeConfig, setUptimeConfig] = useState({ monitorId: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedProjectId) return;

    let config = {};
    if (integrationKey === 'github') config = githubConfig;
    else if (integrationKey === 'sentry') config = sentryConfig;
    else if (integrationKey === 'uptimerobot') config = uptimeConfig;

    onSave({ projectId: selectedProjectId, integrationKey: mapKey, config });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2 className="modal-title">
            {integrationInfo?.icon} Connect {integrationInfo?.name}
          </h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {availableProjects.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 20px' }}>
            <p>All projects are already connected to {integrationInfo?.name}.</p>
            <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ marginTop: 12 }}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Select Project</label>
              <select
                id="select-project"
                className="form-input"
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                required
              >
                {availableProjects.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            {integrationKey === 'github' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Repo Owner</label>
                  <input
                    id="github-repo-owner"
                    className="form-input"
                    placeholder="e.g. susmithap-psc"
                    value={githubConfig.repoOwner}
                    onChange={e => setGithubConfig(p => ({ ...p, repoOwner: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Repo Name</label>
                  <input
                    id="github-repo-name"
                    className="form-input"
                    placeholder="e.g. pixel-perfect"
                    value={githubConfig.repoName}
                    onChange={e => setGithubConfig(p => ({ ...p, repoName: e.target.value }))}
                    required
                  />
                </div>
              </div>
            )}

            {integrationKey === 'sentry' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Organization Slug</label>
                  <input
                    id="sentry-org-slug"
                    className="form-input"
                    placeholder="e.g. acme"
                    value={sentryConfig.organizationSlug}
                    onChange={e => setSentryConfig(p => ({ ...p, organizationSlug: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Project Slug</label>
                  <input
                    id="sentry-project-slug"
                    className="form-input"
                    placeholder="e.g. frontend-app"
                    value={sentryConfig.projectSlug}
                    onChange={e => setSentryConfig(p => ({ ...p, projectSlug: e.target.value }))}
                    required
                  />
                </div>
              </div>
            )}

            {integrationKey === 'uptimerobot' && (
              <div className="form-group">
                <label className="form-label">Monitor ID</label>
                <input
                  id="uptime-monitor-id"
                  className="form-input"
                  placeholder="e.g. mon-001"
                  value={uptimeConfig.monitorId}
                  onChange={e => setUptimeConfig(p => ({ ...p, monitorId: e.target.value }))}
                  required
                />
              </div>
            )}

            <button
              id="save-integration"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              disabled={isSaving}
            >
              {isSaving ? 'Connecting...' : `Connect ${integrationInfo?.name}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function getIntegrationDetail(key, data) {
  if (key === 'github') return `${data.repoOwner || ''}/${data.repoName || ''}`;
  if (key === 'sentry') return `${data.organizationSlug || ''}/${data.projectSlug || ''}`;
  if (key === 'uptimerobot') return `Monitor: ${data.monitorId || ''}`;
  return '';
}
