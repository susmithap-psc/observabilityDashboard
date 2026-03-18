import express from 'express';
import crypto from 'crypto';
import Event from '../models/Event.js';
import Project from '../models/Project.js';

const router = express.Router();

// Utility: generate fingerprint for deduplication
const generateFingerprint = (source, type, identifier) => {
  return crypto.createHash('sha256').update(`${source}:${type}:${identifier}`).digest('hex').substring(0, 32);
};

// Severity mapping
const getSeverity = (type) => {
  const criticalTypes = ['deploy_failed', 'downtime_started', 'error_spike'];
  const warningTypes = ['ci_failure', 'error_regression', 'error_new'];
  if (criticalTypes.includes(type)) return 'critical';
  if (warningTypes.includes(type)) return 'warning';
  return 'info';
};

// POST /api/webhooks/github/:projectId — GitHub webhook
router.post('/github/:projectId', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId).select('+integrations.github.webhookSecret');
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Verify HMAC signature if configured
    if (project.integrations.github?.webhookSecret) {
      const signature = req.headers['x-hub-signature-256'];
      const body = JSON.stringify(req.body);
      const expected = 'sha256=' + crypto.createHmac('sha256', project.integrations.github.webhookSecret)
        .update(body).digest('hex');

      if (signature !== expected) {
        return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
      }
    }

    const githubEvent = req.headers['x-github-event'];
    const payload = req.body;
    let eventData = null;

    // Handle different GitHub events
    if (githubEvent === 'workflow_run') {
      const { workflow_run } = payload;
      const isSuccess = workflow_run.conclusion === 'success';
      const type = isSuccess ? 'ci_success' : 'ci_failure';

      eventData = {
        type,
        title: `${isSuccess ? '✅' : '❌'} CI: ${workflow_run.name} — ${workflow_run.conclusion}`,
        description: `Workflow "${workflow_run.name}" ${workflow_run.conclusion} on branch ${workflow_run.head_branch}`,
        metadata: {
          workflowName: workflow_run.name,
          branch: workflow_run.head_branch,
          conclusion: workflow_run.conclusion,
          runUrl: workflow_run.html_url,
          commitSha: workflow_run.head_sha,
          actor: workflow_run.actor?.login,
        },
        identifier: `workflow-${workflow_run.id}`,
      };
    } else if (githubEvent === 'deployment_status') {
      const { deployment_status, deployment } = payload;
      const isSuccess = deployment_status.state === 'success';
      const type = isSuccess ? 'deploy_success' : 'deploy_failed';

      eventData = {
        type,
        title: `${isSuccess ? '🚀' : '💥'} Deploy: ${deployment_status.state}`,
        description: `Deployment to ${deployment_status.environment} — ${deployment_status.state}`,
        metadata: {
          environment: deployment_status.environment,
          state: deployment_status.state,
          deployUrl: deployment_status.target_url,
          creator: deployment.creator?.login,
        },
        identifier: `deploy-${deployment.id}-${deployment_status.id}`,
      };
    } else if (githubEvent === 'push') {
      const { commits, ref, pusher } = payload;
      eventData = {
        type: 'deploy_success',
        title: `📦 Push: ${commits?.length || 0} commit(s) to ${ref}`,
        description: commits?.map(c => c.message).join('; ') || 'Push event',
        metadata: {
          ref,
          pusher: pusher?.name,
          commits: commits?.length || 0,
          headCommit: payload.head_commit?.id,
        },
        identifier: `push-${payload.after}`,
      };
    }

    if (!eventData) {
      return res.json({ success: true, data: { message: 'Event type not tracked' } });
    }

    const fingerprint = generateFingerprint('github', eventData.type, eventData.identifier);

    // Deduplication
    const existing = await Event.findOne({ fingerprint, workspace: project.workspace });
    if (existing) {
      return res.json({ success: true, data: { message: 'Duplicate event — skipped', eventId: existing._id } });
    }

    const event = await Event.create({
      fingerprint,
      type: eventData.type,
      severity: getSeverity(eventData.type),
      source: 'github',
      project: project._id,
      workspace: project.workspace,
      title: eventData.title,
      description: eventData.description,
      metadata: eventData.metadata,
      occurredAt: new Date(),
    });

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
});

