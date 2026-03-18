import express from 'express';
import Project from '../models/Project.js';
import { protect, authorize } from '../middleware/auth.js';
import { loadWorkspace } from '../middleware/workspace.js';

const router = express.Router();

// POST /api/projects — Create project
router.post('/', protect, async (req, res, next) => {
  try {
    const { name, description, workspaceId } = req.body;
    req.params.workspaceId = workspaceId;

    if (!name || !workspaceId) {
      return res.status(400).json({ success: false, error: 'Name and workspaceId are required' });
    }

    // Manually load workspace for authorization
    const loadWS = loadWorkspace;
    req.body.workspaceId = workspaceId;
    
    const project = await Project.create({
      name,
      description: description || '',
      workspace: workspaceId,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects?workspaceId=xxx — List projects
router.get('/', protect, async (req, res, next) => {
  try {
    const { workspaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ success: false, error: 'workspaceId query parameter is required' });
    }

    const projects = await Project.find({ workspace: workspaceId })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:projectId — Get project details
router.get('/:projectId', protect, async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

// PUT /api/projects/:projectId — Update project
router.put('/:projectId', protect, async (req, res, next) => {
  try {
    const { name, description, status } = req.body;
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (status) project.status = status;

    await project.save();
    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

// PUT /api/projects/:projectId/integrations — Update integration settings
router.put('/:projectId/integrations', protect, async (req, res, next) => {
  try {
    const { github, sentry, uptimeRobot } = req.body;
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    if (github) project.integrations.github = { ...project.integrations.github, ...github };
    if (sentry) project.integrations.sentry = { ...project.integrations.sentry, ...sentry };
    if (uptimeRobot) project.integrations.uptimeRobot = { ...project.integrations.uptimeRobot, ...uptimeRobot };

    await project.save();
    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/projects/:projectId
router.delete('/:projectId', protect, async (req, res, next) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, data: { message: 'Project deleted' } });
  } catch (error) {
    next(error);
  }
});

export default router;
