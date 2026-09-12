import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createSession } from "../../src/services/auth.js";

describe("Work Item 4: RBAC Authorization Boundary & Requester Continuity", () => {
  let requesterAToken: string;
  let requesterBToken: string;
  let staffToken: string;
  let adminToken: string;

  let requesterAId: number;
  let requesterBId: number;
  let staffId: number;
  let adminId: number;

  let testCategory: { id: number; name: string };
  let testSystem: { id: number; name: string };
  let ticketAId: number;

  beforeAll(async () => {
    const prisma = getPrisma();

    // Get seeded users
    const userA = await prisma.user.findUnique({
      where: { email: "jennifer.anderson@toktickit.local" },
    });
    const userB = await prisma.user.findUnique({
      where: { email: "michael.brown@toktickit.local" },
    });
    const userStaff = await prisma.user.findUnique({
      where: { email: "staff.alex@toktickit.local" },
    });
    const userAdmin = await prisma.user.findUnique({
      where: { email: "admin.boss@toktickit.local" },
    });

    if (!userA || !userB || !userStaff || !userAdmin) {
      throw new Error("Required seed users not found in database.");
    }

    requesterAId = userA.id;
    requesterBId = userB.id;
    staffId = userStaff.id;
    adminId = userAdmin.id;

    // Issue active sessions for each user
    requesterAToken = await createSession(userA.id);
    requesterBToken = await createSession(userB.id);
    staffToken = await createSession(userStaff.id);
    adminToken = await createSession(userAdmin.id);

    // Find category and related system
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    if (!category || !system) {
      throw new Error("Required category or system not found.");
    }

    testCategory = category;
    testSystem = system;

    // Create a known ticket owned by Requester A
    const ticketA = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-AUTH-${Date.now()}`,
        summary: "Requester A Private Test Ticket",
        description: "This ticket belongs strictly to Requester A for testing access isolation.",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        status: "NEW",
        requesterIndicatedResolved: false,
        requesterId: requesterAId,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
      },
    });

    ticketAId = ticketA.id;
  });

  // -------------------------------------------------------------------------
  // API-07: Authenticated Requester Identity Authority (AC-06, BR-07, BR-10)
  // -------------------------------------------------------------------------
  describe("API-07: Authenticated Requester Identity Authority", () => {
    it("strictly derives requester identity from Bearer token and ignores client-supplied spoofed fields", async () => {
      const spoofedPayload = {
        summary: "Authentic summary created by token",
        description: "Detailed description verifying that client-supplied requesterId is overridden.",
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "HIGH",
        // Malicious client attempts to spoof identity, owner, status, and itPriority
        requesterId: requesterBId,
        ownerId: staffId,
        status: "RESOLVED",
        itPriority: "LOW",
        requesterIndicatedResolved: true,
      };

      const res = await request(app)
        .post("/api/tickets")
        .set("Authorization", `Bearer ${requesterAToken}`)
        .send(spoofedPayload);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.requesterId).toBe(requesterAId); // Not requesterBId
      expect(res.body.status).toBe("NEW"); // Not RESOLVED
      expect(res.body.itPriority).toBe("HIGH"); // Not LOW
      expect(res.body.ownerId).toBeNull(); // Not staffId
      expect(res.body.requesterIndicatedResolved).toBe(false); // Not true
    });
  });

  // -------------------------------------------------------------------------
  // API-08: Cross-Requester Ownership Isolation (AC-07, BR-09)
  // -------------------------------------------------------------------------
  describe("API-08: Cross-Requester Ownership Isolation (Safe 404 Rejection)", () => {
    it("returns 404 Not Found when Requester B attempts to retrieve Requester A's ticket detail", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketAId}`)
        .set("Authorization", `Bearer ${requesterBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("returns 404 Not Found when Requester B attempts to list attachments of Requester A's ticket", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketAId}/attachments`)
        .set("Authorization", `Bearer ${requesterBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("returns 404 Not Found when Requester B attempts to upload an attachment to Requester A's ticket", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticketAId}/attachments`)
        .set("Authorization", `Bearer ${requesterBToken}`)
        .attach("file", Buffer.from("%PDF-1.4 dummy"), "unauthorized.pdf");

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("returns 404 Not Found when Requester B attempts to indicate Requester A's ticket as resolved", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticketAId}/indicate-resolved`)
        .set("Authorization", `Bearer ${requesterBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("returns 404 Not Found when Requester B attempts to view or post public comments on Requester A's ticket", async () => {
      const getRes = await request(app)
        .get(`/api/tickets/${ticketAId}/public-comments`)
        .set("Authorization", `Bearer ${requesterBToken}`);
      expect(getRes.status).toBe(404);
      expect(getRes.body.error.code).toBe("NOT_FOUND");

      const postRes = await request(app)
        .post(`/api/tickets/${ticketAId}/public-comments`)
        .set("Authorization", `Bearer ${requesterBToken}`)
        .send({ content: "Sneaky comment on another user's ticket" });
      expect(postRes.status).toBe(404);
      expect(postRes.body.error.code).toBe("NOT_FOUND");
    });
  });

  // -------------------------------------------------------------------------
  // API-09: Public Comments (AC-08, BR-17)
  // -------------------------------------------------------------------------
  describe("API-09: Public Comments Flow", () => {
    it("allows Requester A to post a valid public comment with server author and timestamp", async () => {
      const commentRes = await request(app)
        .post(`/api/tickets/${ticketAId}/public-comments`)
        .set("Authorization", `Bearer ${requesterAToken}`)
        .send({ content: "   This is an official public inquiry from Requester A.   " });

      expect(commentRes.status).toBe(201);
      expect(commentRes.body.comment).toBeDefined();
      expect(commentRes.body.comment.content).toBe("This is an official public inquiry from Requester A.");
      expect(commentRes.body.comment.author.id).toBe(requesterAId);
      expect(commentRes.body.comment.author.role).toBe("REQUESTER");
      expect(commentRes.body.comment.createdAt).toBeDefined();
    });

    it("allows IT Staff to post a public response comment on Requester A's ticket", async () => {
      const staffCommentRes = await request(app)
        .post(`/api/tickets/${ticketAId}/public-comments`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ content: "Hello Jennifer, we have received your ticket and are investigating." });

      expect(staffCommentRes.status).toBe(201);
      expect(staffCommentRes.body.comment.author.id).toBe(staffId);
      expect(staffCommentRes.body.comment.author.role).toBe("IT_STAFF");
    });

    it("retrieves the chronological list of public comments for Requester A", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketAId}/public-comments`)
        .set("Authorization", `Bearer ${requesterAToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body[0].author.role).toBe("REQUESTER");
      expect(res.body[1].author.role).toBe("IT_STAFF");
    });

    it("rejects empty or whitespace-only comment with 400 Bad Request", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticketAId}/public-comments`)
        .set("Authorization", `Bearer ${requesterAToken}`)
        .send({ content: "    " });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });
  });

  // -------------------------------------------------------------------------
  // API-10: Requester Problem Resolved Indication (AC-09, BR-16)
  // -------------------------------------------------------------------------
  describe("API-10: Requester Problem Resolved Indication", () => {
    it("allows Requester A to indicate problem appears resolved without formally closing ticket", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticketAId}/indicate-resolved`)
        .set("Authorization", `Bearer ${requesterAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ticket.requesterIndicatedResolved).toBe(true);

      // Verify in database: ticket status is still NEW (not CLOSED or RESOLVED)
      const ticket = await getPrisma().ticket.findUnique({
        where: { id: ticketAId },
      });
      expect(ticket?.requesterIndicatedResolved).toBe(true);
      expect(ticket?.status).toBe("NEW");
    });
  });

  // -------------------------------------------------------------------------
  // RBAC & Permission Boundaries (AC-10, AC-23, BR-10)
  // -------------------------------------------------------------------------
  describe("RBAC & Permission Boundaries", () => {
    it("rejects Requester attempt to access IT Staff internal notes with 403 Forbidden (AC-10)", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${ticketAId}/internal-notes`)
        .set("Authorization", `Bearer ${requesterAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rejects Requester attempt to query IT Staff queue endpoint with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${requesterAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rejects Requester attempt to access Administrator endpoints with 403 Forbidden (AC-23)", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${requesterAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rejects IT Staff attempt to access Requester-only ticket creation endpoint with 403 Forbidden", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          summary: "Staff trying to create ticket as requester",
          description: "This should be denied under strict role partitioning.",
          categoryId: testCategory.id,
          relatedSystemId: testSystem.id,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rejects Administrator attempt to access Requester-only ticket list endpoint with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rejects unauthenticated request to /api/tickets with 401 Unauthorized", async () => {
      const res = await request(app).get("/api/tickets");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });
});
