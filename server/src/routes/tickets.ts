import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireDevRequester } from "../middleware/devRequester.js";
import { generateTicketNumber } from "../services/ticketNumber.js";
import { RequestedPriority } from "@prisma/client";

export const ticketRouter = Router();

// Apply requireDevRequester to all ticket routes
ticketRouter.use(requireDevRequester);

// POST /api/tickets - Create Ticket
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
