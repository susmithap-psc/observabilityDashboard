import Workspace from '../models/Workspace.js';

export const loadWorkspace = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({ success: false, error: 'Workspace ID is required' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found' });
    }

    // Tenant isolation: ensure user is a member
    const memberRole = workspace.getMemberRole(req.user._id);
    if (!memberRole) {
      return res.status(403).json({ success: false, error: 'Access denied — not a member of this workspace' });
    }

    req.workspace = workspace;
    req.memberRole = memberRole;
    next();
  } catch (error) {
    next(error);
  }
};
