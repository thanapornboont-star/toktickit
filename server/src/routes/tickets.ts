import { Router, Request, Response } from "express";
import fs from "fs";
import { getPrisma } from "../prisma.js";
import { requireDevRequester } from "../middleware/devRequester.js";
import { generateTicketNumber } from "../services/ticketNumber.js";
import { upload, handleUploadErrors, hasAllowedFileSignature } from "../middleware/upload.js";
import { RequestedPriority, Prisma } from "@prisma/client";

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

// Apply requireDevRequester to all ticket routes
ticketRouter.use(requireDevRequester);

// ---------------------------------------------------------------------------
// GET /api/tickets - List Requester's Tickets with Search, Filter & Pagination
// ---------------------------------------------------------------------------
ticketRouter.get("/", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const requesterId = req.devRequester!.id;

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
      where.status = status.trim();
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
      status: t.status,
      requesterId: t.requesterId,
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
      pagination: {
        page: pageNum,
        pageSize: take,
        totalItems,
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
    const newTicket = await prisma.$transaction(async (tx) => {
      const ticketNumber = await generateTicketNumber(tx);

      return tx.ticket.create({
        data: {
          ticketNumber,
          summary: trimmedSummary,
          description: trimmedDescription,
          requestedPriority: finalPriority,
          status: "NEW",
          requesterId: req.devRequester!.id,
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

    return res.status(201).json(newTicket);
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
  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId) || ticketId <= 0) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Ticket not found." },
    });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, requesterId: req.devRequester!.id },
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

    return res.status(200).json({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      summary: ticket.summary,
      description: ticket.description,
      requestedPriority: ticket.requestedPriority,
      status: ticket.status,
      requesterId: ticket.requesterId,
      categoryId: ticket.categoryId,
      relatedSystemId: ticket.relatedSystemId,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      requester: ticket.requester,
      category: ticket.category,
      relatedSystem: ticket.relatedSystem,
      attachments: ticket.attachments.map(toAttachmentResponse),
    });
  } catch (error) {
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch ticket detail." },
    });
  }
});

// ---------------------------------------------------------------------------
// Attachment Endpoints (Issue 4)
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
        where: { id: ticketId, requesterId: req.devRequester!.id },
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
  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId) || ticketId <= 0) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Ticket not found." },
    });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, requesterId: req.devRequester!.id },
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
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, requesterId: req.devRequester!.id },
    });

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
      where: { id: ticketId, requesterId: req.devRequester!.id },
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
