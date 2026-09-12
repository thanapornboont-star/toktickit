import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import {
  validatePasswordPolicy,
  hashPassword,
  verifyPassword,
  createSession,
  revokeSession,
} from "../services/auth.js";
import { authenticateToken } from "../middleware/auth.js";

export const authRouter = Router();

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
authRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({
      error: {
        code: "VALIDATION_FAILED",
        message: "Email and password are required.",
      },
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Safe invalid-credential response (BR-02: generic message, no user enumeration)
    if (!user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        },
      });
    }

    // Inactive account check (BR-01)
    if (!user.isActive) {
      return res.status(403).json({
        error: {
          code: "ACCOUNT_DEACTIVATED",
          message: "Account is deactivated. Please contact an administrator.",
        },
      });
    }

    // Verify password hash (BR-05)
    const isPasswordValid = verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        },
      });
    }

    // Create session token
    const token = await createSession(user.id);

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred during authentication.",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
authRouter.post("/logout", authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.sessionToken) {
      await revokeSession(req.sessionToken);
    }

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to log out.",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
authRouter.get("/me", authenticateToken, (req: Request, res: Response) => {
  const user = req.user!;
  return res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
    },
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/change-password
// ---------------------------------------------------------------------------
authRouter.post("/change-password", authenticateToken, async (req: Request, res: Response) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_FAILED",
        message: "Current password, new password, and confirmation password are all required.",
      },
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_FAILED",
        message: "New password and confirmation password do not match.",
      },
    });
  }

  // Validate password policy (BR-04)
  const policyCheck = validatePasswordPolicy(newPassword);
  if (!policyCheck.isValid) {
    return res.status(400).json({
      error: {
        code: "INVALID_PASSWORD_POLICY",
        message: policyCheck.message,
      },
    });
  }

  const user = req.user!;
  // Verify current password
  const isCurrentValid = verifyPassword(currentPassword, user.passwordHash);
  if (!isCurrentValid) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Current password is incorrect.",
      },
    });
  }

  try {
    const prisma = getPrisma();
    const newHash = hashPassword(newPassword);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    return res.status(200).json({
      message: "Password changed successfully",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        mustChangePassword: updatedUser.mustChangePassword,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to change password.",
      },
    });
  }
});
