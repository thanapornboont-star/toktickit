import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createSession } from "../../src/services/auth.js";
import { TicketStatus } from "@prisma/client";

describe("Lab 4: Ticket Workflow & Resolution REST APIs (API-07 to API-10)", () => {
  let staffToken: string;
  let adminToken: string;
  let requesterToken: string;

  let staffUser: { id: number; name: string; email: string };
  let requesterUser: { id: number; name: string; email: string };

  let testTicketId: number;
  let newTicketId: number;

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
    requesterUser = userRequester;

    staffToken = await createSession(userStaff.id);
    adminToken = await createSession(userAdmin.id);
    requesterToken = await createSession(userRequester.id);

    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    // Ticket starting at OPEN
    const ticket1 = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-WF1-${Date.now().toString().slice(-6)}`,
        summary: "Workflow Test Ticket - Open",
        description: "Testing state machine transitions and concurrency",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        status: TicketStatus.OPEN,
        requesterId: requesterUser.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
      },
    });
    testTicketId = ticket1.id;

    // Ticket starting at NEW
    const ticket2 = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-WF2-${Date.now().toString().slice(-6)}`,
        summary: "Workflow Test Ticket - New",
        description: "Testing prohibited state machine transition",
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        status: TicketStatus.NEW,
        requesterId: requesterUser.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
      },
    });
    newTicketId = ticket2.id;
  });

  // API-07 (AC-05, BR-09)
  it("API-07: Permitted status transition (OPEN -> IN_PROGRESS) (200 OK)", async () => {
    const res = await request(app)
      .patch(`/api/tickets/${testTicketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        status: TicketStatus.IN_PROGRESS,
      });

    expect(res.status).toBe(200);
    expect(res.body.ticket).toBeDefined();
    expect(res.body.ticket.status).toBe(TicketStatus.IN_PROGRESS);

    // Verify in DB
    const prisma = getPrisma();
    const updated = await prisma.ticket.findUnique({ where: { id: testTicketId } });
    expect(updated?.status).toBe(TicketStatus.IN_PROGRESS);
  });

  // API-08 (AC-06, BR-09)
  it("API-08: Prohibited status transition (NEW -> RESOLVED) (400 Bad Request)", async () => {
    const res = await request(app)
      .patch(`/api/tickets/${newTicketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        status: TicketStatus.RESOLVED,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("BAD_REQUEST");
    expect(res.body.error.message).toMatch(/not permitted/i);

    // Verify status remains NEW in DB
    const prisma = getPrisma();
    const untouched = await prisma.ticket.findUnique({ where: { id: newTicketId } });
    expect(untouched?.status).toBe(TicketStatus.NEW);
  });

  // API-09 (AC-07, BR-10)
  it("API-09: Requester indicates problem appears resolved (200 OK; status unchanged)", async () => {
    // Current status of testTicketId is IN_PROGRESS
    const res = await request(app)
      .post(`/api/tickets/${testTicketId}/indicate-resolved`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({
        indicated: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.requesterIndicatedResolved).toBe(true);
    expect(res.body.status).toBe(TicketStatus.IN_PROGRESS); // Advisory indicator only! Status unchanged.

    // Verify in DB: requesterIndicatedResolved is true, status remains IN_PROGRESS
    const prisma = getPrisma();
    const updated = await prisma.ticket.findUnique({ where: { id: testTicketId } });
    expect(updated?.requesterIndicatedResolved).toBe(true);
    expect(updated?.status).toBe(TicketStatus.IN_PROGRESS);
  });

  // API-10 (AC-08, BR-12)
  it("API-10: Stale ticket status update with mismatched timestamp (409 Conflict)", async () => {
    // Send clientUpdatedAt that is 1 hour in the past
    const staleTimestamp = new Date(Date.now() - 3600 * 1000).toISOString();

    const res = await request(app)
      .patch(`/api/tickets/${testTicketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        status: TicketStatus.RESOLVED,
        clientUpdatedAt: staleTimestamp,
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("CONFLICT");
    expect(res.body.error.currentUpdatedAt).toBeDefined();

    // Verify status was NOT changed to RESOLVED
    const prisma = getPrisma();
    const unchanged = await prisma.ticket.findUnique({ where: { id: testTicketId } });
    expect(unchanged?.status).toBe(TicketStatus.IN_PROGRESS);
  });
});
