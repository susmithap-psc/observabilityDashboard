import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import api from '../lib/api';
import { useWorkspace } from '../context/WorkspaceContext';
import ActivityTimeline from '../components/ActivityTimeline';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7'];

export default function Dashboard() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?._id;

  const { data: overview, isLoading } = useQuery({
    queryKey: ['overview', wsId],
    queryFn: () => api.get(`/events/overview?workspaceId=${wsId}`).then(r => r.data.data),
    enabled: !!wsId,
    refetchInterval: 30000,
  });

  const { data: timeline } = useQuery({
    queryKey: ['timeline', wsId],
    queryFn: () => api.get(`/events/timeline?workspaceId=${wsId}&days=7`).then(r => r.data.data),
    enabled: !!wsId,
  });

  if (!wsId) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🏢</div>
        <h3>No Workspace Selected</h3>
        <p>Create a workspace in Settings to get started.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    );
  }

  const stats = overview?.stats || {};
  const health = overview?.health || 'unknown';

  // Build chart data from timeline
  const severityChartData = buildSeverityChart(timeline?.bySeverity || []);
  const typeChartData = buildTypeChart(timeline?.byType || []);
  const piData = buildPieData(stats);

  return (
    <div>
      <div className="page-header">
        <h1>Overview Dashboard</h1>
        <p>24-hour health summary for {currentWorkspace?.name}</p>
      </div>

      {/* Health Status */}
      <div style={{ marginBottom: 24 }}>
        <div className={`health-indicator ${health}`}>
          <div className={`health-dot ${health}`} />
          {health === 'green' && 'All Systems Operational'}
          {health === 'amber' && 'Some Issues Detected'}
          {health === 'red' && 'Critical Issues — Attention Required'}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{stats.totalEvents || 0}</div>
          <div className="stat-label">Total Events</div>
        </div>

        <div className="stat-card red">
          <div className="stat-icon">🔴</div>
          <div className="stat-value">{stats.critical || 0}</div>
          <div className="stat-label">Critical</div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon">🚀</div>
          <div className="stat-value">{stats.deploys?.rate || 100}%</div>
          <div className="stat-label">Deploy Success Rate</div>
        </div>

        <div className="stat-card amber">
          <div className="stat-icon">⚠️</div>
          <div className="stat-value">{stats.warnings || 0}</div>
          <div className="stat-label">Warnings</div>
        </div>

        <div className="stat-card purple">
          <div className="stat-icon">🔧</div>
          <div className="stat-value">{stats.ci?.rate || 100}%</div>
          <div className="stat-label">CI Success Rate</div>
        </div>

        <div className={`stat-card ${stats.uptime?.currentlyDown ? 'red' : 'green'}`}>
          <div className="stat-icon">{stats.uptime?.currentlyDown ? '🔴' : '🟢'}</div>
          <div className="stat-value">{stats.uptime?.currentlyDown ? 'DOWN' : 'UP'}</div>
          <div className="stat-label">Uptime Status</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Events by Severity (7 Days)</h3>
          </div>
          <div className="chart-container" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={severityChartData}>
                <defs>
                  <linearGradient id="gradCritical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradWarning" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradInfo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: '#1a2236', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8 }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Area type="monotone" dataKey="critical" stroke="#ef4444" fill="url(#gradCritical)" strokeWidth={2} />
                <Area type="monotone" dataKey="warning" stroke="#f59e0b" fill="url(#gradWarning)" strokeWidth={2} />
                <Area type="monotone" dataKey="info" stroke="#3b82f6" fill="url(#gradInfo)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Events by Type (7 Days)</h3>
          </div>
          <div className="chart-container" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: '#1a2236', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8 }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Bar dataKey="deploys" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="errors" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="uptime" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Distribution Pie + Recent Events */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Event Distribution</h3>
          </div>
          <div className="chart-container" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={piData}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {piData.map((entry, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1a2236', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8 }}
                  itemStyle={{ color: '#f1f5f9' }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Events</h3>
          </div>
          <div className="events-feed">
            {(overview?.recentEvents || []).slice(0, 6).map((event) => (
              <div key={event._id} className="event-item">
                <div className={`event-severity-dot ${event.severity}`} />
                <div className="event-content">
                  <div className="event-title">{event.title}</div>
                  <div className="event-meta">
                    <span className="event-meta-item">{event.source}</span>
                    <span className="event-meta-item">{formatTimeAgo(event.occurredAt)}</span>
                  </div>
                </div>
                <span className={`badge badge-${event.severity}`}>{event.severity}</span>
              </div>
            ))}
            {(!overview?.recentEvents || overview.recentEvents.length === 0) && (
              <div className="empty-state">
                <p>No events in the last 24 hours</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🕐 Activity Timeline</h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>Deploy-Error Correlation</span>
        </div>
        <ActivityTimeline workspaceId={wsId} />
      </div>
    </div>
  );
}

// Helpers
function buildSeverityChart(data) {
  const map = {};
  data.forEach(({ _id, count }) => {
    if (!map[_id.date]) map[_id.date] = { date: _id.date.slice(5), critical: 0, warning: 0, info: 0 };
    map[_id.date][_id.severity] = count;
  });
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

function buildTypeChart(data) {
  const map = {};
  data.forEach(({ _id, count }) => {
    if (!map[_id.date]) map[_id.date] = { date: _id.date.slice(5), deploys: 0, errors: 0, uptime: 0 };
    if (_id.type.includes('deploy') || _id.type.includes('ci_')) map[_id.date].deploys += count;
    else if (_id.type.includes('error')) map[_id.date].errors += count;
    else if (_id.type.includes('downtime')) map[_id.date].uptime += count;
  });
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

function buildPieData(stats) {
  return [
    { name: 'Deploys', value: stats.deploys?.total || 0 },
    { name: 'CI', value: stats.ci?.total || 0 },
    { name: 'Errors', value: stats.errors || 0 },
    { name: 'Uptime', value: (stats.uptime?.downtimeStarted || 0) + (stats.uptime?.downtimeResolved || 0) },
  ].filter(d => d.value > 0);
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
