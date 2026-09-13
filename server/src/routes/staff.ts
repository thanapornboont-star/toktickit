import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { Prisma, Role, ITPriority, TicketStatus } from "@prisma/client";

export const staffRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/staff/tickets
// Shared operational queue: search, filter, sort, paginate
// Access: IT_STAFF, ADMINISTRATOR (RBAC guard applied in app.ts)
// ---------------------------------------------------------------------------
staffRouter.get("/tickets", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();

    const {
      search,
      categoryId,
      status,
      requestedPriority,
      itPriority,
      ownerId,
    } = req.query as Record<string, string | undefined>;

    const sortBy = (req.query.sortBy as string) ?? "createdAt";
    const sortOrder = (req.query.sortOrder as string) ?? "desc";
    const page = (req.query.page as string) ?? "1";
    const pageSize = (req.query.pageSize as string) ?? "10";

    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSizeNum = Math.min(50, Math.max(1, parseInt(pageSize) || 10));
    const skip = (pageNum - 1) * pageSizeNum;

    // Build where clause
    const where: Prisma.TicketWhereInput = {};

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      const catId = parseInt(categoryId);
      if (!isNaN(catId)) where.categoryId = catId;
    }

    if (status) {
      const validStatuses = Object.values(TicketStatus) as string[];
      if (validStatuses.includes(status)) {
        where.status = status as TicketStatus;
      }
    }

    if (requestedPriority) {
      const validPriorities = ["LOW", "MEDIUM", "HIGH"];
      if (validPriorities.includes(requestedPriority)) {
        where.requestedPriority = requestedPriority as "LOW" | "MEDIUM" | "HIGH";
      }
    }

    if (itPriority) {
      const validPriorities = Object.values(ITPriority) as string[];
      if (validPriorities.includes(itPriority)) {
        where.itPriority = itPriority as ITPriority;
      }
    }

    if (ownerId !== undefined) {
      if (ownerId === "unassigned") {
        where.ownerId = null;
      } else {
        const ownerIdNum = parseInt(ownerId);
        if (!isNaN(ownerIdNum)) where.ownerId = ownerIdNum;
      }
    }

    // Build orderBy — only allow known safe fields
    const validSortFields = ["createdAt", "updatedAt", "ticketNumber", "itPriority"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const sortDir = sortOrder === "asc" ? "asc" : "desc";
    const orderBy: Prisma.TicketOrderByWithRelationInput = { [sortField]: sortDir };

    const [tickets, totalCount] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy,
        skip,
        take: pageSizeNum,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          requestedPriority: true,
          itPriority: true,
          status: true,
          requesterIndicatedResolved: true,
          createdAt: true,
          updatedAt: true,
          category: { select: { id: true, name: true } },
          requester: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true } },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    return res.status(200).json({
      tickets,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        totalTickets: totalCount,
        totalPages: Math.ceil(totalCount / pageSizeNum),
      },
    });
  } catch (err) {
    console.error("GET /api/staff/tickets error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve staff ticket queue" },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/staff/tickets/:id
// Full operational ticket detail for staff
// Access: IT_STAFF, ADMINISTRATOR
// ---------------------------------------------------------------------------
staffRouter.get("/tickets/:id", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        ticketNumber: true,
        summary: true,
        description: true,
        requestedPriority: true,
        itPriority: true,
        status: true,
        requesterIndicatedResolved: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true } },
        owner: { select: { id: true, name: true, email: true } },
        attachments: {
          where: { isRemoved: false },
          select: {
            id: true,
            ticketId: true,
            originalFilename: true,
            fileSize: true,
            mimeType: true,
            isRemoved: true,
            createdAt: true,
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    return res.status(200).json({ ticket });
  } catch (err) {
    console.error("GET /api/staff/tickets/:id error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve ticket detail" },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/staff/members
// Returns list of active IT_STAFF and ADMINISTRATOR users for ticket assignment
// Access: IT_STAFF, ADMINISTRATOR
// ---------------------------------------------------------------------------
staffRouter.get("/members", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();

    const members = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: [Role.IT_STAFF, Role.ADMINISTRATOR] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: "asc" },
    });

    return res.status(200).json(members);
  } catch (err) {
    console.error("GET /api/staff/members error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve staff members" },
    });
  }
});

