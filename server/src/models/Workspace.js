import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: {
    type: String,
    enum: ['owner', 'admin', 'viewer'],
    default: 'viewer',
  },
  joinedAt: { type: Date, default: Date.now },
});

const inviteSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true },
  role: {
    type: String,
    enum: ['admin', 'viewer'],
    default: 'viewer',
  },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired'],
    default: 'pending',
  },
});

const workspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Workspace name is required'],
    trim: true,
    maxlength: 100,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  description: {
    type: String,
    default: '',
    maxlength: 500,
  },
  members: [memberSchema],
  invites: [inviteSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

workspaceSchema.index({ 'members.user': 1 });
workspaceSchema.index({ slug: 1 });

workspaceSchema.methods.getMemberRole = function (userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

workspaceSchema.methods.isOwnerOrAdmin = function (userId) {
  const role = this.getMemberRole(userId);
  return role === 'owner' || role === 'admin';
};

export default mongoose.model('Workspace', workspaceSchema);
