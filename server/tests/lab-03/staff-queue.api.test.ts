import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createSession } from "../../src/services/auth.js";

describe("Work Item 5: IT Staff Queue & Operational Discovery", () => {
  let staffToken: string;
  let adminToken: string;
  let requesterToken: string;

  let staffId: number;
  let sampleTicketId: number;

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
      throw new Error("Required seed users not found in database.");
    }

    staffId = userStaff.id;
    staffToken = await createSession(userStaff.id);
    adminToken = await createSession(userAdmin.id);
    requesterToken = await createSession(userRequester.id);

    // Get a ticket owned by the requester
    const ticket = await prisma.ticket.findFirst({
      where: { requesterId: userRequester.id },
    });
    if (!ticket) throw new Error("No ticket found for sample requester.");
    sampleTicketId = ticket.id;
  });

  // -------------------------------------------------------------------------
  // API-12: Staff queue — search, filters, pagination
  // -------------------------------------------------------------------------
  describe("API-12: GET /api/staff/tickets (Staff Queue)", () => {
    it("returns 200 with tickets and pagination for IT Staff", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("tickets");
      expect(res.body).toHaveProperty("pagination");
      expect(Array.isArray(res.body.tickets)).toBe(true);
      expect(res.body.pagination).toMatchObject({
        page: 1,
        pageSize: 10,
        totalTickets: expect.any(Number),
        totalPages: expect.any(Number),
      });
    });

    it("returns 200 with tickets and pagination for Administrator", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("tickets");
    });

    it("returns ticket objects with expected fields", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      if (res.body.tickets.length > 0) {
        const ticket = res.body.tickets[0];
        expect(ticket).toHaveProperty("id");
        expect(ticket).toHaveProperty("ticketNumber");
        expect(ticket).toHaveProperty("summary");
        expect(ticket).toHaveProperty("requestedPriority");
        expect(ticket).toHaveProperty("itPriority");
        expect(ticket).toHaveProperty("status");
        expect(ticket).toHaveProperty("requesterIndicatedResolved");
        expect(ticket).toHaveProperty("createdAt");
        expect(ticket).toHaveProperty("updatedAt");
        expect(ticket).toHaveProperty("category");
        expect(ticket).toHaveProperty("requester");
      }
    });

    it("filters by status correctly", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?status=NEW")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      for (const ticket of res.body.tickets) {
        expect(ticket.status).toBe("NEW");
      }
    });

    it("filters by itPriority correctly", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?itPriority=HIGH")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      for (const ticket of res.body.tickets) {
        expect(ticket.itPriority).toBe("HIGH");
      }
    });

    it("filters by ownerId=unassigned returns only unassigned tickets", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?ownerId=unassigned")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      for (const ticket of res.body.tickets) {
        expect(ticket.owner).toBeNull();
      }
    });

    it("respects pageSize parameter", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?pageSize=3")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBeLessThanOrEqual(3);
      expect(res.body.pagination.pageSize).toBe(3);
    });

    it("search parameter filters by summary or ticket number", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?search=TKT")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      for (const ticket of res.body.tickets) {
        const matchesSummary = ticket.summary?.toLowerCase().includes("tkt");
        const matchesTicketNumber = ticket.ticketNumber?.toLowerCase().includes("tkt");
        expect(matchesSummary || matchesTicketNumber).toBe(true);
      }
    });

    it("returns 401 for unauthenticated request", async () => {
      const res = await request(app).get("/api/staff/tickets");
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // API-13: Requester is forbidden from staff queue
  // -------------------------------------------------------------------------
  describe("API-13: Requester cannot access staff queue (403 RBAC enforcement)", () => {
    it("returns 403 Forbidden when Requester calls GET /api/staff/tickets", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("returns 403 Forbidden when Requester calls GET /api/staff/tickets/:id", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${sampleTicketId}`)
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("returns 403 Forbidden when Requester calls GET /api/staff/members", async () => {
      const res = await request(app)
        .get("/api/staff/members")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  // -------------------------------------------------------------------------
  // API-14: Staff ticket detail
  // -------------------------------------------------------------------------
  describe("API-14: GET /api/staff/tickets/:id (Staff Ticket Detail)", () => {
    it("returns 200 with full operational ticket detail for IT Staff", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${sampleTicketId}`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("ticket");
      const ticket = res.body.ticket;
      expect(ticket).toHaveProperty("id", sampleTicketId);
      expect(ticket).toHaveProperty("ticketNumber");
      expect(ticket).toHaveProperty("summary");
      expect(ticket).toHaveProperty("description");
      expect(ticket).toHaveProperty("requestedPriority");
      expect(ticket).toHaveProperty("itPriority");
      expect(ticket).toHaveProperty("status");
      expect(ticket).toHaveProperty("requesterIndicatedResolved");
      expect(ticket).toHaveProperty("category");
      expect(ticket).toHaveProperty("requester");
      expect(ticket).toHaveProperty("attachments");
      expect(Array.isArray(ticket.attachments)).toBe(true);
    });

    it("returns 200 with full ticket detail for Administrator", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${sampleTicketId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ticket.id).toBe(sampleTicketId);
    });

    it("returns 404 for non-existent ticket id", async () => {
      const res = await request(app)
        .get("/api/staff/tickets/999999999")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  // -------------------------------------------------------------------------
  // Staff members list
  // -------------------------------------------------------------------------
  describe("GET /api/staff/members (Staff Members List)", () => {
    it("returns list of active IT Staff and Admin users for IT Staff", async () => {
      const res = await request(app)
        .get("/api/staff/members")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        const member = res.body[0];
        expect(member).toHaveProperty("id");
        expect(member).toHaveProperty("name");
        expect(member).toHaveProperty("email");
        expect(member).toHaveProperty("role");
        expect(["IT_STAFF", "ADMINISTRATOR"]).toContain(member.role);
      }
    });

    it("does not include inactive staff members", async () => {
      const prisma = getPrisma();
      const inactiveStaff = await prisma.user.findFirst({
        where: { isActive: false, role: "IT_STAFF" },
      });
      if (!inactiveStaff) return; // Skip if no inactive staff in seed

      const res = await request(app)
        .get("/api/staff/members")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.map((m: { id: number }) => m.id);
      expect(ids).not.toContain(inactiveStaff.id);
    });

    it("does not include REQUESTER role users", async () => {
      const res = await request(app)
        .get("/api/staff/members")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      for (const member of res.body) {
        expect(member.role).not.toBe("REQUESTER");
      }
    });
  });
});
