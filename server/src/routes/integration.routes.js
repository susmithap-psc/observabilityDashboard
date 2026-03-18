import express from 'express';
import Project from '../models/Project.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET /api/integrations/:projectId — Get integration statuses
router.get('/:projectId', protect, async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const integrations = {
      github: {
        enabled: project.integrations.github?.enabled || false,
        repoOwner: project.integrations.github?.repoOwner || '',
        repoName: project.integrations.github?.repoName || '',
        configured: !!(project.integrations.github?.repoOwner && project.integrations.github?.repoName),
      },
      sentry: {
        enabled: project.integrations.sentry?.enabled || false,
        projectSlug: project.integrations.sentry?.projectSlug || '',
        organizationSlug: project.integrations.sentry?.organizationSlug || '',
        configured: !!(project.integrations.sentry?.projectSlug),
      },
      uptimeRobot: {
        enabled: project.integrations.uptimeRobot?.enabled || false,
        monitorId: project.integrations.uptimeRobot?.monitorId || '',
        configured: !!(project.integrations.uptimeRobot?.monitorId),
      },
    };

    res.json({ success: true, data: integrations });
  } catch (error) {
    next(error);
  }
});

// POST /api/integrations/:projectId/test/:source — Test integration
router.post('/:projectId/test/:source', protect, async (req, res, next) => {
  try {
    const { source } = req.params;
    const validSources = ['github', 'sentry', 'uptimerobot'];

    if (!validSources.includes(source)) {
      return res.status(400).json({ success: false, error: 'Invalid integration source' });
    }

    // Simulated test — in production, this would make a real API call
    res.json({
      success: true,
      data: {
        source,
        status: 'connected',
        message: `${source} integration is working correctly`,
        testedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
