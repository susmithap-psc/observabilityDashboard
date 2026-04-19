import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

const TYPE_CONFIG = {
  deploy_success: { icon: '🚀', color: 'var(--green)', label: 'Deploy' },
  deploy_failed: { icon: '💥', color: 'var(--red)', label: 'Deploy Failed' },
  ci_success: { icon: '✅', color: 'var(--green)', label: 'CI Passed' },
  ci_failure: { icon: '❌', color: 'var(--amber)', label: 'CI Failed' },
  error_new: { icon: '🐛', color: 'var(--amber)', label: 'New Error' },
  error_spike: { icon: '📈', color: 'var(--red)', label: 'Error Spike' },
  error_regression: { icon: '🔄', color: 'var(--amber)', label: 'Regression' },
  downtime_started: { icon: '🔴', color: 'var(--red)', label: 'Downtime' },
  downtime_resolved: { icon: '🟢', color: 'var(--green)', label: 'Recovered' },
};

export default function ActivityTimeline({ workspaceId }) {
  const { data: eventsData } = useQuery({
    queryKey: ['timeline-events', workspaceId],
    queryFn: () => api.get(`/events?workspaceId=${workspaceId}&limit=12`).then(r => r.data.data || []),
    enabled: !!workspaceId,
    refetchInterval: 30000,
  });

  const events = eventsData || [];

  if (events.length === 0) {
    return (
      <div className="timeline-empty">
        <span>📋</span>
        <p>No recent activity</p>
      </div>
    );
  }

  return (
    <div className="activity-timeline">
      {events.map((event, index) => {
        const config = TYPE_CONFIG[event.type] || { icon: '📌', color: 'var(--blue)', label: event.type };
        const isLast = index === events.length - 1;

        return (
          <div key={event._id} className="timeline-item">
            <div className="timeline-track">
              <div
                className="timeline-dot"
                style={{
                  background: config.color,
                  boxShadow: `0 0 8px ${config.color}40`,
                }}
              >
                <span className="timeline-dot-icon">{config.icon}</span>
              </div>
              {!isLast && <div className="timeline-line" />}
            </div>
            <div className="timeline-content">
              <div className="timeline-header">
                <span className="timeline-label" style={{ color: config.color }}>
                  {config.label}
                </span>
                <span className="timeline-time">{formatTimeAgo(event.occurredAt)}</span>
              </div>
              <div className="timeline-title">{event.title}</div>
              <div className="timeline-meta">
                <span className="timeline-source">{event.source}</span>
                {event.project?.name && (
                  <span className="timeline-project">{event.project.name}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
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
