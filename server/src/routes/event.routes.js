import express from 'express';
import mongoose from 'mongoose';
import Event from '../models/Event.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET /api/events?workspaceId=xxx — List events (Events Inbox)
router.get('/', protect, async (req, res, next) => {
  try {
    const {
      workspaceId,
      projectId,
      severity,
      type,
      source,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ success: false, error: 'workspaceId is required' });
    }

    const query = { workspace: workspaceId };

    if (projectId) query.project = projectId;
    if (severity) query.severity = severity;
    if (type) query.type = type;
    if (source) query.source = source;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.occurredAt = {};
      if (startDate) query.occurredAt.$gte = new Date(startDate);
      if (endDate) query.occurredAt.$lte = new Date(endDate);
    }

    const total = await Event.countDocuments(query);
    const events = await Event.find(query)
      .populate('project', 'name')
      .sort({ occurredAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/events/overview?workspaceId=xxx — Dashboard overview (24hr stats)
router.get('/overview', protect, async (req, res, next) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: 'workspaceId is required' });
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const baseQuery = { workspace: workspaceId, occurredAt: { $gte: twentyFourHoursAgo } };

    const [
      totalEvents,
      criticalEvents,
      warningEvents,
      deploySuccess,
      deployFailed,
      ciSuccess,
      ciFailure,
      downtimeStarted,
      downtimeResolved,
      errorEvents,
      recentEvents,
    ] = await Promise.all([
      Event.countDocuments(baseQuery),
      Event.countDocuments({ ...baseQuery, severity: 'critical' }),
      Event.countDocuments({ ...baseQuery, severity: 'warning' }),
      Event.countDocuments({ ...baseQuery, type: 'deploy_success' }),
      Event.countDocuments({ ...baseQuery, type: 'deploy_failed' }),
      Event.countDocuments({ ...baseQuery, type: 'ci_success' }),
      Event.countDocuments({ ...baseQuery, type: 'ci_failure' }),
      Event.countDocuments({ ...baseQuery, type: 'downtime_started' }),
      Event.countDocuments({ ...baseQuery, type: 'downtime_resolved' }),
      Event.countDocuments({ ...baseQuery, type: { $in: ['error_new', 'error_spike', 'error_regression'] } }),
      Event.find(baseQuery).sort({ occurredAt: -1 }).limit(10).populate('project', 'name'),
    ]);

    const totalDeploys = deploySuccess + deployFailed;
    const totalCI = ciSuccess + ciFailure;

    // Health calculation
    let healthStatus = 'green';
    if (criticalEvents > 0 || downtimeStarted > downtimeResolved) healthStatus = 'red';
    else if (warningEvents > 2 || deployFailed > 0) healthStatus = 'amber';

    res.json({
      success: true,
      data: {
        health: healthStatus,
        period: '24h',
        stats: {
          totalEvents,
          critical: criticalEvents,
          warnings: warningEvents,
          deploys: { total: totalDeploys, success: deploySuccess, failed: deployFailed, rate: totalDeploys ? Math.round((deploySuccess / totalDeploys) * 100) : 100 },
          ci: { total: totalCI, success: ciSuccess, failed: ciFailure, rate: totalCI ? Math.round((ciSuccess / totalCI) * 100) : 100 },
          errors: errorEvents,
          uptime: { downtimeStarted, downtimeResolved, currentlyDown: downtimeStarted > downtimeResolved },
        },
        recentEvents,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/events/timeline?workspaceId=xxx — Event timeline for charts
router.get('/timeline', protect, async (req, res, next) => {
  try {
    const { workspaceId, days = 7 } = req.query;
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: 'workspaceId is required' });
    }

    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const timeline = await Event.aggregate([
      {
        $match: {
          workspace: new mongoose.Types.ObjectId(workspaceId),
          occurredAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$occurredAt' } },
            severity: '$severity',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    // Also get by type
    const byType = await Event.aggregate([
      {
        $match: {
          workspace: new mongoose.Types.ObjectId(workspaceId),
          occurredAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$occurredAt' } },
            type: '$type',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    res.json({
      success: true,
      data: { bySeverity: timeline, byType },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/events/:eventId/status — Update event status
router.patch('/:eventId/status', protect, async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['open', 'acknowledged', 'resolved', 'ignored'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const update = { status };
    if (status === 'acknowledged') update.acknowledgedBy = req.user._id;
    if (status === 'resolved') update.resolvedAt = new Date();

    const event = await Event.findByIdAndUpdate(req.params.eventId, update, { new: true });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    res.json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
});

// GET /api/events/:eventId — Get single event
router.get('/:eventId', protect, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId).populate('project', 'name');

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    res.json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
});

export default router;
