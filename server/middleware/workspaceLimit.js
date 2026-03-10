import Workspace from '../models/Workspace.js';
import ContactCard from '../models/ContactCard.js';

export const checkPlanLimits = async (req, res, next) => {
  try {
    const user = req.user; // Set by protect middleware

    if (!user || !user.workspaceId) {
      return res.status(401).json({ success: false, message: 'Not authorized or no workspace found' });
    }

    const workspace = await Workspace.findById(user.workspaceId);

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    // Check if 30 days have passed to reset leads
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (workspace.lastLeadsReset < thirtyDaysAgo) {
      workspace.leadsThisMonth = 0;
      workspace.lastLeadsReset = new Date();
      await workspace.save();
    }

    // Attach workspace to request so routes can use the current limits
    req.workspace = workspace;
    next();
  } catch (error) {
    console.error("Workspace limit check error:", error);
    res.status(500).json({ success: false, message: 'Server error checking limits' });
  }
};

export const enforceLinkLimit = async (req, res, next) => {
  if (req.workspace && req.workspace.plan === 'free') {
    if (req.workspace.dmLinksUsed >= 1) {
      return res.status(403).json({
        success: false,
        message: 'Free plan limit reached: Maximum 50 DM links allowed. Please upgrade to Growth plan.'
      });
    }
  }
  next();
};

export const enforceLeadLimit = async (req, res, next) => {
  if (req.workspace && req.workspace.plan === 'free') {
    if (req.workspace.leadsThisMonth >= 2) {
      return res.status(403).json({
        success: false,
        message: 'Free plan limit reached: Maximum 100 leads per month allowed. Please upgrade to Growth plan.'
      });
    }
  }
  next();
};

export const enforceFormLimit = async (req, res, next) => {
  try {
    if (req.workspace && req.workspace.plan === 'free') {
      if (req.workspace.formsUsed >= 2) {
        return res.status(403).json({
          success: false,
          message: 'Free plan limit reached: Maximum 2 forms allowed. Please upgrade to Growth plan.'
        });
      }
    }
    next();
  } catch (error) {
    console.error("Form limit check error:", error);
    res.status(500).json({ success: false, message: 'Server error checking limits' });
  }
};

export const enforceContactCardLimit = async (req, res, next) => {
  try {
    if (req.workspace && req.workspace.plan === 'free') {
      if (req.workspace.profileCardsUsed >= 5) {
        return res.status(403).json({
          success: false,
          message: 'Free plan limit reached: Maximum 5 profile cards allowed. Please upgrade to Growth plan.'
        });
      }
    }
    next();
  } catch (error) {
    console.error("Contact card limit check error:", error);
    res.status(500).json({ success: false, message: 'Server error checking limits' });
  }
};
