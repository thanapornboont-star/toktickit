import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createSession } from "../../src/services/auth.js";
import { TicketStatus, ITPriority } from "@prisma/client";

describe("Lab 4: IT Staff & Admin Dashboard REST APIs (API-13, API-14)", () => {
  let staffToken: string;
  let adminToken: string;
  let requesterToken: string;

  let staffUser: { id: number; name: string; email: string };
  let adminUser: { id: number; name: string; email: string };
  let requesterUser: { id: number; name: string; email: string };

  beforeAll(async () => {
    const prisma = getPrisma();

    const userStaff = await prisma.user.findUnique({
      where: { email: "staff.alex@toktickit.local" },
    });
    const userAdmin = await prisma.user.findUnique({
      where: { email: "admin.boss@toktickit.local" },
    });
    const userRequester = await prisma.user.findUnique({
      where: { email: "jennifer.anderson@toktickit.local" },
    });

    if (!userStaff || !userAdmin || !userRequester) {
      throw new Error("Required seed users not found.");
    }

    staffUser = userStaff;
    adminUser = userAdmin;
    requesterUser = userRequester;

    staffToken = await createSession(userStaff.id);
    adminToken = await createSession(userAdmin.id);
    requesterToken = await createSession(userRequester.id);

    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    // Seed tickets: unassigned ticket and staffUser assigned ticket
    await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-STF-UN-${Date.now().toString().slice(-5)}`,
        summary: "Staff Dashboard Unassigned Ticket",
        description: "Testing unassigned count",
        requestedPriority: "HIGH",
        itPriority: ITPriority.HIGH,
        status: TicketStatus.OPEN,
        requesterId: requesterUser.id,
        ownerId: null, // Unassigned
        categoryId: category!.id,
        relatedSystemId: system!.id,
      },
    });

    await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-STF-MY-${Date.now().toString().slice(-5)}`,
        summary: "Staff Dashboard My Assigned Ticket",
        description: "Testing myAssigned count",
        requestedPriority: "MEDIUM",
        itPriority: ITPriority.MEDIUM,
        status: TicketStatus.IN_PROGRESS,
        requesterId: requesterUser.id,
        ownerId: staffUser.id, // Assigned to staff
        categoryId: category!.id,
        relatedSystemId: system!.id,
      },
    });
  });

  // API-13 (AC-10, BR-15)
  it("API-13: IT Staff dashboard operational metrics (200 OK)", async () => {
    const res = await request(app)
      .get("/api/dashboard/staff")
      .set("Authorization", `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.metrics).toBeDefined();

    // Verify metrics counters
    expect(typeof res.body.metrics.new).toBe("number");
    expect(typeof res.body.metrics.open).toBe("number");
    expect(typeof res.body.metrics.inProgress).toBe("number");
    expect(typeof res.body.metrics.waitingForRequester).toBe("number");
    expect(res.body.metrics.myAssigned).toBeGreaterThanOrEqual(1);
    expect(res.body.metrics.unassigned).toBeGreaterThanOrEqual(1);
    expect(typeof res.body.metrics.recentlyUpdated).toBe("number");

    // Verify priority counts breakdown
    expect(res.body.metrics.priorityCounts).toBeDefined();
    expect(typeof res.body.metrics.priorityCounts.high).toBe("number");
    expect(typeof res.body.metrics.priorityCounts.medium).toBe("number");
    expect(typeof res.body.metrics.priorityCounts.low).toBe("number");

    // Verify recent tickets list
    expect(Array.isArray(res.body.recentTickets)).toBe(true);
    expect(res.body.recentTickets.length).toBeGreaterThanOrEqual(1);
    const sample = res.body.recentTickets[0];
    expect(sample.id).toBeDefined();
    expect(sample.ticketNumber).toBeDefined();
    expect(sample.summary).toBeDefined();
    expect(sample.status).toBeDefined();
  });

  // Requester 403 check
  it("API-13b: Requester forbidden from accessing Staff dashboard (403 Forbidden)", async () => {
    const res = await request(app)
      .get("/api/dashboard/staff")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // API-14 (AC-11, BR-15)
  it("API-14: IT Staff dashboard handles zero/empty calculations gracefully (200 OK)", async () => {
    // IT Staff with no tickets assigned specifically
    const userEmily = await getPrisma().user.findUnique({
      where: { email: "staff.emily@toktickit.local" },
    });
    if (!userEmily) throw new Error("Seed user staff.emily not found");
    const emilyToken = await createSession(userEmily.id);

    const res = await request(app)
      .get("/api/dashboard/staff")
      .set("Authorization", `Bearer ${emilyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.metrics).toBeDefined();
    expect(typeof res.body.metrics.myAssigned).toBe("number");
    expect(res.body.metrics.myAssigned).toBeGreaterThanOrEqual(0);
  });

  // Admin Dashboard check (FR-08)
  it("API-13c: Admin dashboard returns operational metrics + user accounts summary (200 OK)", async () => {
    const res = await request(app)
      .get("/api/dashboard/admin")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.operational).toBeDefined();
    expect(res.body.userAccounts).toBeDefined();
    expect(res.body.userAccounts.totalUsers).toBeGreaterThanOrEqual(1);
    expect(res.body.userAccounts.activeUsers).toBeGreaterThanOrEqual(1);
    expect(res.body.userAccounts.roles).toBeDefined();
    expect(res.body.userAccounts.roles.administrators).toBeGreaterThanOrEqual(1);
    expect(res.body.userAccounts.roles.itStaff).toBeGreaterThanOrEqual(1);
    expect(res.body.userAccounts.roles.requesters).toBeGreaterThanOrEqual(1);
  });

  it("API-13d: IT Staff forbidden from accessing Admin dashboard (403 Forbidden)", async () => {
    const res = await request(app)
      .get("/api/dashboard/admin")
      .set("Authorization", `Bearer ${staffToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});
