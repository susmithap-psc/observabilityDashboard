import express from 'express';
import Event from '../models/Event.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// POST /api/ai/summarize/:eventId — Generate AI summary for an event
router.post('/summarize/:eventId', protect, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId).populate('project', 'name');
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    // AI Summary generation (simulated — in production, this calls Claude/LLM via MCP)
    const summary = generateAISummary(event);

    event.aiSummary = {
      summary: summary.summary,
      possibleCause: summary.possibleCause,
      suggestedActions: summary.suggestedActions,
      generatedAt: new Date(),
    };

    await event.save();

    res.json({ success: true, data: event.aiSummary });
  } catch (error) {
    next(error);
  }
});

// GET /api/ai/digest?workspaceId=xxx — Daily AI digest
router.get('/digest', protect, async (req, res, next) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: 'workspaceId is required' });
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const events = await Event.find({
      workspace: workspaceId,
      occurredAt: { $gte: twentyFourHoursAgo },
    }).populate('project', 'name');

    const digest = generateDailyDigest(events);

    res.json({ success: true, data: digest });
  } catch (error) {
    next(error);
  }
});

// --- AI helpers (simulated — replace with actual LLM calls in production) ---

function generateAISummary(event) {
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
      suggestedActions: ['Review failed test output', 'Check for dependency version conflicts', 'Verify build configuration', 'Re-run pipeline after fixes'],
    },
    ci_success: {
      summary: `CI pipeline completed successfully for ${event.project?.name || 'project'}.`,
      possibleCause: 'All configured checks and tests passed.',
      suggestedActions: ['No immediate action needed', 'Proceed with deployment if applicable'],
    },
    error_new: {
      summary: `New error detected in ${event.project?.name || 'project'}. This error has not been seen before.`,
      possibleCause: 'Likely introduced by a recent code change or a new edge case scenario.',
      suggestedActions: ['Investigate the error stack trace', 'Correlate with recent deployments', 'Add error handling for the affected code path', 'Set up alerting if error frequency increases'],
    },
    error_spike: {
      summary: `Error spike detected in ${event.project?.name || 'project'}. Error volume has increased significantly.`,
      possibleCause: 'Potential causes include a bad deployment, infrastructure degradation, upstream service failure, or traffic surge.',
      suggestedActions: ['Check if a recent deployment correlates with the spike', 'Monitor system resources', 'Consider rolling back if tied to a deploy', 'Investigate error details and affected users'],
    },
    error_regression: {
      summary: `Error regression detected in ${event.project?.name || 'project'}. A previously resolved error has reappeared.`,
      possibleCause: 'The fix for this error may have been reverted or bypassed by new code changes.',
      suggestedActions: ['Review git history for changes that may have reverted the fix', 'Re-apply the original fix', 'Add regression tests'],
    },
    downtime_started: {
      summary: `Downtime detected for ${event.project?.name || 'project'}. The service is currently unreachable.`,
      possibleCause: 'Possible causes include server crashes, network issues, DNS problems, certificate expiry, or resource exhaustion.',
      suggestedActions: ['Check server health and logs immediately', 'Verify network connectivity and DNS resolution', 'Check hosting provider status', 'Initiate incident response if downtime persists'],
    },
    downtime_resolved: {
      summary: `Downtime resolved for ${event.project?.name || 'project'}. The service is back online.`,
      possibleCause: 'The underlying issue has been resolved, or the service auto-recovered.',
      suggestedActions: ['Document the root cause', 'Review incident timeline', 'Add monitoring for the failure mode', 'Update status page'],
    },
  };

  return summaryTemplates[event.type] || {
    summary: `Event "${event.title}" occurred in ${event.project?.name || 'project'}.`,
    possibleCause: 'Analysis pending — insufficient data to determine cause.',
    suggestedActions: ['Review event details', 'Monitor for related events'],
  };
}

function generateDailyDigest(events) {
  const totalEvents = events.length;
  const critical = events.filter(e => e.severity === 'critical').length;
  const warnings = events.filter(e => e.severity === 'warning').length;
  const deploys = events.filter(e => e.type.startsWith('deploy_'));
  const deploySuccess = deploys.filter(e => e.type === 'deploy_success').length;
  const deployFailed = deploys.filter(e => e.type === 'deploy_failed').length;
  const errors = events.filter(e => e.type.startsWith('error_'));
  const downtimeEvents = events.filter(e => e.type.startsWith('downtime_'));

  const topIncidents = events
    .filter(e => e.severity === 'critical' || e.severity === 'warning')
    .slice(0, 5)
    .map(e => ({ title: e.title, severity: e.severity, type: e.type, occurredAt: e.occurredAt }));

  return {
    generatedAt: new Date().toISOString(),
    period: 'Last 24 hours',
    summary: {
      totalEvents,
      critical,
      warnings,
      info: totalEvents - critical - warnings,
    },
    deploys: {
      total: deploys.length,
      success: deploySuccess,
      failed: deployFailed,
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
    narrative: generateNarrative(totalEvents, critical, deployFailed, errors.length, downtimeEvents),
  };
}

function generateNarrative(total, critical, deployFailed, errors, downtimeEvents) {
  if (total === 0) return '🟢 All quiet — no events recorded in the last 24 hours. Systems are stable.';

  let narrative = '';

  if (critical > 0) {
    narrative += `⚠️ ${critical} critical event(s) detected. `;
  }
  if (deployFailed > 0) {
    narrative += `${deployFailed} deployment(s) failed. `;
  }
  if (errors > 0) {
    narrative += `${errors} error event(s) recorded. `;
  }
  if (downtimeEvents.length > 0) {
    narrative += `${downtimeEvents.length} uptime event(s) logged. `;
  }

  if (critical === 0 && deployFailed === 0) {
    narrative = `🟢 Systems are healthy. ${total} event(s) processed with no critical issues.`;
  } else if (critical > 0) {
    narrative = '🔴 ' + narrative + 'Immediate attention recommended.';
  } else {
    narrative = '🟡 ' + narrative + 'Review recommended.';
  }

  return narrative;
}

export default router;
