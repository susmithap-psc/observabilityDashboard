import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    default: '',
    maxlength: 500,
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  },
  status: {
    type: String,
    enum: ['healthy', 'degraded', 'critical', 'unknown'],
    default: 'unknown',
  },
  integrations: {
    github: {
      enabled: { type: Boolean, default: false },
      repoOwner: String,
      repoName: String,
      webhookSecret: String,
      accessToken: { type: String, select: false },
    },
    sentry: {
      enabled: { type: Boolean, default: false },
      projectSlug: String,
      organizationSlug: String,
      dsn: String,
      webhookSecret: String,
      authToken: { type: String, select: false },
    },
    uptimeRobot: {
      enabled: { type: Boolean, default: false },
      monitorId: String,
      apiKey: { type: String, select: false },
      webhookSecret: String,
    },
  },
  alertRules: [{
    name: String,
    source: { type: String, enum: ['github', 'sentry', 'uptimerobot'] },
    condition: String,
    severity: { type: String, enum: ['info', 'warning', 'critical'] },
    enabled: { type: Boolean, default: true },
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

projectSchema.index({ workspace: 1 });
projectSchema.index({ workspace: 1, name: 1 }, { unique: true });

export default mongoose.model('Project', projectSchema);
