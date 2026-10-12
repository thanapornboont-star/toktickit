import { Router, Request, Response } from "express";
import fs from "fs";
import { getPrisma } from "../prisma.js";
import { authenticateSessionOrDev } from "../middleware/auth.js";
import { generateTicketNumber } from "../services/ticketNumber.js";
import { upload, handleUploadErrors, hasAllowedFileSignature } from "../middleware/upload.js";
import { RequestedPriority, Prisma, Role, TicketStatus } from "@prisma/client";

export const ticketRouter = Router();

function toAttachmentResponse(attachment: {
  id: number;
  ticketId: number;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  isRemoved: boolean;
  removedAt: Date | null;
  removalReason: string | null;
  createdAt: Date;
}) {
  return {
    id: attachment.id,
    ticketId: attachment.ticketId,
    originalFilename: attachment.originalFilename,
    fileSize: attachment.fileSize,
    mimeType: attachment.mimeType,
    isRemoved: attachment.isRemoved,
    removedAt: attachment.removedAt,
    removalReason: attachment.removalReason,
    createdAt: attachment.createdAt,
  };
}

function isRequester(req: Request): boolean {
  return req.user?.role === Role.REQUESTER;
}

function isStaffOrAdmin(req: Request): boolean {
  return req.user?.role === Role.IT_STAFF || req.user?.role === Role.ADMINISTRATOR;
}

// Apply authentication middleware to all ticket routes
ticketRouter.use(authenticateSessionOrDev);

