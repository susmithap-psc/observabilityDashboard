import crypto from 'crypto';
import { dbConnected } from '../config/db.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// In-memory demo data store
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const genId = () => crypto.randomBytes(12).toString('hex');

const DEMO_USER_ID = genId();
const DEMO_WORKSPACE_ID = genId();
const DEMO_PROJECT_IDS = [genId(), genId(), genId()];

const demoUser = {
  _id: DEMO_USER_ID,
  name: 'Susmitha Chowdary',
  email: 'susmitha@pulseboard.io',
  avatar: '',
  createdAt: new Date().toISOString(),
};

const demoWorkspace = {
  _id: DEMO_WORKSPACE_ID,
  name: 'susmithap-psc',
  slug: 'susmithap-psc',
  description: 'Workspace for susmithap-psc projects and services',
  members: [
    { user: { ...demoUser }, role: 'owner', joinedAt: new Date().toISOString() },
  ],
  createdBy: DEMO_USER_ID,
  createdAt: new Date().toISOString(),
};

const demoProjects = [
  {
    _id: DEMO_PROJECT_IDS[0],
    name: 'pixel-perfect',
    description: 'Pixel Perfect — UI component library and design system',
    workspace: DEMO_WORKSPACE_ID,
    status: 'healthy',
    createdBy: DEMO_USER_ID,
    integrations: {
      github: { enabled: true, repoOwner: 'susmithap-psc', repoName: 'pixel-perfect' },
      sentry: { enabled: true, projectSlug: 'pixel-perfect', organizationSlug: 'susmithap-psc' },
      uptimeRobot: { enabled: true, monitorId: 'mon-pixel-001' },
    },
    alertRules: [],
    createdAt: new Date().toISOString(),
  },
  {
    _id: DEMO_PROJECT_IDS[1],
    name: 'observability-dashboard',
    description: 'PulseBoard observability dashboard service',
    workspace: DEMO_WORKSPACE_ID,
    status: 'healthy',
    createdBy: DEMO_USER_ID,
    integrations: {
      github: { enabled: false },
      sentry: { enabled: false },
      uptimeRobot: { enabled: false },
    },
    alertRules: [],
    createdAt: new Date().toISOString(),
  },
  {
    _id: DEMO_PROJECT_IDS[2],
    name: 'api-service',
    description: 'Backend API microservice',
    workspace: DEMO_WORKSPACE_ID,
    status: 'healthy',
    createdBy: DEMO_USER_ID,
    integrations: {
      github: { enabled: false },
      sentry: { enabled: false },
      uptimeRobot: { enabled: false },
    },
    alertRules: [],
    createdAt: new Date().toISOString(),
  },
];

