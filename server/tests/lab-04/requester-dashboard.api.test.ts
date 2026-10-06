import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createSession } from "../../src/services/auth.js";
import { TicketStatus } from "@prisma/client";

describe("Lab 4: Requester Dashboard REST APIs (API-11, API-12)", () => {
  let requester1Token: string;
  let requester2Token: string;
  let emptyRequesterToken: string;
  let staffToken: string;

  let requester1User: { id: number; name: string; email: string };
  let requester2User: { id: number; name: string; email: string };
  let emptyRequesterUser: { id: number; name: string; email: string };

  beforeAll(async () => {
    const prisma = getPrisma();

    const user1 = await prisma.user.findUnique({
      where: { email: "jennifer.anderson@toktickit.local" },
    });
    const user2 = await prisma.user.findUnique({
      where: { email: "david.lee@toktickit.local" },
    });
    const staffUser = await prisma.user.findUnique({
      where: { email: "staff.alex@toktickit.local" },
    });

    if (!user1 || !user2 || !staffUser) {
      throw new Error("Required seed users not found.");
    }

    const emptyUser = await prisma.user.upsert({
      where: { email: "empty.requester@toktickit.local" },
      update: { mustChangePassword: false, isActive: true },
      create: {
        email: "empty.requester@toktickit.local",
        name: "Empty Requester",
        passwordHash: "dummyhash",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });

    requester1User = user1;
    requester2User = user2;
    emptyRequesterUser = emptyUser;

    requester1Token = await createSession(user1.id);
    requester2Token = await createSession(user2.id);
    emptyRequesterToken = await createSession(emptyUser.id);
    staffToken = await createSession(staffUser.id);

    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    // Seed specific known tickets for requester1 to guarantee metrics assertions
    await prisma.ticket.createMany({
      data: [
        {
          ticketNumber: `TKT-DASH-R1-${Date.now().toString().slice(-5)}-1`,
          summary: "Requester 1 Open Ticket",
          description: "Open status ticket for metrics test",
          requestedPriority: "MEDIUM",
          itPriority: "MEDIUM",
          status: TicketStatus.OPEN,
          requesterId: user1.id,
          categoryId: category!.id,
          relatedSystemId: system!.id,
        },
        {
          ticketNumber: `TKT-DASH-R1-${Date.now().toString().slice(-5)}-2`,
          summary: "Requester 1 Waiting Ticket",
          description: "Waiting for requester status ticket",
          requestedPriority: "HIGH",
          itPriority: "HIGH",
          status: TicketStatus.WAITING_FOR_REQUESTER,
          requesterId: user1.id,
          categoryId: category!.id,
          relatedSystemId: system!.id,
        },
        {
          ticketNumber: `TKT-DASH-R1-${Date.now().toString().slice(-5)}-3`,
          summary: "Requester 1 Resolved Ticket",
          description: "Resolved ticket within 7 days",
          requestedPriority: "LOW",
          itPriority: "LOW",
          status: TicketStatus.RESOLVED,
          requesterId: user1.id,
          categoryId: category!.id,
          relatedSystemId: system!.id,
        },
      ],
    });
  });

  // API-11 (AC-09, BR-14)
  it("API-11: Requester dashboard metrics calculation (200 OK)", async () => {
    const res = await request(app)
      .get("/api/dashboard/requester")
      .set("Authorization", `Bearer ${requester1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.metrics).toBeDefined();
    expect(res.body.metrics.totalOpen).toBeGreaterThanOrEqual(2);
    expect(res.body.metrics.waitingForRequester).toBeGreaterThanOrEqual(1);
    expect(res.body.metrics.recentlyResolved).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.recentTickets)).toBe(true);
    expect(res.body.recentTickets.length).toBeGreaterThanOrEqual(1);

    // Verify ticket structure in recentTickets
    const first = res.body.recentTickets[0];
    expect(first.id).toBeDefined();
    expect(first.ticketNumber).toBeDefined();
    expect(first.summary).toBeDefined();
    expect(first.status).toBeDefined();
    expect(first.updatedAt).toBeDefined();
  });

  // API-12 (AC-09, BR-14)
  it("API-12: Requester dashboard isolation (no leak of other requesters)", async () => {
    const res1 = await request(app)
      .get("/api/dashboard/requester")
      .set("Authorization", `Bearer ${requester1Token}`);

    const res2 = await request(app)
      .get("/api/dashboard/requester")
      .set("Authorization", `Bearer ${requester2Token}`);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    // Verify tickets in res2 only belong to requester2
    const prisma = getPrisma();
    for (const ticket of res2.body.recentTickets) {
      const dbTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(dbTicket?.requesterId).toBe(requester2User.id);
    }
  });

  it("API-11b: IT Staff forbidden from accessing Requester dashboard (403 Forbidden)", async () => {
    const res = await request(app)
      .get("/api/dashboard/requester")
      .set("Authorization", `Bearer ${staffToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("API-11c: Gracefully handles Requester with 0 tickets (empty state / zero counts - AC-11)", async () => {
    // Delete any tickets potentially created for emptyRequesterUser
    const prisma = getPrisma();
    await prisma.ticket.deleteMany({ where: { requesterId: emptyRequesterUser.id } });

    const res = await request(app)
      .get("/api/dashboard/requester")
      .set("Authorization", `Bearer ${emptyRequesterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.metrics.totalOpen).toBe(0);
    expect(res.body.metrics.inProgress).toBe(0);
    expect(res.body.metrics.waitingForRequester).toBe(0);
    expect(res.body.metrics.recentlyResolved).toBe(0);
    expect(res.body.metrics.closed).toBe(0);
    expect(res.body.recentTickets).toEqual([]);
  });
});