// POST /api/webhooks/sentry/:projectId — Sentry webhook
router.post('/sentry/:projectId', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const payload = req.body;
    const action = payload.action || 'created';

    let type = 'error_new';
    if (action === 'regression') type = 'error_regression';
    if (payload.data?.issue?.numComments > 5 || payload.data?.issue?.count > 100) type = 'error_spike';

    const issue = payload.data?.issue || {};

    const eventData = {
      type,
      title: `🐛 Sentry: ${issue.title || 'New Error'}`,
      description: issue.culprit || issue.message || 'Error detected by Sentry',
      metadata: {
        issueId: issue.id,
        level: issue.level,
        platform: issue.platform,
        count: issue.count,
        firstSeen: issue.firstSeen,
        lastSeen: issue.lastSeen,
        issueUrl: issue.permalink,
        culprit: issue.culprit,
      },
      identifier: `sentry-${issue.id || Date.now()}`,
    };

    const fingerprint = generateFingerprint('sentry', eventData.type, eventData.identifier);

    const existing = await Event.findOne({ fingerprint, workspace: project.workspace });
    if (existing) {
      return res.json({ success: true, data: { message: 'Duplicate event — skipped' } });
    }

    const event = await Event.create({
      fingerprint,
      type: eventData.type,
      severity: getSeverity(eventData.type),
      source: 'sentry',
      project: project._id,
      workspace: project.workspace,
      title: eventData.title,
      description: eventData.description,
      metadata: eventData.metadata,
      occurredAt: new Date(),
    });

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
});

// POST /api/webhooks/uptimerobot/:projectId — UptimeRobot webhook
router.post('/uptimerobot/:projectId', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const payload = req.body;
    const isDown = payload.alertType === '1' || payload.alertTypeFriendlyName === 'Down';
    const type = isDown ? 'downtime_started' : 'downtime_resolved';

    const eventData = {
      type,
      title: `${isDown ? '🔴' : '🟢'} Uptime: ${payload.monitorFriendlyName || 'Monitor'} is ${isDown ? 'DOWN' : 'UP'}`,
      description: `Monitor "${payload.monitorFriendlyName}" ${isDown ? 'went down' : 'recovered'}. URL: ${payload.monitorURL || 'N/A'}`,
      metadata: {
        monitorId: payload.monitorID,
        monitorName: payload.monitorFriendlyName,
        monitorUrl: payload.monitorURL,
        alertType: payload.alertTypeFriendlyName,
        alertDuration: payload.alertDuration,
        alertDetails: payload.alertDetails,
      },
      identifier: `uptime-${payload.monitorID}-${payload.alertID || Date.now()}`,
    };

    const fingerprint = generateFingerprint('uptimerobot', eventData.type, eventData.identifier);

    const existing = await Event.findOne({ fingerprint, workspace: project.workspace });
    if (existing) {
      return res.json({ success: true, data: { message: 'Duplicate event — skipped' } });
    }

    const event = await Event.create({
      fingerprint,
      type: eventData.type,
      severity: getSeverity(eventData.type),
      source: 'uptimerobot',
      project: project._id,
      workspace: project.workspace,
      title: eventData.title,
      description: eventData.description,
      metadata: eventData.metadata,
      occurredAt: new Date(),
    });

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
});

// POST /api/webhooks/ingest — Generic event ingestion (from n8n agents)
router.post('/ingest', async (req, res, next) => {
  try {
    const { type, source, projectId, title, description, metadata, severity, occurredAt } = req.body;

    if (!type || !source || !projectId || !title) {
      return res.status(400).json({ success: false, error: 'type, source, projectId, and title are required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const identifier = `${source}-${type}-${Date.now()}`;
    const fingerprint = generateFingerprint(source, type, identifier);

    const event = await Event.create({
      fingerprint,
      type,
      severity: severity || getSeverity(type),
      source,
      project: project._id,
      workspace: project.workspace,
      title,
      description: description || '',
      metadata: metadata || {},
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
    });

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
});

export default router;
