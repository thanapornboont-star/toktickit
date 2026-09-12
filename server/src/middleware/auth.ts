import { Request, Response, NextFunction } from "express";
import { User, Role } from "@prisma/client";
import { findUserBySessionToken } from "../services/auth.js";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionToken?: string;
    }
  }
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication token is required.",
      },
    });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1]) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Malformed authorization header. Format must be 'Bearer <token>'.",
      },
    });
  }

  const token = parts[1];
  try {
    const user = await findUserBySessionToken(token);
    if (!user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid or expired session token.",
        },
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: {
          code: "ACCOUNT_DEACTIVATED",
          message: "Account is deactivated. Please contact an administrator.",
        },
      });
    }

    req.user = user;
    req.sessionToken = token;
    next();
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to authenticate session.",
      },
    });
  }
}

export function requirePasswordChangeCompleted(req: Request, res: Response, next: NextFunction) {
  if (req.user && req.user.mustChangePassword) {
    return res.status(403).json({
      error: {
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "Password change is required before accessing application resources.",
      },
    });
  }
  next();
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required.",
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Access denied: insufficient permissions for role.",
        },
      });
    }

    next();
  };
}