// ---------------------------------------------------------------------------
// BR-15: Permitted Status Transition Matrix
// ---------------------------------------------------------------------------
const PERMITTED_STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED],
  OPEN: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_FOR_REQUESTER,
    TicketStatus.RESOLVED,
    TicketStatus.CANCELLED,
  ],
  IN_PROGRESS: [
    TicketStatus.WAITING_FOR_REQUESTER,
    TicketStatus.RESOLVED,
    TicketStatus.CANCELLED,
  ],
  WAITING_FOR_REQUESTER: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED,
    TicketStatus.CANCELLED,
  ],
  RESOLVED: [TicketStatus.CLOSED, TicketStatus.REOPENED],
  REOPENED: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED,
    TicketStatus.CANCELLED,
  ],
  CLOSED: [],
  CANCELLED: [],
};

// ---------------------------------------------------------------------------
// PATCH /api/staff/tickets/:id/owner
// Assign or unassign primary ticket owner
// Access: IT_STAFF, ADMINISTRATOR
// ---------------------------------------------------------------------------
staffRouter.patch("/tickets/:id/owner", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    const { ownerId } = req.body;

    if (ownerId === null) {
      const updated = await prisma.ticket.update({
        where: { id },
        data: { ownerId: null },
      });
      return res.status(200).json({
        message: "Ticket owner updated",
        ticket: {
          id: updated.id,
          ownerId: null,
          owner: null,
        },
      });
    }

    const ownerIdNum = parseInt(ownerId, 10);
    if (isNaN(ownerIdNum)) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Valid ownerId or null is required" },
      });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: ownerIdNum } });
    if (!targetUser || !targetUser.isActive || targetUser.role === Role.REQUESTER) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Owner must be an active user with IT_STAFF or ADMINISTRATOR role",
        },
      });
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: { ownerId: targetUser.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(200).json({
      message: "Ticket owner updated",
      ticket: {
        id: updated.id,
        ownerId: updated.ownerId,
        owner: updated.owner,
      },
    });
  } catch (err) {
    console.error("PATCH /api/staff/tickets/:id/owner error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to update ticket owner" },
    });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/staff/tickets/:id/priority
// Update IT Priority (LOW | MEDIUM | HIGH)
// Access: IT_STAFF, ADMINISTRATOR
// ---------------------------------------------------------------------------
staffRouter.patch("/tickets/:id/priority", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    const { itPriority } = req.body;
    const validPriorities = Object.values(ITPriority) as string[];
    if (!itPriority || !validPriorities.includes(itPriority)) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: `itPriority must be one of: ${validPriorities.join(", ")}`,
        },
      });
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: { itPriority: itPriority as ITPriority },
    });

    return res.status(200).json({
      message: "IT Priority updated",
      ticket: {
        id: updated.id,
        itPriority: updated.itPriority,
      },
    });
  } catch (err) {
    console.error("PATCH /api/staff/tickets/:id/priority error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to update IT Priority" },
    });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/staff/tickets/:id/status
// Update status obeying BR-15 permitted transition state machine
// Access: IT_STAFF, ADMINISTRATOR
// ---------------------------------------------------------------------------
staffRouter.patch("/tickets/:id/status", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    const { status } = req.body;
    const validStatuses = Object.values(TicketStatus) as string[];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: `Invalid status value. Must be one of: ${validStatuses.join(", ")}`,
        },
      });
    }

    const nextStatus = status as TicketStatus;
    const currentStatus = ticket.status as TicketStatus;

    // Validate transition
    if (currentStatus !== nextStatus) {
      const allowed = PERMITTED_STATUS_TRANSITIONS[currentStatus] ?? [];
      if (!allowed.includes(nextStatus)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: `Status transition from ${currentStatus} to ${nextStatus} is not permitted.`,
          },
        });
      }
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: { status: nextStatus },
    });

    return res.status(200).json({
      message: "Status updated successfully",
      ticket: {
        id: updated.id,
        status: updated.status,
      },
    });
  } catch (err) {
    console.error("PATCH /api/staff/tickets/:id/status error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to update ticket status" },
    });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/staff/tickets/:id