// Generate realistic events
function generateDemoEvents() {
  const branches = ['main', 'staging', 'develop', 'feature/ui-components', 'hotfix/layout-fix'];
  const actors = ['susmithap-psc', 'dev-contributor', 'ci-bot', 'release-manager'];
  const shas = () => crypto.randomBytes(20).toString('hex').substring(0, 7);

  const eventDefs = [
    { type: 'deploy_success', severity: 'info', source: 'github',
      titles: ['🚀 Deploy: pixel-perfect v1.2.0 success', '🚀 Deploy: hotfix-layout success', '🚀 Deploy: feature-components success', '🚀 Deploy: v2.0.0-rc1 success'],
      meta: () => ({ environment: 'production', state: 'success', branch: branches[Math.floor(Math.random()*branches.length)], commitSha: shas(), actor: actors[Math.floor(Math.random()*actors.length)], deployUrl: 'https://pixel-perfect.vercel.app' }),
    },
    { type: 'deploy_failed', severity: 'critical', source: 'github',
      titles: ['💥 Deploy: pixel-perfect v1.3.0-beta failed', '💥 Deploy: staging-build failed'],
      meta: () => ({ environment: 'staging', state: 'failure', branch: branches[Math.floor(Math.random()*branches.length)], commitSha: shas(), errorCode: 'BUILD_FAILED', actor: actors[Math.floor(Math.random()*actors.length)] }),
    },
    { type: 'ci_success', severity: 'info', source: 'github',
      titles: ['✅ CI: Unit Tests — passed', '✅ CI: Visual Regression Tests — passed', '✅ CI: Lint & Build — passed'],
      meta: () => ({ workflowName: 'CI Pipeline', branch: branches[Math.floor(Math.random()*branches.length)], conclusion: 'success', commitSha: shas(), durationMs: Math.floor(Math.random()*120000)+30000, actor: actors[Math.floor(Math.random()*actors.length)] }),
    },
    { type: 'ci_failure', severity: 'warning', source: 'github',
      titles: ['❌ CI: Component Tests — failed', '❌ CI: Build — compilation error', '❌ CI: Lint check — style violations'],
      meta: () => ({ workflowName: 'CI Pipeline', branch: branches[Math.floor(Math.random()*branches.length)], conclusion: 'failure', commitSha: shas(), failedStep: 'test:components', actor: actors[Math.floor(Math.random()*actors.length)] }),
    },
    { type: 'error_new', severity: 'warning', source: 'sentry',
      titles: ['🐛 TypeError: Cannot read property of undefined', '🐛 ReferenceError: component is not defined', '🐛 SyntaxError: Unexpected token in JSX'],
      meta: () => ({ level: 'error', platform: 'javascript', count: Math.floor(Math.random()*50)+1, culprit: 'src/components/Grid.jsx', fingerprint: crypto.randomBytes(8).toString('hex'), firstSeen: new Date(Date.now()-Math.random()*3600000).toISOString() }),
    },
    { type: 'error_spike', severity: 'critical', source: 'sentry',
      titles: ['🐛 Spike: 500 errors increased by 340%', '🐛 Spike: Render timeout errors'],
      meta: () => ({ level: 'fatal', platform: 'javascript', count: Math.floor(Math.random()*500)+100, spikePercent: Math.floor(Math.random()*400)+100, culprit: 'src/hooks/useLayout.js', affectedUsers: Math.floor(Math.random()*200)+10 }),
    },
    { type: 'error_regression', severity: 'warning', source: 'sentry',
      titles: ['🐛 Regression: Layout rendering null pointer', '🐛 Regression: State management memory leak'],
      meta: () => ({ level: 'error', platform: 'javascript', count: Math.floor(Math.random()*80)+5, culprit: 'src/utils/layout.js', lastResolvedAt: new Date(Date.now()-Math.random()*86400000*7).toISOString() }),
    },
    { type: 'downtime_started', severity: 'critical', source: 'uptimerobot',
      titles: ['🔴 Uptime: pixel-perfect.vercel.app is DOWN', '🔴 Uptime: api.pixel-perfect.dev is DOWN'],
      meta: () => ({ monitorName: 'pixel-perfect Health Check', monitorUrl: 'https://pixel-perfect.vercel.app', alertType: 'Down', responseTime: null }),
    },
    { type: 'downtime_resolved', severity: 'info', source: 'uptimerobot',
      titles: ['🟢 Uptime: pixel-perfect.vercel.app is UP', '🟢 Uptime: api.pixel-perfect.dev is UP (after 8min)'],
      meta: () => ({ monitorName: 'pixel-perfect Health Check', monitorUrl: 'https://pixel-perfect.vercel.app', alertType: 'Up', alertDuration: `${Math.floor(Math.random()*30)+1}m`, responseTime: `${Math.floor(Math.random()*200)+50}ms` }),
    },
  ];

  const events = [];
  const now = Date.now();

  for (let i = 0; i < 80; i++) {
    const def = eventDefs[Math.floor(Math.random() * eventDefs.length)];
    // Events are primarily tied to pixel-perfect (the connected project)
    const project = demoProjects[0];
    const title = def.titles[Math.floor(Math.random() * def.titles.length)];
    const hoursAgo = Math.floor(Math.random() * 168);

    events.push({
      _id: genId(),
      fingerprint: crypto.randomBytes(16).toString('hex'),
      type: def.type,
      severity: def.severity,
      source: def.source,
      project: { _id: project._id, name: project.name },
      workspace: DEMO_WORKSPACE_ID,
      title,
      description: `Event from ${def.source}: ${title.replace(/[^\w\s]/g, '')}`,
      metadata: def.meta(),
      status: Math.random() > 0.6 ? (Math.random() > 0.5 ? 'acknowledged' : 'resolved') : 'open',
      aiSummary: null,
      occurredAt: new Date(now - hoursAgo * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now - hoursAgo * 60 * 60 * 1000).toISOString(),
    });
  }

  return events.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
}

