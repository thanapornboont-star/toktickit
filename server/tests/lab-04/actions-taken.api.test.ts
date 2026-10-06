import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createSession } from "../../src/services/auth.js";
import { TicketStatus } from "@prisma/client";

describe("Lab 4: Actions Taken REST APIs (API-01 to API-06)", () => {
  let staffToken: string;
  let adminToken: string;
  let requesterToken: string;
  let otherRequesterToken: string;

  let staffUser: { id: number; name: string; email: string };
  let requesterUser: { id: number; name: string; email: string };
  let otherRequesterUser: { id: number; name: string; email: string };

  let ownedTicketId: number;
  let createdActionId: number;

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
    const userOtherRequester = await prisma.user.findUnique({
      where: { email: "david.lee@toktickit.local" },
    });

    if (!userStaff || !userAdmin || !userRequester || !userOtherRequester) {
      throw new Error("Required seed users not found.");
    }

    staffUser = userStaff;
    requesterUser = userRequester;
    otherRequesterUser = userOtherRequester;

    staffToken = await createSession(userStaff.id);
    adminToken = await createSession(userAdmin.id);
    requesterToken = await createSession(userRequester.id);
    otherRequesterToken = await createSession(userOtherRequester.id);

    // Create a fresh test ticket owned by requesterUser
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-ACT-${Date.now().toString().slice(-6)}`,
        summary: "Lab 4 Actions Taken Test Ticket",
        description: "Ticket for verifying Actions Taken REST APIs",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        status: TicketStatus.OPEN,
        requesterId: requesterUser.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
      },
    });

    ownedTicketId = ticket.id;
  });

  // API-01 (AC-01, BR-01, BR-02, BR-03)
  it("API-01: Create valid Action Taken by IT Staff (201 Created; auto-set performer)", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ownedTicketId}/actions-taken`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        description: "Replaced faulty CAT6 cable and verified patch panel link lights.",
        result: "Port link up at 1Gbps full duplex. Verified gateway ping response time < 1ms.",
        isFollowUpRequired: false,
        attachmentNotes: "See switch port eth0/14 telemetry logs",
      });

    expect(res.status).toBe(201);
    expect(res.body.action).toBeDefined();
    expect(res.body.action.ticketId).toBe(ownedTicketId);
    expect(res.body.action.description).toBe(
      "Replaced faulty CAT6 cable and verified patch panel link lights."
    );
    expect(res.body.action.result).toBe(
      "Port link up at 1Gbps full duplex. Verified gateway ping response time < 1ms."
    );
    // Auto-recorded from session (BR-02, BR-03)
    expect(res.body.action.performedById).toBe(staffUser.id);
    expect(res.body.action.performedBy.name).toBe(staffUser.name);
    expect(res.body.action.isFollowUpRequired).toBe(false);
    expect(res.body.action.followUpNote).toBeNull();

    createdActionId = res.body.action.id;
  });

  // API-02 (AC-02, BR-04)
  it("API-02: Create Action Taken with isFollowUpRequired: true but empty note (400 Bad Request)", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ownedTicketId}/actions-taken`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        description: "Applied hotfix update to database cluster node 2.",
        result: "Node joined quorum, replication in sync.",
        isFollowUpRequired: true,
        followUpNote: "   ", // whitespace only
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("BAD_REQUEST");
    expect(res.body.error.message).toMatch(/follow-up note is required/i);
  });

  // API-03 (AC-04, BR-07)
  it("API-03: Requester attempts to create Action Taken (403 Forbidden)", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ownedTicketId}/actions-taken`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({
        description: "Requester attempting to log action taken on their ticket.",
        result: "Should be rejected.",
        isFollowUpRequired: false,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // API-04 (AC-03, BR-07)
  it("API-04: Requester views Actions Taken on owned ticket (200 OK)", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ownedTicketId}/actions-taken`)
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.actions).toBeDefined();
    expect(Array.isArray(res.body.actions)).toBe(true);
    expect(res.body.actions.length).toBeGreaterThanOrEqual(1);
    expect(res.body.totalCount).toBeGreaterThanOrEqual(1);

    const found = res.body.actions.find((a: any) => a.id === createdActionId);
    expect(found).toBeDefined();
    expect(found.performedBy).toBeDefined();
    expect(found.performedBy.name).toBe(staffUser.name);
  });

  // API-05 (AC-03, BR-07)
  it("API-05: Requester views Actions Taken on unowned ticket (404 Not Found)", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ownedTicketId}/actions-taken`)
      .set("Authorization", `Bearer ${otherRequesterToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  // API-06 (AC-01, BR-03)
  it("API-06: Update existing Action Taken by IT Staff (200 OK)", async () => {
    const res = await request(app)
      .put(`/api/tickets/${ownedTicketId}/actions-taken/${createdActionId}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        description: "Replaced faulty CAT6 cable and re-crimped RJ45 connectors.",
        result: "Port link up at 1Gbps full duplex. Verified ping response < 0.5ms across 100 packets.",
        isFollowUpRequired: true,
        followUpNote: "Check switch error counters tomorrow morning at 09:00.",
      });

    expect(res.status).toBe(200);
    expect(res.body.action).toBeDefined();
    expect(res.body.action.id).toBe(createdActionId);
    expect(res.body.action.description).toBe(
      "Replaced faulty CAT6 cable and re-crimped RJ45 connectors."
    );
    expect(res.body.action.isFollowUpRequired).toBe(true);
    expect(res.body.action.followUpNote).toBe(
      "Check switch error counters tomorrow morning at 09:00."
    );
  });
});