// General staff update endpoint supporting ownerId, itPriority, and status
// ---------------------------------------------------------------------------
staffRouter.patch("/tickets/:id", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    const { ownerId, itPriority, status } = req.body;
    const dataToUpdate: Prisma.TicketUpdateInput = {};

    if (ownerId !== undefined) {
      if (ownerId === null) {
        dataToUpdate.owner = { disconnect: true };
      } else {
        const ownerIdNum = parseInt(ownerId, 10);
        if (isNaN(ownerIdNum)) {
          return res.status(400).json({
            error: { code: "BAD_REQUEST", message: "Valid ownerId or null is required" },
          });
        }
        const targetUser = await prisma.user.findUnique({ where: { id: ownerIdNum } });
        if (!targetUser || !targetUser.isActive || targetUser.role === Role.REQUESTER) {
          return res.status(400).json({
            error: {
              code: "BAD_REQUEST",
              message: "Owner must be an active user with IT_STAFF or ADMINISTRATOR role",
            },
          });
        }
        dataToUpdate.owner = { connect: { id: targetUser.id } };
      }
    }

    if (itPriority !== undefined) {
      const validPriorities = Object.values(ITPriority) as string[];
      if (!validPriorities.includes(itPriority)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: `itPriority must be one of: ${validPriorities.join(", ")}`,
          },
        });
      }
      dataToUpdate.itPriority = itPriority as ITPriority;
    }

    if (status !== undefined) {
      const validStatuses = Object.values(TicketStatus) as string[];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: `Invalid status value. Must be one of: ${validStatuses.join(", ")}`,
          },
        });
      }
      const nextStatus = status as TicketStatus;
      const currentStatus = ticket.status as TicketStatus;
      if (currentStatus !== nextStatus) {
        const allowed = PERMITTED_STATUS_TRANSITIONS[currentStatus] ?? [];
        if (!allowed.includes(nextStatus)) {
          return res.status(400).json({
            error: {
              code: "BAD_REQUEST",
              message: `Status transition from ${currentStatus} to ${nextStatus} is not permitted.`,
            },
          });
        }
      }
      dataToUpdate.status = nextStatus;
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: dataToUpdate,
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(200).json({
      message: "Ticket updated successfully",
      ticket: {
        id: updated.id,
        status: updated.status,
        itPriority: updated.itPriority,
        ownerId: updated.ownerId,
        owner: updated.owner,
      },
    });
  } catch (err) {
    console.error("PATCH /api/staff/tickets/:id error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to update ticket" },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/staff/tickets/:id/internal-notes
// Retrieve private internal notes for a ticket
// Access: IT_STAFF, ADMINISTRATOR
// ---------------------------------------------------------------------------
staffRouter.get("/tickets/:id/internal-notes", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    const notes = await prisma.internalNote.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return res.status(200).json(
      notes.map((n) => ({
        id: n.id,
        ticketId: n.ticketId,
        content: n.content,
        author: {
          id: n.author.id,
          name: n.author.name,
          role: n.author.role,
        },
        createdAt: n.createdAt,
      }))
    );
  } catch (err) {
    console.error("GET /api/staff/tickets/:id/internal-notes error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve internal notes" },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/staff/tickets/:id/internal-notes
// Create a confidential internal note on a ticket (BR-18, BR-19)
// Access: IT_STAFF, ADMINISTRATOR
// ---------------------------------------------------------------------------
staffRouter.post("/tickets/:id/internal-notes", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    const { content } = req.body;
    const trimmed = typeof content === "string" ? content.trim() : "";
    if (!trimmed || trimmed.length > 2000) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Internal note content is required and cannot exceed 2000 characters.",
        },
      });
    }

    const note = await prisma.internalNote.create({
      data: {
        ticketId: id,
        authorId: req.user!.id,
        content: trimmed,
      },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return res.status(201).json({
      internalNote: {
        id: note.id,
        ticketId: note.ticketId,
        content: note.content,
        author: {
          id: note.author.id,
          name: note.author.name,
          role: note.author.role,
        },
        createdAt: note.createdAt,
      },
    });
  } catch (err) {
    console.error("POST /api/staff/tickets/:id/internal-notes error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to create internal note" },
    });
  }
});