// ---------------------------------------------------------------------------
// GET /api/tickets - List Requester's Tickets with Search, Filter & Pagination
// ---------------------------------------------------------------------------
ticketRouter.get("/", async (req: Request, res: Response) => {
  if (!isRequester(req)) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Access denied: insufficient permissions for role",
      },
    });
  }

  try {
    const prisma = getPrisma();
    const requesterId = req.user!.id;

    const {
      search,
      categoryId,
      requestedPriority,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = "1",
      pageSize = "8",
    } = req.query;

    const where: Prisma.TicketWhereInput = {
      requesterId,
    };

    // 1. Search keyword (ticketNumber or summary)
    if (typeof search === "string" && search.trim() !== "") {
      const trimmedSearch = search.trim();
      where.OR = [
        { ticketNumber: { contains: trimmedSearch, mode: "insensitive" } },
        { summary: { contains: trimmedSearch, mode: "insensitive" } },
      ];
    }

    // 2. Filter by categoryId
    if (categoryId) {
      const catId = parseInt(categoryId as string, 10);
      if (!isNaN(catId) && catId > 0) {
        where.categoryId = catId;
      }
    }

    // 3. Filter by requestedPriority
    if (
      requestedPriority &&
      Object.values(RequestedPriority).includes(requestedPriority as RequestedPriority)
    ) {
      where.requestedPriority = requestedPriority as RequestedPriority;
    }

    // 4. Filter by status
    if (typeof status === "string" && status.trim() !== "") {
      where.status = status.trim() as any;
    }

    // 5. Pagination
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const rawPageSize = parseInt(pageSize as string, 10) || 8;
    const allowedPageSizes = [8, 20, 50];
    const take = allowedPageSizes.includes(rawPageSize) ? rawPageSize : 8;
    const skip = (pageNum - 1) * take;

    // 6. Sorting
    const allowedSortFields = ["createdAt", "ticketNumber", "requestedPriority"];
    const sortField = allowedSortFields.includes(sortBy as string) ? (sortBy as string) : "createdAt";
    const order = (sortOrder as string).toLowerCase() === "asc" ? "asc" : "desc";

    const [totalItems, tickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        orderBy: [{ [sortField]: order }, { id: "desc" }],
        skip,
        take,
        include: {
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          attachments: {
            where: { isRemoved: false },
            select: { id: true },
          },
        },
      }),
    ]);

    const data = tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      summary: t.summary,
      description: t.description,
      requestedPriority: t.requestedPriority,
      itPriority: t.itPriority,
      status: t.status,
      requesterIndicatedResolved: t.requesterIndicatedResolved,
      requesterId: t.requesterId,
      ownerId: t.ownerId,
      categoryId: t.categoryId,
      relatedSystemId: t.relatedSystemId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      category: t.category,
      relatedSystem: t.relatedSystem,
      activeAttachmentCount: t.attachments.length,
    }));

    const totalPages = Math.ceil(totalItems / take) || 1;

    return res.status(200).json({
      data,
      tickets: data,
      pagination: {
        page: pageNum,
        pageSize: take,
        totalItems,
        totalTickets: totalItems,
        totalPages,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch tickets.",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/tickets - Create Ticket
// ---------------------------------------------------------------------------
ticketRouter.post("/", async (req: Request, res: Response) => {
  if (!isRequester(req)) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Access denied: insufficient permissions for role",
      },
    });
  }

  try {
    const { summary, description, categoryId, relatedSystemId, requestedPriority } = req.body;
    const errors: Record<string, string> = {};

    // 1. Validate summary (5 - 100 characters)
    const trimmedSummary = typeof summary === "string" ? summary.trim() : "";
    if (!trimmedSummary) {
      errors.summary = "Ticket summary is required.";
    } else if (trimmedSummary.length < 5 || trimmedSummary.length > 100) {
      errors.summary = "Ticket summary must be between 5 and 100 characters.";
    }

    // 2. Validate description (10 - 2000 characters)
    const trimmedDescription = typeof description === "string" ? description.trim() : "";
    if (!trimmedDescription) {
      errors.description = "Ticket description is required.";
    } else if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
      errors.description = "Ticket description must be between 10 and 2000 characters.";
    }

    // 3. Validate requestedPriority (optional, defaults to MEDIUM)
    const validPriorities = Object.values(RequestedPriority);
    let finalPriority: RequestedPriority = RequestedPriority.MEDIUM;
    if (requestedPriority !== undefined && requestedPriority !== null && requestedPriority !== "") {
      if (!validPriorities.includes(requestedPriority as RequestedPriority)) {
        errors.requestedPriority = `Requested priority must be one of: ${validPriorities.join(", ")}.`;
      } else {
        finalPriority = requestedPriority as RequestedPriority;
      }
    }

    // 4. Validate categoryId
    const catId = typeof categoryId === "number" ? categoryId : parseInt(categoryId, 10);
    if (isNaN(catId) || catId <= 0) {
      errors.categoryId = "A valid Category must be selected.";
    }

    // 5. Validate relatedSystemId
    const sysId = typeof relatedSystemId === "number" ? relatedSystemId : parseInt(relatedSystemId, 10);
    if (isNaN(sysId) || sysId <= 0) {
      errors.relatedSystemId = "A valid Related System must be selected.";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "Please correct the errors in the form.",
          details: errors,
        },
      });
    }

    const prisma = getPrisma();

    // Check that Category and RelatedSystem exist and are active
    const [category, system] = await Promise.all([
      prisma.category.findUnique({ where: { id: catId } }),
      prisma.relatedSystem.findUnique({ where: { id: sysId } }),
    ]);

    if (!category || !category.isActive) {
      return res.status(400).json({
        error: {
          code: "INVALID_CATEGORY",
          message: "Selected category does not exist or is inactive.",
          details: { categoryId: "Invalid category selected." },
        },
      });
    }

    if (!system || !system.isActive) {
      return res.status(400).json({
        error: {
          code: "INVALID_RELATED_SYSTEM",
          message: "Selected related system does not exist or is inactive.",
          details: { relatedSystemId: "Invalid related system selected." },
        },
      });
    }

    // Atomic transaction for Ticket Number generation & Ticket creation
    // BR-07, BR-10: Client-supplied requesterId, ownerId, status, and itPriority are strictly ignored
    const newTicket = await prisma.$transaction(async (tx) => {
      const ticketNumber = await generateTicketNumber(tx);

      return tx.ticket.create({
        data: {
          ticketNumber,
          summary: trimmedSummary,
          description: trimmedDescription,
          requestedPriority: finalPriority,
          itPriority: finalPriority as any,
          status: "NEW",
          requesterIndicatedResolved: false,
          requesterId: req.user!.id,
          ownerId: null,
          categoryId: catId,
          relatedSystemId: sysId,
        },
        include: {
          requester: {
            select: { id: true, name: true, email: true },
          },
          category: {
            select: { id: true, name: true },
          },
          relatedSystem: {
            select: { id: true, name: true },
          },
        },
      });
    });

    return res.status(201).json({
      ...newTicket,
      ticket: newTicket,
    });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create ticket.",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/tickets/:id - Retrieve owned ticket detail with attachments
