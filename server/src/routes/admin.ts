import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { Prisma, Role } from "@prisma/client";
import { validatePasswordPolicy, hashPassword } from "../services/auth.js";

export const adminRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/admin/users
// Retrieves all users with search and role filtering (API-19, AC-17)
// Access: ADMINISTRATOR only (RBAC guard in app.ts)
// ---------------------------------------------------------------------------
adminRouter.get("/users", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const search = req.query.search as string | undefined;
    const role = req.query.role as string | undefined;

    const where: Prisma.UserWhereInput = {};

    if (search && search.trim()) {
      const trimmedSearch = search.trim();
      where.OR = [
        { name: { contains: trimmedSearch, mode: "insensitive" } },
        { email: { contains: trimmedSearch, mode: "insensitive" } },
      ];
    }

    if (role && Object.values(Role).includes(role as Role)) {
      where.role = role as Role;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
      orderBy: { id: "asc" },
    });

    return res.status(200).json(users);
  } catch (error) {
    console.error("Failed to fetch admin users:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch users." },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/users
// Creates a new user account with one role and initial password (API-20, API-21, AC-18, AC-19, BR-20, BR-24)
// Access: ADMINISTRATOR only (RBAC guard in app.ts)
// ---------------------------------------------------------------------------
adminRouter.post("/users", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const { name, email, role, isActive, initialPassword } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        error: { code: "VALIDATION_FAILED", message: "User name is required." },
      });
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        error: { code: "VALIDATION_FAILED", message: "User email is required." },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!role || !Object.values(Role).includes(role)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: `Role must be one of: ${Object.values(Role).join(", ")}.`,
        },
      });
    }

    if (!initialPassword || typeof initialPassword !== "string") {
      return res.status(400).json({
        error: { code: "VALIDATION_FAILED", message: "Initial password is required." },
      });
    }

    // Password complexity check (BR-24)
    const policyResult = validatePasswordPolicy(initialPassword);
    if (!policyResult.isValid) {
      return res.status(400).json({
        error: { code: "VALIDATION_FAILED", message: policyResult.message },
      });
    }

    // Email uniqueness check (BR-20, API-21, AC-19)
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return res.status(409).json({
        error: {
          code: "EMAIL_ALREADY_EXISTS",
          message: "Email address is already in use.",
        },
      });
    }

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        role: role as Role,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        passwordHash: hashPassword(initialPassword),
        mustChangePassword: true, // New accounts require password change on first login (AC-18, BR-24)
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    return res.status(201).json({ user });
  } catch (error) {
    console.error("Failed to create admin user:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to create user." },
    });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:id
// Updates user details, role, or active status (API-22, API-23, AC-20, AC-21, BR-21, BR-22)
// Access: ADMINISTRATOR only (RBAC guard in app.ts)
// ---------------------------------------------------------------------------
adminRouter.patch("/users/:id", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const targetId = parseInt(req.params.id, 10);

    if (isNaN(targetId)) {
      return res.status(400).json({
        error: { code: "VALIDATION_FAILED", message: "Invalid user ID." },
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetId },
    });

    if (!targetUser) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "User not found." },
      });
    }

    const { name, email, role, isActive } = req.body;
    const currentAdminId = req.user?.id;

    // BR-21: Self-deactivation prevention (AC-20, API-22)
    if (currentAdminId === targetId && isActive === false) {
      return res.status(400).json({
        error: {
          code: "CANNOT_DEACTIVATE_SELF",
          message: "Cannot deactivate your own administrator account.",
        },
      });
    }

    // BR-22: Last active administrator protection (AC-21, API-23)
    // If target user is an active admin and changes would deactivate or demote them
    const isTargetActiveAdmin = targetUser.role === Role.ADMINISTRATOR && targetUser.isActive;
    const isDeactivating = isActive === false;
    const isDemoting = role && role !== Role.ADMINISTRATOR;

    if (isTargetActiveAdmin && (isDeactivating || isDemoting)) {
      const activeAdminCount = await prisma.user.count({
        where: {
          role: Role.ADMINISTRATOR,
          isActive: true,
        },
      });

      if (activeAdminCount <= 1) {
        return res.status(400).json({
          error: {
            code: "LAST_ADMIN_PROTECTED",
            message: "Cannot deactivate or demote the last active administrator.",
          },
        });
      }
    }

    // Email conflict check
    let normalizedEmail: string | undefined;
    if (email !== undefined) {
      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({
          error: { code: "VALIDATION_FAILED", message: "Email cannot be empty." },
        });
      }
      normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== targetUser.email) {
        const emailInUse = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (emailInUse && emailInUse.id !== targetId) {
          return res.status(409).json({
            error: {
              code: "EMAIL_ALREADY_EXISTS",
              message: "Email address is already in use by another user.",
            },
          });
        }
      }
    }

    // Validate role if provided
    if (role !== undefined && !Object.values(Role).includes(role)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: `Role must be one of: ${Object.values(Role).join(", ")}.`,
        },
      });
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          error: { code: "VALIDATION_FAILED", message: "Name cannot be empty." },
        });
      }
      updateData.name = name.trim();
    }
    if (normalizedEmail !== undefined) updateData.email = normalizedEmail;
    if (role !== undefined) updateData.role = role as Role;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updatedUser = await prisma.user.update({
      where: { id: targetId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
      },
    });

    // If deactivated, revoke active sessions
    if (isActive === false) {
      await prisma.session.deleteMany({
        where: { userId: targetId },
      });
    }

    return res.status(200).json({ user: updatedUser });
  } catch (error) {
    console.error("Failed to update admin user:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to update user." },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/users/:id/reset-password
// Assigns a new initial password for a user (API-24, AC-22, BR-24)
// Access: ADMINISTRATOR only (RBAC guard in app.ts)
// ---------------------------------------------------------------------------
adminRouter.post("/users/:id/reset-password", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const targetId = parseInt(req.params.id, 10);

    if (isNaN(targetId)) {
      return res.status(400).json({
        error: { code: "VALIDATION_FAILED", message: "Invalid user ID." },
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetId },
    });

    if (!targetUser) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "User not found." },
      });
    }

    const { newInitialPassword } = req.body;

    if (!newInitialPassword || typeof newInitialPassword !== "string") {
      return res.status(400).json({
        error: { code: "VALIDATION_FAILED", message: "New initial password is required." },
      });
    }

    // Password complexity check (BR-24)
    const policyResult = validatePasswordPolicy(newInitialPassword);
    if (!policyResult.isValid) {
      return res.status(400).json({
        error: { code: "VALIDATION_FAILED", message: policyResult.message },
      });
    }

    // Update passwordHash and set mustChangePassword to true
    await prisma.user.update({
      where: { id: targetId },
      data: {
        passwordHash: hashPassword(newInitialPassword),
        mustChangePassword: true,
      },
    });

    // Invalidate existing sessions so user must log in with new password
    await prisma.session.deleteMany({
      where: { userId: targetId },
    });

    return res.status(200).json({
      message: "Initial password set. User will be required to change password on next login.",
      user: {
        id: targetId,
        mustChangePassword: true,
      },
    });
  } catch (error) {
    console.error("Failed to reset user password:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to reset password." },
    });
  }
});
