import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useWorkspace } from '../context/WorkspaceContext';

export default function Projects() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?._id;
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['projects', wsId],
    queryFn: () => api.get(`/projects?workspaceId=${wsId}`).then(r => r.data.data),
    enabled: !!wsId,
  });

  const createMutation = useMutation({
    mutationFn: (project) => api.post('/projects', { ...project, workspaceId: wsId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowCreate(false);
      setNewProject({ name: '', description: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/projects/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const statusColors = {
    healthy: 'green',
    degraded: 'amber',
    critical: 'red',
    unknown: 'blue',
  };

  if (!wsId) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📁</div>
        <h3>No Workspace</h3>
        <p>Create a workspace first.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Projects</h1>
          <p>Manage your applications and services</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Project
        </button>
      </div>

      {isLoading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : (
        <div className="integrations-grid">
          {(data || []).map(project => (
            <div key={project._id} className="card">
              <div className="card-header">
                <h3 className="card-title">{project.name}</h3>
                <span className={`badge badge-${statusColors[project.status] === 'green' ? 'success' : statusColors[project.status] === 'red' ? 'critical' : statusColors[project.status] === 'amber' ? 'warning' : 'info'}`}>
                  {project.status}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16 }}>
                {project.description || 'No description'}
              </p>

              {/* Integration status icons */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {project.integrations?.github?.enabled && (
                  <span className="badge badge-info" title="GitHub connected">🐙 GitHub</span>
                )}
                {project.integrations?.sentry?.enabled && (
                  <span className="badge badge-critical" title="Sentry connected">🐛 Sentry</span>
                )}
                {project.integrations?.uptimeRobot?.enabled && (
                  <span className="badge badge-success" title="UptimeRobot connected">🟢 Uptime</span>
                )}
                {!project.integrations?.github?.enabled && !project.integrations?.sentry?.enabled && !project.integrations?.uptimeRobot?.enabled && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No integrations configured</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    if (confirm('Delete this project?')) deleteMutation.mutate(project._id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {data?.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-icon">📁</div>
              <h3>No projects yet</h3>
              <p>Create your first project to start monitoring.</p>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create Project</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(newProject);
            }}>
              <div className="form-group">
                <label className="form-label">Project Name</label>
                <input
                  className="form-input"
                  placeholder="e.g. Frontend App"
                  value={newProject.name}
                  onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  className="form-input"
                  placeholder="Brief description of this project"
                  value={newProject.description}
                  onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Project'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