// ---------------------------------------------------------------------------
ticketRouter.get("/:id", async (req: Request, res: Response) => {
  if (!isRequester(req)) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Access denied: insufficient permissions for role",
      },
    });
  }

  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId) || ticketId <= 0) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Ticket not found." },
    });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, requesterId: req.user!.id },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        attachments: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found or not owned by requester." },
      });
    }

    const ticketResponse = {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      summary: ticket.summary,
      description: ticket.description,
      requestedPriority: ticket.requestedPriority,
      itPriority: ticket.itPriority,
      status: ticket.status,
      requesterIndicatedResolved: ticket.requesterIndicatedResolved,
      requesterId: ticket.requesterId,
      ownerId: ticket.ownerId,
      categoryId: ticket.categoryId,
      relatedSystemId: ticket.relatedSystemId,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      requester: ticket.requester,
      category: ticket.category,
      relatedSystem: ticket.relatedSystem,
      attachments: ticket.attachments.map(toAttachmentResponse),
    };

    return res.status(200).json({
      ...ticketResponse,
      ticket: ticketResponse,
    });
  } catch (error) {
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch ticket detail." },
    });
  }
});

// ---------------------------------------------------------------------------
// POST & PATCH /api/tickets/:id/indicate-resolved - Indicate problem appears resolved
// ---------------------------------------------------------------------------
const handleIndicateResolved = async (req: Request, res: Response) => {
  if (!isRequester(req)) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Access denied: insufficient permissions for role",
      },
    });
  }

  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId) || ticketId <= 0) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Ticket not found." },
    });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, requesterId: req.user!.id },
    });

    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found." },
      });
    }

    const indicated = req.body?.indicated !== undefined ? Boolean(req.body.indicated) : true;

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { requesterIndicatedResolved: indicated },
    });

    return res.status(200).json({
      message: "Indicated problem appears resolved",
      ticket: {
        id: updated.id,
        requesterIndicatedResolved: updated.requesterIndicatedResolved,
      },
      ticketId: updated.id,
      requesterIndicatedResolved: updated.requesterIndicatedResolved,
      status: updated.status,
    });
  } catch (error) {
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to indicate problem resolved." },
    });
  }
};

ticketRouter.post("/:id/indicate-resolved", handleIndicateResolved);
ticketRouter.patch("/:id/indicate-resolved", handleIndicateResolved);

// ---------------------------------------------------------------------------
// Public Comments Endpoints
// ---------------------------------------------------------------------------

// GET /api/tickets/:id/public-comments
ticketRouter.get("/:id/public-comments", async (req: Request, res: Response) => {
  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId) || ticketId <= 0) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Ticket not found." },
    });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found." },
      });
    }

    if (req.user!.role === Role.REQUESTER && ticket.requesterId !== req.user!.id) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found." },
      });
    }

    const comments = await prisma.publicComment.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return res.status(200).json(
      comments.map((c) => ({
        id: c.id,
        ticketId: c.ticketId,
        content: c.content,
        author: {
          id: c.author.id,
          name: c.author.name,
          role: c.author.role,
        },
        createdAt: c.createdAt,
      }))
    );
  } catch (error) {
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch public comments." },
    });
  }
});

// POST /api/tickets/:id/public-comments
ticketRouter.post("/:id/public-comments", async (req: Request, res: Response) => {
  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId) || ticketId <= 0) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Ticket not found." },
    });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found." },
      });
    }

    if (req.user!.role === Role.REQUESTER && ticket.requesterId !== req.user!.id) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found." },
      });
    }

    const { content } = req.body;
    const trimmed = typeof content === "string" ? content.trim() : "";
    if (!trimmed || trimmed.length > 2000) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Comment content is required and cannot exceed 2000 characters.",
        },
      });
    }

    const comment = await prisma.publicComment.create({
      data: {
        ticketId,
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
      comment: {
        id: comment.id,
        ticketId: comment.ticketId,
        content: comment.content,
        author: {
          id: comment.author.id,
          name: comment.author.name,
          role: comment.author.role,
        },
        createdAt: comment.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to create public comment." },
    });
  }
});

// ---------------------------------------------------------------------------
// Attachment Endpoints
// ---------------------------------------------------------------------------

