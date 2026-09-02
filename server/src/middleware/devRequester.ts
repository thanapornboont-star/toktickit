import { Request, Response, NextFunction } from "express";
import { getPrisma } from "../prisma.js";

export interface DevRequesterUser {
  id: number;
  name: string;
  email: string;
  department: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      devRequester?: DevRequesterUser;
    }
  }
}

export async function requireDevRequester(req: Request, res: Response, next: NextFunction) {
  const rawId = req.header("X-Dev-Requester-Id");

  if (!rawId) {
    return res.status(400).json({
      error: {
        code: "MISSING_REQUESTER_ID",
        message: "Header 'X-Dev-Requester-Id' is required for this operation.",
      },
    });
  }

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
    next();
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to authenticate development requester.",
      },
    });
  }
}
