import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createSession } from "../../src/services/auth.js";
import { TicketStatus } from "@prisma/client";

describe("Work Item 6: Public Comments & Internal Notes (API-09, API-11, API-18)", () => {
  let staffToken: string;
  let adminToken: string;
  let requesterToken: string;
  let otherRequesterToken: string;

  let staffId: number;
  let adminId: number;
  let requesterId: number;
  let testTicketId: number;

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
      where: { email: "michael.brown@toktickit.local" },
    });

    if (!userStaff || !userAdmin || !userRequester || !userOtherRequester) {
      throw new Error("Required seed users not found.");
    }

    staffId = userStaff.id;
    adminId = userAdmin.id;
    requesterId = userRequester.id;

    staffToken = await createSession(userStaff.id);
    adminToken = await createSession(userAdmin.id);
    requesterToken = await createSession(userRequester.id);
    otherRequesterToken = await createSession(userOtherRequester.id);

    // Create a test ticket owned by userRequester
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-COMM-${Date.now().toString().slice(-6)}`,
        summary: "Comments and Notes Test Ticket",
        description: "Testing public comments and internal notes flow.",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        status: TicketStatus.OPEN,
        requesterId: userRequester.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
      },
    });

    testTicketId = ticket.id;
  });

  // -------------------------------------------------------------------------
  // API-09: Public Comments (Requester & Staff)
  // -------------------------------------------------------------------------
  describe("API-09: Public Comments on Tickets (POST /api/tickets/:id/public-comments)", () => {
    it("allows ticket owner Requester to post a public comment", async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicketId}/public-comments`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ content: "Requester follow-up comment about the issue." });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("comment");
      expect(res.body.comment.content).toBe("Requester follow-up comment about the issue.");
      expect(res.body.comment.author.id).toBe(requesterId);
      expect(res.body.comment.author.role).toBe("REQUESTER");
      expect(res.body.comment).toHaveProperty("createdAt");
    });

    it("allows IT Staff to post a public comment on the ticket", async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicketId}/public-comments`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ content: "IT Staff public response: We have rebooted the gateway." });

      expect(res.status).toBe(201);
      expect(res.body.comment.author.id).toBe(staffId);
      expect(res.body.comment.author.role).toBe("IT_STAFF");
    });

    it("allows Administrator to post a public comment on the ticket", async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicketId}/public-comments`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ content: "Administrator comment: Issue acknowledged." });

      expect(res.status).toBe(201);
      expect(res.body.comment.author.id).toBe(adminId);
      expect(res.body.comment.author.role).toBe("ADMINISTRATOR");
    });

    it("retrieves public comments in chronological order", async () => {
      const res = await request(app)
        .get(`/api/tickets/${testTicketId}/public-comments`)
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(3);
    });

    it("rejects blank or whitespace-only comments with 400 Bad Request", async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicketId}/public-comments`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ content: "   " });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });

    it("rejects comment exceeding 2000 characters with 400 Bad Request", async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicketId}/public-comments`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ content: "A".repeat(2001) });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });

    it("prevents another requester from posting comment to unowned ticket (404 Not Found)", async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicketId}/public-comments`)
        .set("Authorization", `Bearer ${otherRequesterToken}`)
        .send({ content: "Unauthorized cross-user comment attempt." });

      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // API-11: Confidentiality of Internal Notes (Requester blocked)
  // -------------------------------------------------------------------------
  describe("API-11: Internal Notes Confidentiality (AC-10, BR-18)", () => {
    it("strictly blocks Requester from reading internal notes (403 Forbidden)", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${testTicketId}/internal-notes`)
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("strictly blocks Requester from creating internal notes (403 Forbidden)", async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/${testTicketId}/internal-notes`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ content: "Requester trying to create internal note." });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("strictly blocks Requester from accessing /api/tickets/:id/internal-notes guard", async () => {
      const res = await request(app)
        .get(`/api/tickets/${testTicketId}/internal-notes`)
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  // -------------------------------------------------------------------------
  // API-18: Internal Notes Management (Staff & Admin)
  // -------------------------------------------------------------------------
  describe("API-18: Internal Notes Management (AC-16, BR-18)", () => {
    it("allows IT Staff to post a confidential internal note", async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/${testTicketId}/internal-notes`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ content: "Internal note: Check switch port 24 logs." });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("internalNote");
      expect(res.body.internalNote.content).toBe("Internal note: Check switch port 24 logs.");
      expect(res.body.internalNote.author.id).toBe(staffId);
      expect(res.body.internalNote.author.role).toBe("IT_STAFF");
      expect(res.body.internalNote).toHaveProperty("createdAt");
    });

    it("allows Administrator to post an internal note", async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/${testTicketId}/internal-notes`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ content: "Admin note: Escalated to network infrastructure team." });

      expect(res.status).toBe(201);
      expect(res.body.internalNote.author.id).toBe(adminId);
      expect(res.body.internalNote.author.role).toBe("ADMINISTRATOR");
    });

    it("allows IT Staff to retrieve all internal notes for a ticket", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${testTicketId}/internal-notes`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0].content).toBe("Internal note: Check switch port 24 logs.");
      expect(res.body[1].content).toBe("Admin note: Escalated to network infrastructure team.");
    });

    it("rejects blank or whitespace internal note with 400 Bad Request", async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/${testTicketId}/internal-notes`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ content: "   " });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });

    it("rejects internal note exceeding 2000 characters with 400 Bad Request", async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/${testTicketId}/internal-notes`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ content: "X".repeat(2001) });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });

    it("returns 404 Not Found when adding internal note to non-existent ticket", async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/999999999/internal-notes`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ content: "Note for nonexistent ticket." });

      expect(res.status).toBe(404);
    });
  });
});
