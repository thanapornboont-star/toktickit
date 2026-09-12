import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { requireDevRequester } from "./middleware/devRequester.js";
import { ticketRouter } from "./routes/tickets.js";
import { authRouter } from "./routes/auth.js";

export const app = express();

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Authentication Endpoints (Lab 3)
// ---------------------------------------------------------------------------
app.use("/api/auth", authRouter);

// ---------------------------------------------------------------------------
// Health Check (Lab 1)
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Reference Data Endpoints (Lab 2)
// ---------------------------------------------------------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, isActive: true },
      orderBy: { id: "asc" },
    });
    res.status(200).json(categories);
  } catch {
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch categories" },
    });
  }
});

app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const systems = await getPrisma().relatedSystem.findMany({
      where: { isActive: true },
      select: { id: true, name: true, description: true, isActive: true },
      orderBy: { id: "asc" },
    });
    res.status(200).json(systems);
  } catch {
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch related systems" },
    });
  }
});

// ---------------------------------------------------------------------------
// Development Requester Endpoints (Lab 2)
// ---------------------------------------------------------------------------
app.get("/api/dev-requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().devRequester.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, department: true, isActive: true },
      orderBy: { id: "asc" },
    });
    res.status(200).json(requesters);
  } catch {
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch development requesters" },
    });
  }
});

app.get("/api/dev-requesters/me", requireDevRequester, (req: Request, res: Response) => {
  res.status(200).json(req.devRequester);
});

// ---------------------------------------------------------------------------
// Ticket Endpoints (Lab 2 & Lab 3 Requester)
// ---------------------------------------------------------------------------
app.use("/api/tickets", ticketRouter);

// ---------------------------------------------------------------------------
// IT Staff Endpoints Guard (Work Item 4 RBAC boundary & Work Item 5)
// ---------------------------------------------------------------------------
import { Router } from "express";
import { authenticateToken, requirePasswordChangeCompleted, requireRole } from "./middleware/auth.js";
import { Role } from "@prisma/client";

const staffRouter = Router();
staffRouter.use(authenticateToken);
staffRouter.use(requirePasswordChangeCompleted);
staffRouter.use(requireRole(Role.IT_STAFF, Role.ADMINISTRATOR));
app.use("/api/staff", staffRouter);

// ---------------------------------------------------------------------------
// Administrator Endpoints Guard (Work Item 4 RBAC boundary & Work Item 7)
// ---------------------------------------------------------------------------
const adminRouter = Router();
adminRouter.use(authenticateToken);
adminRouter.use(requirePasswordChangeCompleted);
adminRouter.use(requireRole(Role.ADMINISTRATOR));
app.use("/api/admin", adminRouter);

export default app;
