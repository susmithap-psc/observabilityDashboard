import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  // Identity
  fingerprint: {
    type: String,
    required: true,
    index: true,
  },
  
  // Classification
  type: {
    type: String,
    required: true,
    enum: [
      'deploy_success', 'deploy_failed',
      'ci_success', 'ci_failure',
      'error_new', 'error_spike', 'error_regression',
      'downtime_started', 'downtime_resolved',
      'uptime_check',
    ],
  },
  severity: {
    type: String,
    required: true,
    enum: ['info', 'warning', 'critical'],
    default: 'info',
  },
  source: {
    type: String,
    required: true,
    enum: ['github', 'sentry', 'uptimerobot', 'manual', 'system'],
  },

  // Relations
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  },

  // Content
  title: {
    type: String,
    required: true,
    maxlength: 300,
  },
  description: {
    type: String,
    default: '',
    maxlength: 2000,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  // Status
  status: {
    type: String,
    enum: ['open', 'acknowledged', 'resolved', 'ignored'],
    default: 'open',
  },
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,

  // AI
  aiSummary: {
    summary: String,
    possibleCause: String,
    suggestedActions: [String],
    generatedAt: Date,
  },

  // Timestamps
  occurredAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
}, { timestamps: true });

// Compound indexes for efficient querying
eventSchema.index({ workspace: 1, occurredAt: -1 });
eventSchema.index({ project: 1, occurredAt: -1 });
eventSchema.index({ workspace: 1, severity: 1 });
eventSchema.index({ workspace: 1, type: 1 });
eventSchema.index({ fingerprint: 1, workspace: 1 }, { unique: true });

export default mongoose.model('Event', eventSchema);
