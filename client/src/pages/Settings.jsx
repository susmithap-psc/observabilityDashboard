import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';

export default function Settings() {
  const { user } = useAuth();
  const { currentWorkspace, refreshWorkspaces } = useWorkspace();
  const [wsName, setWsName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [message, setMessage] = useState('');

  const createWsMutation = useMutation({
    mutationFn: (data) => api.post('/workspaces', data),
    onSuccess: () => { refreshWorkspaces(); setWsName(''); setMessage('Workspace created!'); },
  });

  const inviteMutation = useMutation({
    mutationFn: (data) => api.post(`/workspaces/${currentWorkspace._id}/invite`, data),
    onSuccess: (res) => { setInviteEmail(''); setMessage(`Invite sent! Token: ${res.data.data.inviteToken?.slice(0, 8)}...`); },
    onError: (err) => setMessage(err.response?.data?.error || 'Invite failed'),
  });

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage workspaces, team, and account</p>
      </div>

      {message && (
        <div className="toast-container">
          <div className="toast toast-info" onClick={() => setMessage('')}>{message}</div>
        </div>
      )}

      {/* Account */}
      <div className="settings-section">
        <h2 className="settings-section-title">👤 Account</h2>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="sidebar-avatar" style={{ width: 48, height: 48, fontSize: '1.1rem' }}>
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{user?.name}</div>
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{user?.email}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Workspace */}
      <div className="settings-section">
        <h2 className="settings-section-title">🏢 Create Workspace</h2>
        <div className="card">
          <form onSubmit={(e) => { e.preventDefault(); createWsMutation.mutate({ name: wsName }); }} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="form-label">Workspace Name</label>
              <input className="form-input" placeholder="My Startup" value={wsName} onChange={e => setWsName(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={createWsMutation.isPending}>
              {createWsMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </form>
        </div>
      </div>

      {/* Team Members */}
      {currentWorkspace && (
        <div className="settings-section">
          <h2 className="settings-section-title">👥 Team — {currentWorkspace.name}</h2>

          {/* Invite */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Invite Member</h3>
            <form onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate({ email: inviteEmail, role: inviteRole }); }}
              style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0, minWidth: 200 }}>
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="teammate@co.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Role</label>
                <select className="filter-select" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
              </button>
            </form>
          </div>

          {/* Members List */}
          <div className="members-list">
            {(currentWorkspace.members || []).map((m, i) => (
              <div key={i} className="member-row">
                <div className="member-avatar">{m.user?.name?.[0]?.toUpperCase() || '?'}</div>
                <div className="member-info">
                  <div className="member-name">{m.user?.name || 'Unknown'}</div>
                  <div className="member-email">{m.user?.email || ''}</div>
                </div>
                <span className={`badge ${m.role === 'owner' ? 'badge-purple' : m.role === 'admin' ? 'badge-info' : 'badge-success'}`}>
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
