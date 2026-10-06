import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { authenticateSessionOrDev } from "../middleware/auth.js";
import { TicketStatus, ITPriority, Role } from "@prisma/client";

export const dashboardRouter = Router();

dashboardRouter.use(authenticateSessionOrDev);

// Helper check
function isRequester(req: Request): boolean {
  return req.user?.role === Role.REQUESTER;
}

function isStaffOrAdmin(req: Request): boolean {
  return req.user?.role === Role.IT_STAFF || req.user?.role === Role.ADMINISTRATOR;
}

function isAdmin(req: Request): boolean {
  return req.user?.role === Role.ADMINISTRATOR;
}

// ---------------------------------------------------------------------------
// GET /api/dashboard/requester
// Authoritative operational metrics and recent tickets for Requester (FR-06, BR-14, AC-09)
// ---------------------------------------------------------------------------
dashboardRouter.get("/requester", async (req: Request, res: Response) => {
  if (!isRequester(req)) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Access denied: only Requesters can access requester dashboard metrics.",
      },
    });
  }

  const userId = req.user!.id;

  try {
    const prisma = getPrisma();

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalOpen,
      inProgress,
      waitingForRequester,
      recentlyResolved,
      closed,
      recentTickets,
    ] = await Promise.all([
      // totalOpen: NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED (BR-14)
      prisma.ticket.count({
        where: {
          requesterId: userId,
          status: {
            in: [
              TicketStatus.NEW,
              TicketStatus.OPEN,
              TicketStatus.IN_PROGRESS,
              TicketStatus.WAITING_FOR_REQUESTER,
              TicketStatus.REOPENED,
            ],
          },
        },
      }),
      // inProgress
      prisma.ticket.count({
        where: {
          requesterId: userId,
          status: TicketStatus.IN_PROGRESS,
        },
      }),
      // waitingForRequester
      prisma.ticket.count({
        where: {
          requesterId: userId,
          status: TicketStatus.WAITING_FOR_REQUESTER,
        },
      }),
      // recentlyResolved: RESOLVED or CLOSED updated within last 7 days (BR-14)
      prisma.ticket.count({
        where: {
          requesterId: userId,
          status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
          updatedAt: { gte: sevenDaysAgo },
        },
      }),
      // closed
      prisma.ticket.count({
        where: {
          requesterId: userId,
          status: TicketStatus.CLOSED,
        },
      }),
      // recentTickets (up to 5, ordered by updatedAt desc)
      prisma.ticket.findMany({
        where: {
          requesterId: userId,
        },
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          status: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

    return res.status(200).json({
      metrics: {
        totalOpen,
        inProgress,
        waitingForRequester,
        recentlyResolved,
        closed,
      },
      recentTickets,
    });
  } catch (error) {
    console.error("GET /api/dashboard/requester error:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch requester dashboard metrics." },
    });
  }
});

// Helper function to calculate IT Staff operational metrics
async function getStaffOperationalMetrics(staffUserId?: number) {
  const prisma = getPrisma();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    newCount,
    openCount,
    inProgressCount,
    waitingCount,
    resolvedCount,
    myAssignedCount,
    unassignedCount,
    recentlyUpdatedCount,
    highPriorityCount,
    mediumPriorityCount,
    lowPriorityCount,
    recentTickets,
  ] = await Promise.all([
    prisma.ticket.count({ where: { status: TicketStatus.NEW } }),
    prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
    prisma.ticket.count({ where: { status: TicketStatus.IN_PROGRESS } }),
    prisma.ticket.count({ where: { status: TicketStatus.WAITING_FOR_REQUESTER } }),
    prisma.ticket.count({ where: { status: TicketStatus.RESOLVED } }),
    staffUserId
      ? prisma.ticket.count({
          where: {
            ownerId: staffUserId,
            status: { notIn: [TicketStatus.CLOSED, TicketStatus.CANCELLED] },
          },
        })
      : Promise.resolve(0),
    prisma.ticket.count({
      where: {
        ownerId: null,
        status: { notIn: [TicketStatus.CLOSED, TicketStatus.CANCELLED] },
      },
    }),
    prisma.ticket.count({
      where: {
        updatedAt: { gte: twentyFourHoursAgo },
      },
    }),
    prisma.ticket.count({
      where: {
        itPriority: ITPriority.HIGH,
        status: { notIn: [TicketStatus.CLOSED, TicketStatus.CANCELLED] },
      },
    }),
    prisma.ticket.count({
      where: {
        itPriority: ITPriority.MEDIUM,
        status: { notIn: [TicketStatus.CLOSED, TicketStatus.CANCELLED] },
      },
    }),
    prisma.ticket.count({
      where: {
        itPriority: ITPriority.LOW,
        status: { notIn: [TicketStatus.CLOSED, TicketStatus.CANCELLED] },
      },
    }),
    prisma.ticket.findMany({
      select: {
        id: true,
        ticketNumber: true,
        summary: true,
        status: true,
        itPriority: true,
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    metrics: {
      new: newCount,
      open: openCount,
      inProgress: inProgressCount,
      waitingForRequester: waitingCount,
      resolved: resolvedCount,
      myAssigned: myAssignedCount,
      unassigned: unassignedCount,
      recentlyUpdated: recentlyUpdatedCount,
      priorityCounts: {
        high: highPriorityCount,
        medium: mediumPriorityCount,
        low: lowPriorityCount,
      },
    },
    recentTickets,
  };
}

// ---------------------------------------------------------------------------
// GET /api/dashboard/staff
// Operational queue metrics and urgent ticket summaries for IT Staff (FR-07, BR-15, AC-10)
// ---------------------------------------------------------------------------
dashboardRouter.get("/staff", async (req: Request, res: Response) => {
  if (!isStaffOrAdmin(req)) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Access denied: only IT Staff and Administrators can access staff dashboard metrics.",
      },
    });
  }

  try {
    const data = await getStaffOperationalMetrics(req.user!.id);
    return res.status(200).json(data);
  } catch (error) {
    console.error("GET /api/dashboard/staff error:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch staff dashboard metrics." },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/dashboard/admin
// Administrative user account stats and operational metrics (FR-08, BR-15)
// ---------------------------------------------------------------------------
dashboardRouter.get("/admin", async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Access denied: only Administrators can access admin dashboard metrics.",
      },
    });
  }

  try {
    const prisma = getPrisma();

    const [operationalData, totalUsers, activeUsers, inactiveUsers, requesters, itStaff, administrators] =
      await Promise.all([
        getStaffOperationalMetrics(req.user!.id),
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isActive: false } }),
        prisma.user.count({ where: { role: Role.REQUESTER } }),
        prisma.user.count({ where: { role: Role.IT_STAFF } }),
        prisma.user.count({ where: { role: Role.ADMINISTRATOR } }),
      ]);

    return res.status(200).json({
      operational: operationalData.metrics,
      recentTickets: operationalData.recentTickets,
      userAccounts: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        roles: {
          requesters,
          itStaff,
          administrators,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/admin error:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch admin dashboard metrics." },
    });
  }
});
