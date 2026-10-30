import { Request, Response, NextFunction } from 'express';

export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.workspaceMembership) {
      res.status(403).json({
        success: false,
        message: 'Workspace context missing.',
      });
      return;
    }

    if (!allowedRoles.includes(req.workspaceMembership.role)) {
      res.status(403).json({
        success: false,
        message: `Action restricted to roles: ${allowedRoles.join(', ')}. Current role is ${req.workspaceMembership.role}.`,
      });
      return;
    }

    next();
  };
};

export const requirePermission = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.workspaceMembership) {
      res.status(403).json({
        success: false,
        message: 'Workspace context missing.',
      });
      return;
    }

    // Owner has wildcard permission
    if (req.workspaceMembership.role === 'owner' || req.workspaceMembership.permissions.includes('*')) {
      next();
      return;
    }

    const hasAll = requiredPermissions.every((perm) =>
      req.workspaceMembership!.permissions.includes(perm)
    );

    if (!hasAll) {
      res.status(403).json({
        success: false,
        message: `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      });
      return;
    }

    next();
  };
};