// POST /api/tickets/:id/attachments - Upload attachment
ticketRouter.post(
  "/:id/attachments",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        return handleUploadErrors(err, req, res, next);
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    if (!isRequester(req)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Access denied: insufficient permissions for role",
        },
      });
    }

    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found." },
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: { code: "FILE_REQUIRED", message: "No file was attached." },
      });
    }

    if (!hasAllowedFileSignature(req.file)) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(415).json({
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "File content does not match the declared file type.",
        },
      });
    }

    try {
      const prisma = getPrisma();
      // Ownership check: Ticket must exist and belong to requester
      const ticket = await prisma.ticket.findFirst({
        where: { id: ticketId, requesterId: req.user!.id },
      });

      if (!ticket) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found or not owned by requester." },
        });
      }

      // Check max 5 active attachments limit
      const activeCount = await prisma.attachment.count({
        where: { ticketId, isRemoved: false },
      });

      if (activeCount >= 5) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          error: {
            code: "ATTACHMENT_LIMIT_EXCEEDED",
            message: "Maximum 5 active attachments allowed per ticket.",
          },
        });
      }

      const attachment = await prisma.attachment.create({
        data: {
          ticketId,
          originalFilename: req.file.originalname,
          storedFilename: req.file.filename,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          storagePath: req.file.path,
        },
      });

      return res.status(201).json(toAttachmentResponse(attachment));
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(500).json({
        error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to save attachment." },
      });
    }
  }
);

// GET /api/tickets/:id/attachments - List attachment metadata
ticketRouter.get("/:id/attachments", async (req: Request, res: Response) => {
  if (!isRequester(req)) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Access denied: insufficient permissions for role",
      },
    });
  }

  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId) || ticketId <= 0) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Ticket not found." },
    });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, requesterId: req.user!.id },
    });

    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found or not owned by requester." },
      });
    }

    const attachments = await prisma.attachment.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
    });

    return res.status(200).json(attachments.map(toAttachmentResponse));
  } catch (error) {
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch attachments." },
    });
  }
});

// GET /api/tickets/:id/attachments/:attachmentId/download - Download active attachment
ticketRouter.get("/:id/attachments/:attachmentId/download", async (req: Request, res: Response) => {
  const ticketId = parseInt(req.params.id, 10);
  const attachmentId = parseInt(req.params.attachmentId, 10);

  if (isNaN(ticketId) || isNaN(attachmentId)) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Attachment not found." },
    });
  }

  try {
    const prisma = getPrisma();
    let ticket;

    if (req.user!.role === Role.REQUESTER) {
      ticket = await prisma.ticket.findFirst({
        where: { id: ticketId, requesterId: req.user!.id },
      });
    } else if (isStaffOrAdmin(req)) {
      ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });
    } else {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Access denied: insufficient permissions for role" },
      });
    }

    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found or not owned by requester." },
      });
    }

    const attachment = await prisma.attachment.findFirst({
      where: { id: attachmentId, ticketId },
    });

    if (!attachment || attachment.isRemoved) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Attachment not found or has been removed." },
      });
    }

    if (!fs.existsSync(attachment.storagePath)) {
      return res.status(404).json({
        error: { code: "FILE_NOT_FOUND", message: "Attachment file not found on storage." },
      });
    }

    return res.download(attachment.storagePath, attachment.originalFilename);
  } catch (error) {
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to download attachment." },
    });
  }
});

// DELETE /api/tickets/:id/attachments/:attachmentId - Soft remove attachment
ticketRouter.delete("/:id/attachments/:attachmentId", async (req: Request, res: Response) => {
  if (!isRequester(req)) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Access denied: insufficient permissions for role",
      },
    });
  }

  const ticketId = parseInt(req.params.id, 10);
  const attachmentId = parseInt(req.params.attachmentId, 10);

  if (isNaN(ticketId) || isNaN(attachmentId)) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Attachment not found." },
    });
  }

  const { reason } = req.body;
  const trimmedReason = typeof reason === "string" ? reason.trim() : "";

  if (!trimmedReason || trimmedReason.length < 5 || trimmedReason.length > 255) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_FAILED",
        message: "A removal reason between 5 and 255 characters is required.",
        details: { reason: "Removal reason must be between 5 and 255 characters." },
      },
    });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, requesterId: req.user!.id },
    });

    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found or not owned by requester." },
      });
    }

    const attachment = await prisma.attachment.findFirst({
      where: { id: attachmentId, ticketId },
    });

    if (!attachment) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Attachment not found." },
      });
    }

    if (attachment.isRemoved) {
      return res.status(400).json({
        error: { code: "ALREADY_REMOVED", message: "Attachment is already removed." },
      });
    }

    const updated = await prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        isRemoved: true,
        removedAt: new Date(),
        removalReason: trimmedReason,
      },
    });

    return res.status(200).json(toAttachmentResponse(updated));
  } catch (error) {
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to remove attachment." },
    });
  }
});

