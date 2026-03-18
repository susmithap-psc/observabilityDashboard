import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check httpOnly cookie
    else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authorized — no token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, error: 'User no longer exists' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Not authorized — invalid token' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.workspace) {
      return res.status(500).json({ success: false, error: 'Workspace not loaded' });
    }

    const memberRole = req.workspace.getMemberRole(req.user._id);
    if (!memberRole) {
      return res.status(403).json({ success: false, error: 'Not a member of this workspace' });
    }

    if (!roles.includes(memberRole)) {
      return res.status(403).json({
        success: false,
        error: `Role '${memberRole}' is not authorized for this action`,
      });
    }

    req.memberRole = memberRole;
    next();
  };
};
