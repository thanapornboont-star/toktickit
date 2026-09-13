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
