import { Request, Response, NextFunction } from "express";
import { User, Role } from "@prisma/client";
import { findUserBySessionToken } from "../services/auth.js";
import { getPrisma } from "../prisma.js";

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
          message: "Access denied: insufficient permissions for role",
        },
      });
    }

    next();
  };
}

export async function authenticateSessionOrDev(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header("Authorization");
  if (authHeader) {
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

      if (user.mustChangePassword) {
        return res.status(403).json({
          error: {
            code: "PASSWORD_CHANGE_REQUIRED",
            message: "Password change is required before accessing application resources.",
          },
        });
      }

      req.user = user;
      req.sessionToken = token;
      req.devRequester = {
        id: user.id,
        name: user.name,
        email: user.email,
        department: "General",
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      return next();
    } catch (error) {
      return res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to authenticate session.",
        },
      });
    }
  }

  // Fallback to X-Dev-Requester-Id for Lab 2 test suite compatibility
  const rawId = req.header("X-Dev-Requester-Id");
  if (rawId) {
    const requesterId = parseInt(rawId, 10);
    if (isNaN(requesterId) || requesterId <= 0) {
      return res.status(400).json({
        error: {
          code: "INVALID_REQUESTER_ID",
          message: "Header 'X-Dev-Requester-Id' must be a valid positive integer.",
        },
      });
    }

    try {
      const prisma = getPrisma();
      const requester = await prisma.devRequester.findUnique({
        where: { id: requesterId },
      });

      if (!requester) {
        return res.status(404).json({
          error: {
            code: "REQUESTER_NOT_FOUND",
            message: `Development requester with ID ${requesterId} was not found.`,
          },
        });
      }

      if (!requester.isActive) {
        return res.status(403).json({
          error: {
            code: "INACTIVE_REQUESTER",
            message: `Development requester '${requester.name}' is inactive and cannot perform operations.`,
          },
        });
      }

      req.devRequester = requester;
      const user = await prisma.user.findUnique({ where: { email: requester.email } });
      if (user) {
        req.user = user;
      } else {
        req.user = {
          id: requester.id,
          email: requester.email,
          name: requester.name,
          passwordHash: "",
          role: Role.REQUESTER,
          isActive: requester.isActive,
          mustChangePassword: false,
          createdAt: requester.createdAt,
          updatedAt: requester.updatedAt,
        };
      }
      return next();
    } catch (error) {
      return res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to authenticate development requester.",
        },
      });
    }
  }

  // Missing authentication
  return res.status(401).json({
    error: {
      code: "UNAUTHORIZED",
      message: "Authentication token is required.",
    },
  });
}