// ---------------------------------------------------------------------------
// Internal Notes Confidentiality Guard (BR-18, AC-10, API-11)
// ---------------------------------------------------------------------------
ticketRouter.all("/:id/internal-notes", (req: Request, res: Response) => {
  return res.status(403).json({
    error: {
      code: "FORBIDDEN",
      message: "Internal notes are confidential to IT Staff and Administrators.",
    },
  });
});

// ---------------------------------------------------------------------------
// Lab 4: Ticket Status Transition, Resolution Gate & Concurrency Control (BR-09, BR-11, BR-12)
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

// PATCH /api/tickets/:id/status
ticketRouter.patch("/:id/status", async (req: Request, res: Response) => {
  if (!isStaffOrAdmin(req)) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Access denied: only IT Staff and Administrators can formally update ticket status.",
      },
    });
  }

  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId) || ticketId <= 0) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Ticket not found." },
    });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found." },
      });
    }

    const { status, clientUpdatedAt } = req.body;
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

    // Validate state transition matrix
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

    // Optimistic concurrency control (BR-12, AC-08)
    if (clientUpdatedAt) {
      const clientTime = new Date(clientUpdatedAt).getTime();
      const serverTime = new Date(ticket.updatedAt).getTime();
      if (Math.abs(clientTime - serverTime) > 1000) {
        return res.status(409).json({
          error: {
            code: "CONFLICT",
            message: "Ticket has been updated by another user. Please refresh and retry.",
            currentUpdatedAt: ticket.updatedAt.toISOString(),
          },
        });
      }
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: nextStatus },
    });

    return res.status(200).json({
      message: "Status updated successfully",
      ticket: {
        id: updated.id,
        ticketNumber: updated.ticketNumber,
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error("PATCH /api/tickets/:id/status error:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to update ticket status." },
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 4: Actions Taken REST APIs (FR-01..FR-05, BR-01..BR-07, AC-01..AC-04)
// ---------------------------------------------------------------------------

// GET /api/tickets/:id/actions-taken
ticketRouter.get("/:id/actions-taken", async (req: Request, res: Response) => {
  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId) || ticketId <= 0) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Ticket not found." },
    });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found." },
      });
    }

    // Requester can view only owned tickets; otherwise 404 (safe isolation)
    if (isRequester(req) && ticket.requesterId !== req.user!.id) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found." },
      });
    }

    const actions = await prisma.actionTaken.findMany({
      where: { ticketId },
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { actionDateTime: "asc" },
    });

    return res.status(200).json({
      actions,
      totalCount: actions.length,
    });
  } catch (error) {
    console.error("GET /api/tickets/:id/actions-taken error:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch actions taken." },
    });
  }
});