let demoEvents = generateDemoEvents();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Demo token management
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DEMO_TOKEN = 'demo-access-token-pulseboard';

function isDemoMode() {
  return !dbConnected;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Demo route handlers 
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function createDemoRouter() {
  const handlers = {};

  // AUTH
  handlers['POST /api/auth/register'] = (req, res) => {
    res.status(201).json({ success: true, data: { user: demoUser, accessToken: DEMO_TOKEN } });
  };

  handlers['POST /api/auth/login'] = (req, res) => {
    res.json({ success: true, data: { user: demoUser, accessToken: DEMO_TOKEN } });
  };

  handlers['POST /api/auth/refresh'] = (req, res) => {
    res.json({ success: true, data: { accessToken: DEMO_TOKEN } });
  };

  handlers['POST /api/auth/logout'] = (req, res) => {
    res.json({ success: true, data: {} });
  };

  handlers['GET /api/auth/me'] = (req, res) => {
    res.json({ success: true, data: demoUser });
  };

  // WORKSPACES
  handlers['GET /api/workspaces'] = (req, res) => {
    res.json({ success: true, data: [demoWorkspace] });
  };

  handlers['POST /api/workspaces'] = (req, res) => {
    const ws = {
      _id: genId(),
      name: req.body.name || 'New Workspace',
      slug: (req.body.name || 'new-workspace').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: '',
      members: [{ user: { ...demoUser }, role: 'owner', joinedAt: new Date().toISOString() }],
      createdBy: DEMO_USER_ID,
      createdAt: new Date().toISOString(),
    };
    res.status(201).json({ success: true, data: ws });
  };

  // PROJECTS
  handlers['GET /api/projects'] = (req, res) => {
    const wsId = req.query.workspaceId;
    const filtered = wsId ? demoProjects.filter(p => p.workspace === wsId) : demoProjects;
    res.json({ success: true, data: filtered });
  };

  handlers['POST /api/projects'] = (req, res) => {
    const p = {
      _id: genId(),
      name: req.body.name,
      description: req.body.description || '',
      workspace: req.body.workspaceId || DEMO_WORKSPACE_ID,
      status: 'unknown',
      integrations: { github: { enabled: false }, sentry: { enabled: false }, uptimeRobot: { enabled: false } },
      alertRules: [],
      createdBy: DEMO_USER_ID,
      createdAt: new Date().toISOString(),
    };
    demoProjects.push(p);
    res.status(201).json({ success: true, data: p });
  };

  handlers['DELETE /api/projects/:projectId'] = (req, res) => {
    const idx = demoProjects.findIndex(p => p._id === req.params.projectId);
    if (idx >= 0) demoProjects.splice(idx, 1);
    res.json({ success: true, data: { message: 'Project deleted' } });
  };

  // Get single project
  handlers['GET /api/projects/:projectId'] = (req, res) => {
    const project = demoProjects.find(p => p._id === req.params.projectId);
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    res.json({ success: true, data: project });
  };

  // Update project integrations
  handlers['PUT /api/projects/:projectId/integrations'] = (req, res) => {
    const project = demoProjects.find(p => p._id === req.params.projectId);
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const { github, sentry, uptimeRobot } = req.body;
    if (github) project.integrations.github = { ...project.integrations.github, ...github };
    if (sentry) project.integrations.sentry = { ...project.integrations.sentry, ...sentry };
    if (uptimeRobot) project.integrations.uptimeRobot = { ...project.integrations.uptimeRobot, ...uptimeRobot };

    res.json({ success: true, data: project });
  };

  // INTEGRATIONS
  handlers['GET /api/integrations/:projectId'] = (req, res) => {
    const project = demoProjects.find(p => p._id === req.params.projectId);
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    res.json({ success: true, data: project.integrations });
  };

  // EVENTS
  handlers['GET /api/events'] = (req, res) => {
    const { workspaceId, severity, type, source, status, page = 1, limit = 30 } = req.query;
    let filtered = workspaceId ? demoEvents.filter(e => e.workspace === workspaceId) : demoEvents;

    if (severity) filtered = filtered.filter(e => e.severity === severity);
    if (type) filtered = filtered.filter(e => e.type === type);
    if (source) filtered = filtered.filter(e => e.source === source);
    if (status) filtered = filtered.filter(e => e.status === status);

    const total = filtered.length;
    const p = parseInt(page);
    const l = parseInt(limit);
    const paginated = filtered.slice((p - 1) * l, p * l);

    res.json({
      success: true,
      data: paginated,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  };

  handlers['GET /api/events/overview'] = (req, res) => {
    const wsId = req.query.workspaceId;
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recent = demoEvents.filter(e =>
      e.workspace === wsId && new Date(e.occurredAt).getTime() >= twentyFourHoursAgo
    );

    const critical = recent.filter(e => e.severity === 'critical').length;
    const warnings = recent.filter(e => e.severity === 'warning').length;
    const deploySuccess = recent.filter(e => e.type === 'deploy_success').length;
    const deployFailed = recent.filter(e => e.type === 'deploy_failed').length;
    const ciSuccess = recent.filter(e => e.type === 'ci_success').length;
    const ciFailure = recent.filter(e => e.type === 'ci_failure').length;
    const downtimeStarted = recent.filter(e => e.type === 'downtime_started').length;
    const downtimeResolved = recent.filter(e => e.type === 'downtime_resolved').length;
    const errors = recent.filter(e => e.type.startsWith('error_')).length;
    const totalDeploys = deploySuccess + deployFailed;
    const totalCI = ciSuccess + ciFailure;

    let health = 'green';
    if (critical > 0 || downtimeStarted > downtimeResolved) health = 'red';
    else if (warnings > 2 || deployFailed > 0) health = 'amber';

    res.json({
      success: true,
      data: {
        health,
        period: '24h',
        stats: {
          totalEvents: recent.length,
          critical,
          warnings,
          deploys: { total: totalDeploys, success: deploySuccess, failed: deployFailed, rate: totalDeploys ? Math.round((deploySuccess / totalDeploys) * 100) : 100 },
          ci: { total: totalCI, success: ciSuccess, failed: ciFailure, rate: totalCI ? Math.round((ciSuccess / totalCI) * 100) : 100 },
          errors,
          uptime: { downtimeStarted, downtimeResolved, currentlyDown: downtimeStarted > downtimeResolved },
        },
        recentEvents: recent.slice(0, 10),
      },
    });
  };

  handlers['GET /api/events/timeline'] = (req, res) => {
    const { workspaceId, days = 7 } = req.query;
    const startDate = Date.now() - parseInt(days) * 24 * 60 * 60 * 1000;
    const filtered = demoEvents.filter(e =>
      e.workspace === workspaceId && new Date(e.occurredAt).getTime() >= startDate
    );

    // Group by date + severity
    const bySeverityMap = {};
    const byTypeMap = {};

    filtered.forEach(e => {
      const date = new Date(e.occurredAt).toISOString().slice(0, 10);
      const sevKey = `${date}-${e.severity}`;
      const typeKey = `${date}-${e.type}`;

      if (!bySeverityMap[sevKey]) bySeverityMap[sevKey] = { _id: { date, severity: e.severity }, count: 0 };
      bySeverityMap[sevKey].count++;

      if (!byTypeMap[typeKey]) byTypeMap[typeKey] = { _id: { date, type: e.type }, count: 0 };
      byTypeMap[typeKey].count++;
    });

    res.json({
      success: true,
      data: {
        bySeverity: Object.values(bySeverityMap),
        byType: Object.values(byTypeMap),
      },
    });
  };

  handlers['PATCH /api/events/:eventId/status'] = (req, res) => {
    const event = demoEvents.find(e => e._id === req.params.eventId);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    event.status = req.body.status;
    if (req.body.status === 'resolved') event.resolvedAt = new Date().toISOString();
    res.json({ success: true, data: event });
  };

  handlers['GET /api/events/:eventId'] = (req, res) => {
    const event = demoEvents.find(e => e._id === req.params.eventId);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    res.json({ success: true, data: event });
  };

  // AI
  handlers['POST /api/ai/summarize/:eventId'] = (req, res) => {
    const event = demoEvents.find(e => e._id === req.params.eventId);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

    const summaryTemplates = {
      deploy_success: {
        summary: `Successful deployment detected for ${event.project?.name || 'project'}. The deployment completed without issues.`,
        possibleCause: 'Normal deployment lifecycle — code changes pushed and deployed successfully.',
        suggestedActions: ['Verify the deployed version in production', 'Monitor error rates for the next 30 minutes', 'Check deployment logs for any warnings'],
      },
      deploy_failed: {
        summary: `Deployment failure detected for ${event.project?.name || 'project'}. The deployment process encountered an error and did not complete.`,
        possibleCause: 'Potential causes include build errors, failed health checks, resource constraints, or configuration issues.',
        suggestedActions: ['Check deployment logs for error details', 'Verify environment variables and secrets', 'Roll back to last stable version if critical', 'Review recent code changes'],
      },
      ci_failure: {
        summary: `CI pipeline failed for ${event.project?.name || 'project'}. One or more workflow steps did not pass.`,
        possibleCause: 'Common causes include test failures, linting errors, build compilation errors, or dependency issues.',
        suggestedActions: ['Review failed test output', 'Check for dependency version conflicts', 'Verify build configuration'],
      },
      ci_success: {
        summary: `CI pipeline completed successfully for ${event.project?.name || 'project'}.`,
        possibleCause: 'All configured checks and tests passed.',
        suggestedActions: ['No immediate action needed', 'Proceed with deployment if applicable'],
      },
      error_new: {
        summary: `New error detected in ${event.project?.name || 'project'}. This error has not been seen before.`,
        possibleCause: 'Likely introduced by a recent code change or a new edge case scenario.',
        suggestedActions: ['Investigate the error stack trace', 'Correlate with recent deployments', 'Add error handling for the affected code path'],
      },
      error_spike: {
        summary: `Error spike detected in ${event.project?.name || 'project'}. Error volume has increased significantly.`,
        possibleCause: 'Potential causes include a bad deployment, infrastructure degradation, upstream service failure, or traffic surge.',
        suggestedActions: ['Check if a recent deployment correlates with the spike', 'Monitor system resources', 'Consider rolling back if tied to a deploy'],
      },
      error_regression: {
        summary: `Error regression detected in ${event.project?.name || 'project'}. A previously resolved error has reappeared.`,
        possibleCause: 'The fix for this error may have been reverted or bypassed by new code changes.',
        suggestedActions: ['Review git history for changes that may have reverted the fix', 'Re-apply the original fix', 'Add regression tests'],
      },
      downtime_started: {
        summary: `Downtime detected for ${event.project?.name || 'project'}. The service is currently unreachable.`,
        possibleCause: 'Possible causes include server crashes, network issues, DNS problems, certificate expiry, or resource exhaustion.',
        suggestedActions: ['Check server health and logs immediately', 'Verify network connectivity and DNS', 'Initiate incident response if downtime persists'],
      },
      downtime_resolved: {
        summary: `Downtime resolved for ${event.project?.name || 'project'}. The service is back online.`,
        possibleCause: 'The underlying issue has been resolved, or the service auto-recovered.',
        suggestedActions: ['Document the root cause', 'Review incident timeline', 'Update status page'],
      },
    };

    const template = summaryTemplates[event.type] || {
      summary: `Event "${event.title}" occurred.`,
      possibleCause: 'Analysis pending.',
      suggestedActions: ['Review event details'],
    };

    event.aiSummary = { ...template, generatedAt: new Date().toISOString() };
    res.json({ success: true, data: event.aiSummary });
  };

  handlers['GET /api/ai/digest'] = (req, res) => {
    const wsId = req.query.workspaceId;
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recent = demoEvents.filter(e =>
      e.workspace === wsId && new Date(e.occurredAt).getTime() >= twentyFourHoursAgo
    );

    const total = recent.length;
    const critical = recent.filter(e => e.severity === 'critical').length;
    const warnings = recent.filter(e => e.severity === 'warning').length;
    const deploys = recent.filter(e => e.type.startsWith('deploy_'));
    const deploySuccess = deploys.filter(e => e.type === 'deploy_success').length;
    const deployFailed = deploys.filter(e => e.type === 'deploy_failed').length;
    const errors = recent.filter(e => e.type.startsWith('error_'));
    const downtimeEvents = recent.filter(e => e.type.startsWith('downtime_'));

    let narrative = '';
    if (total === 0) {
      narrative = '🟢 All quiet — no events recorded in the last 24 hours. Systems are stable.';
    } else if (critical > 0) {
      narrative = `🔴 ${critical} critical event(s) detected. ${deployFailed > 0 ? `${deployFailed} deployment(s) failed. ` : ''}${errors.length > 0 ? `${errors.length} error event(s). ` : ''}Immediate attention recommended.`;
    } else if (deployFailed > 0 || warnings > 0) {
      narrative = `🟡 ${total} event(s) processed. ${warnings} warning(s) detected. Review recommended.`;
    } else {
      narrative = `🟢 Systems are healthy. ${total} event(s) processed with no critical issues.`;
    }

    const topIncidents = recent
      .filter(e => e.severity === 'critical' || e.severity === 'warning')
      .slice(0, 5)
      .map(e => ({ title: e.title, severity: e.severity, type: e.type, occurredAt: e.occurredAt }));

    res.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        period: 'Last 24 hours',
        summary: { totalEvents: total, critical, warnings, info: total - critical - warnings },
        deploys: {
          total: deploys.length, success: deploySuccess, failed: deployFailed,
          successRate: deploys.length > 0 ? Math.round((deploySuccess / deploys.length) * 100) : 100,
        },
        errors: {
          total: errors.length,
          new: errors.filter(e => e.type === 'error_new').length,
          spikes: errors.filter(e => e.type === 'error_spike').length,
          regressions: errors.filter(e => e.type === 'error_regression').length,
        },
        uptime: {
          downtimeEvents: downtimeEvents.length,
          currentlyDown: downtimeEvents.filter(e => e.type === 'downtime_started').length >
            downtimeEvents.filter(e => e.type === 'downtime_resolved').length,
        },
        topIncidents,
        narrative,
      },
    });
  };

  // WORKSPACE INVITE (mock)
  handlers['POST /api/workspaces/:workspaceId/invite'] = (req, res) => {
    const token = crypto.randomBytes(32).toString('hex');
    res.status(201).json({
      success: true,
      data: {
        message: `Invite sent to ${req.body.email}`,
        inviteToken: token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  };

  return handlers;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Express middleware: intercept requests in demo mode
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const handlers = createDemoRouter();

function matchRoute(method, url) {
  // Remove query string
  const path = url.split('?')[0];

  for (const [pattern, handler] of Object.entries(handlers)) {
    const [pMethod, pPath] = pattern.split(' ');
    if (pMethod !== method) continue;

    // Convert pattern like /api/events/:eventId to regex
    const paramNames = [];
    const regexStr = pPath.replace(/:(\w+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });

    const regex = new RegExp(`^${regexStr}$`);
    const match = path.match(regex);
    if (match) {
      const params = {};
      paramNames.forEach((name, i) => {
        params[name] = match[i + 1];
      });
      return { handler, params };
    }
  }
  return null;
}

export const demoMiddleware = (req, res, next) => {
  if (!isDemoMode()) return next();

  const match = matchRoute(req.method, req.originalUrl);
  if (match) {
    req.params = { ...req.params, ...match.params };
    return match.handler(req, res);
  }

  next();
};

export { isDemoMode, DEMO_WORKSPACE_ID };
