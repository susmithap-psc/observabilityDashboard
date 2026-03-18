import express from 'express';
import crypto from 'crypto';
import Workspace from '../models/Workspace.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { loadWorkspace } from '../middleware/workspace.js';

const router = express.Router();

// POST /api/workspaces — Create workspace
router.post('/', protect, async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Workspace name is required' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existingSlug = await Workspace.findOne({ slug });
    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

    const workspace = await Workspace.create({
      name,
      slug: finalSlug,
      description: description || '',
      members: [{ user: req.user._id, role: 'owner' }],
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: workspace });
  } catch (error) {
    next(error);
  }
});

// GET /api/workspaces — List user's workspaces
router.get('/', protect, async (req, res, next) => {
  try {
    const workspaces = await Workspace.find({ 'members.user': req.user._id })
      .populate('members.user', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: workspaces });
  } catch (error) {
    next(error);
  }
});

// GET /api/workspaces/:workspaceId — Get workspace details
router.get('/:workspaceId', protect, loadWorkspace, async (req, res) => {
  const workspace = await Workspace.findById(req.workspace._id)
    .populate('members.user', 'name email avatar');
  res.json({ success: true, data: workspace });
});

// PUT /api/workspaces/:workspaceId — Update workspace
router.put('/:workspaceId', protect, loadWorkspace, authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const workspace = req.workspace;

    if (name) workspace.name = name;
    if (description !== undefined) workspace.description = description;

    await workspace.save();
    res.json({ success: true, data: workspace });
  } catch (error) {
    next(error);
  }
});

// POST /api/workspaces/:workspaceId/invite — Invite a team member
router.post('/:workspaceId/invite', protect, loadWorkspace, authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const validRoles = ['admin', 'viewer'];
    const inviteRole = validRoles.includes(role) ? role : 'viewer';

    // Check if already a member
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const isMember = req.workspace.members.some(m => m.user.toString() === existingUser._id.toString());
      if (isMember) {
        return res.status(400).json({ success: false, error: 'User is already a member' });
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    req.workspace.invites.push({
      email,
      role: inviteRole,
      invitedBy: req.user._id,
      token,
      expiresAt,
    });

    await req.workspace.save();

    res.status(201).json({
      success: true,
      data: {
        message: `Invite sent to ${email}`,
        inviteToken: token,
        expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/workspaces/join/:token — Accept invite
router.post('/join/:token', protect, async (req, res, next) => {
  try {
    const workspace = await Workspace.findOne({
      'invites.token': req.params.token,
      'invites.status': 'pending',
    });

    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Invalid or expired invite' });
    }

    const invite = workspace.invites.find(
      i => i.token === req.params.token && i.status === 'pending'
    );

    if (!invite || invite.expiresAt < new Date()) {
      if (invite) invite.status = 'expired';
      await workspace.save();
      return res.status(400).json({ success: false, error: 'Invite has expired' });
    }

    // Check email match
    if (invite.email !== req.user.email) {
      return res.status(403).json({ success: false, error: 'Invite was sent to a different email' });
    }

    // Add member
    workspace.members.push({ user: req.user._id, role: invite.role });
    invite.status = 'accepted';
    await workspace.save();

    res.json({ success: true, data: { message: `Joined workspace: ${workspace.name}` } });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/workspaces/:workspaceId/members/:userId — Remove member
router.delete('/:workspaceId/members/:userId', protect, loadWorkspace, authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const targetUserId = req.params.userId;
    const targetRole = req.workspace.getMemberRole(targetUserId);

    if (!targetRole) {
      return res.status(404).json({ success: false, error: 'User is not a member' });
    }

    if (targetRole === 'owner') {
      return res.status(403).json({ success: false, error: 'Cannot remove the owner' });
    }

    req.workspace.members = req.workspace.members.filter(
      m => m.user.toString() !== targetUserId
    );
    await req.workspace.save();

    res.json({ success: true, data: { message: 'Member removed' } });
  } catch (error) {
    next(error);
  }
});

export default router;