// POST /api/tickets/:id/actions-taken
ticketRouter.post("/:id/actions-taken", async (req: Request, res: Response) => {
  if (!isStaffOrAdmin(req)) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Access denied: insufficient permissions for role. Only IT Staff and Administrators can record actions taken.",
      },
    });
  }

  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId) || ticketId <= 0) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Ticket not found." },
    });
  }

  const {
    description,
    result,
    isFollowUpRequired,
    followUpNote,
    attachmentNotes,
    actionDateTime,
  } = req.body;

  // Validation: description (3-2000)
  if (typeof description !== "string" || description.trim().length < 3 || description.trim().length > 2000) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Action description must be between 3 and 2000 characters.",
        details: { description: "Action description must be between 3 and 2000 characters." },
      },
    });
  }

  // Validation: result (3-2000)
  if (typeof result !== "string" || result.trim().length < 3 || result.trim().length > 2000) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Action result must be between 3 and 2000 characters.",
        details: { result: "Action result must be between 3 and 2000 characters." },
      },
    });
  }

  const followUpRequired = Boolean(isFollowUpRequired);

  // Validation: followUpNote required when isFollowUpRequired is true (BR-04, AC-02)
  if (followUpRequired) {
    if (typeof followUpNote !== "string" || followUpNote.trim().length < 3 || followUpNote.trim().length > 1000) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Follow-up note is required when follow-up is needed (3-1000 characters).",
          details: { followUpNote: "Follow-up note is required when follow-up is needed." },
        },
      });
    }
  }

  // Validation: actionDateTime
  let parsedDate = new Date();
  if (actionDateTime) {
    const d = new Date(actionDateTime);
    if (isNaN(d.getTime())) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Invalid actionDateTime format.",
        },
      });
    }
    // Cannot be > 5 minutes in future
    if (d.getTime() > Date.now() + 5 * 60 * 1000) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Action date/time cannot be in the future beyond 5 minutes.",
        },
      });
    }
    parsedDate = d;
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found." },
      });
    }

    const action = await prisma.actionTaken.create({
      data: {
        ticketId,
        actionDateTime: parsedDate,
        description: description.trim(),
        result: result.trim(),
        performedById: req.user!.id, // Auto-recorded from session (BR-02, BR-03)
        isFollowUpRequired: followUpRequired,
        followUpNote: followUpRequired && followUpNote ? followUpNote.trim() : null,
        attachmentNotes: typeof attachmentNotes === "string" && attachmentNotes.trim() ? attachmentNotes.trim().slice(0, 500) : null,
      },
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.status(201).json({ action });
  } catch (error) {
    console.error("POST /api/tickets/:id/actions-taken error:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to create action taken." },
    });
  }
});

// PUT /api/tickets/:id/actions-taken/:actionId
ticketRouter.put("/:id/actions-taken/:actionId", async (req: Request, res: Response) => {
  if (!isStaffOrAdmin(req)) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Access denied: only IT Staff and Administrators can edit actions taken.",
      },
    });
  }

  const ticketId = parseInt(req.params.id, 10);
  const actionId = parseInt(req.params.actionId, 10);
  if (isNaN(ticketId) || isNaN(actionId) || ticketId <= 0 || actionId <= 0) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Ticket or Action Taken not found." },
    });
  }

  const {
    description,
    result,
    isFollowUpRequired,
    followUpNote,
    attachmentNotes,
    actionDateTime,
  } = req.body;

  if (description !== undefined) {
    if (typeof description !== "string" || description.trim().length < 3 || description.trim().length > 2000) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Action description must be between 3 and 2000 characters.",
        },
      });
    }
  }

  if (result !== undefined) {
    if (typeof result !== "string" || result.trim().length < 3 || result.trim().length > 2000) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Action result must be between 3 and 2000 characters.",
        },
      });
    }
  }

  const followUpRequired = isFollowUpRequired !== undefined ? Boolean(isFollowUpRequired) : undefined;
  if (followUpRequired === true) {
    if (typeof followUpNote !== "string" || followUpNote.trim().length < 3 || followUpNote.trim().length > 1000) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Follow-up note is required when follow-up is needed (3-1000 characters).",
        },
      });
    }
  }

  try {
    const prisma = getPrisma();
    const existing = await prisma.actionTaken.findFirst({
      where: { id: actionId, ticketId },
    });

    if (!existing) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Action taken not found under this ticket." },
      });
    }

    let parsedDate = existing.actionDateTime;
    if (actionDateTime) {
      const d = new Date(actionDateTime);
      if (isNaN(d.getTime()) || d.getTime() > Date.now() + 5 * 60 * 1000) {
        return res.status(400).json({
          error: { code: "BAD_REQUEST", message: "Invalid actionDateTime or date in future." },
        });
      }
      parsedDate = d;
    }

    const updated = await prisma.actionTaken.update({
      where: { id: actionId },
      data: {
        description: description !== undefined ? description.trim() : existing.description,
        result: result !== undefined ? result.trim() : existing.result,
        actionDateTime: parsedDate,
        isFollowUpRequired: followUpRequired !== undefined ? followUpRequired : existing.isFollowUpRequired,
        followUpNote: followUpRequired === true ? (followUpNote ? followUpNote.trim() : existing.followUpNote) : (followUpRequired === false ? null : existing.followUpNote),
        attachmentNotes: attachmentNotes !== undefined ? (attachmentNotes ? attachmentNotes.trim().slice(0, 500) : null) : existing.attachmentNotes,
      },
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.status(200).json({ action: updated });
  } catch (error) {
    console.error("PUT /api/tickets/:id/actions-taken/:actionId error:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to update action taken." },
    });
  }
});


