import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createSession } from "../../src/services/auth.js";
import { TicketStatus, ITPriority, Role } from "@prisma/client";

describe("Work Item 6: Staff Ticket Operations & Status Transitions", () => {
  let staffToken: string;
  let staff2Token: string;
  let adminToken: string;
  let requesterToken: string;

  let staffUser: { id: number; name: string; email: string };
  let staff2User: { id: number; name: string; email: string };
  let testTicketId: number;

  beforeAll(async () => {
    const prisma = getPrisma();

    const userStaff = await prisma.user.findUnique({
      where: { email: "staff.alex@toktickit.local" },
    });
    const userStaff2 = await prisma.user.findUnique({
      where: { email: "staff.emily@toktickit.local" },
    });
    const userAdmin = await prisma.user.findUnique({
      where: { email: "admin.boss@toktickit.local" },
    });
    const userRequester = await prisma.user.findUnique({
      where: { email: "jennifer.anderson@toktickit.local" },
    });

    if (!userStaff || !userStaff2 || !userAdmin || !userRequester) {
      throw new Error("Required seed users not found.");
    }

    staffUser = userStaff;
    staff2User = userStaff2;

    staffToken = await createSession(userStaff.id);
    staff2Token = await createSession(userStaff2.id);
    adminToken = await createSession(userAdmin.id);
    requesterToken = await createSession(userRequester.id);

    // Create a fresh test ticket starting at NEW with no owner
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-${Date.now().toString().slice(-6)}`,
        summary: "Staff Operations Test Ticket",
        description: "Testing claim, priority, and state transitions.",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        status: TicketStatus.NEW,
        requesterId: userRequester.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
      },
    });

    testTicketId = ticket.id;
  });

  // -------------------------------------------------------------------------
  // API-15: Claim / Assign Ticket Ownership
  // -------------------------------------------------------------------------
  describe("API-15: Ticket Ownership Management (PATCH /api/staff/tickets/:id/owner)", () => {
    it("allows IT Staff to claim an unassigned ticket", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/owner`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ ownerId: staffUser.id });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message", "Ticket owner updated");
      expect(res.body.ticket.ownerId).toBe(staffUser.id);
      expect(res.body.ticket.owner.name).toBe(staffUser.name);
    });

    it("allows IT Staff to reassign ticket to another active staff member", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/owner`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ ownerId: staff2User.id });

      expect(res.status).toBe(200);
      expect(res.body.ticket.ownerId).toBe(staff2User.id);
      expect(res.body.ticket.owner.name).toBe(staff2User.name);
    });

    it("allows IT Staff to unassign ticket owner by passing null", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/owner`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ ownerId: null });

      expect(res.status).toBe(200);
      expect(res.body.ticket.ownerId).toBeNull();
      expect(res.body.ticket.owner).toBeNull();
    });

    it("rejects assignment to a Requester user with 400 Bad Request", async () => {
      const prisma = getPrisma();
      const requester = await prisma.user.findFirst({
        where: { role: Role.REQUESTER },
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/owner`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ ownerId: requester!.id });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });

    it("rejects assignment to an inactive staff member with 400 Bad Request", async () => {
      const prisma = getPrisma();
      const inactiveStaff = await prisma.user.findFirst({
        where: { role: Role.IT_STAFF, isActive: false },
      });

      if (inactiveStaff) {
        const res = await request(app)
          .patch(`/api/staff/tickets/${testTicketId}/owner`)
          .set("Authorization", `Bearer ${staffToken}`)
          .send({ ownerId: inactiveStaff.id });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("BAD_REQUEST");
      }
    });

    it("returns 403 Forbidden when Requester attempts to update owner", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/owner`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ ownerId: staffUser.id });

      expect(res.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // IT Priority Updates
  // -------------------------------------------------------------------------
  describe("IT Priority Management (PATCH /api/staff/tickets/:id/priority)", () => {
    it("allows IT Staff to update IT Priority to HIGH", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/priority`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ itPriority: "HIGH" });

      expect(res.status).toBe(200);
      expect(res.body.ticket.itPriority).toBe("HIGH");
    });

    it("rejects invalid IT priority values with 400 Bad Request", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/priority`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ itPriority: "CRITICAL" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });
  });

  // -------------------------------------------------------------------------
  // API-16 & API-17: Permitted & Illegal Status Transitions (BR-15)
  // -------------------------------------------------------------------------
  describe("API-16 & API-17: Status Transition State Machine (BR-15)", () => {
    it("API-17: rejects illegal transition (NEW -> CLOSED) with 400 Bad Request", async () => {
      // Ensure ticket is currently NEW
      const prisma = getPrisma();
      await prisma.ticket.update({
        where: { id: testTicketId },
        data: { status: TicketStatus.NEW },
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "CLOSED" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
      expect(res.body.error.message).toMatch(/not permitted/i);
    });

    it("API-17: rejects illegal transition (NEW -> RESOLVED) with 400 Bad Request", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "RESOLVED" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });

    it("API-16: executes permitted transition (NEW -> IN_PROGRESS)", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "IN_PROGRESS" });

      expect(res.status).toBe(200);
      expect(res.body.ticket.status).toBe("IN_PROGRESS");
    });

    it("API-16: executes permitted transition (IN_PROGRESS -> WAITING_FOR_REQUESTER)", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "WAITING_FOR_REQUESTER" });

      expect(res.status).toBe(200);
      expect(res.body.ticket.status).toBe("WAITING_FOR_REQUESTER");
    });

    it("API-16: executes permitted transition (WAITING_FOR_REQUESTER -> RESOLVED)", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "RESOLVED" });

      expect(res.status).toBe(200);
      expect(res.body.ticket.status).toBe("RESOLVED");
    });

    it("API-16: executes permitted transition (RESOLVED -> REOPENED)", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "REOPENED" });

      expect(res.status).toBe(200);
      expect(res.body.ticket.status).toBe("REOPENED");
    });

    it("API-16: executes permitted transition (REOPENED -> IN_PROGRESS -> RESOLVED -> CLOSED)", async () => {
      // REOPENED -> RESOLVED
      let res = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "RESOLVED" });
      expect(res.status).toBe(200);

      // RESOLVED -> CLOSED
      res = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "CLOSED" });
      expect(res.status).toBe(200);
      expect(res.body.ticket.status).toBe("CLOSED");
    });

    it("API-17: rejects transition from terminal state CLOSED to any other status", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "OPEN" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });
  });

  // -------------------------------------------------------------------------
  // Combined PATCH /api/staff/tickets/:id
  // -------------------------------------------------------------------------
  describe("General PATCH /api/staff/tickets/:id", () => {
    it("updates multiple operational fields simultaneously", async () => {
      const prisma = getPrisma();
      // Reset status to OPEN for this test
      await prisma.ticket.update({
        where: { id: testTicketId },
        data: { status: TicketStatus.OPEN },
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          ownerId: staffUser.id,
          itPriority: "LOW",
          status: "IN_PROGRESS",
        });

      expect(res.status).toBe(200);
      expect(res.body.ticket.ownerId).toBe(staffUser.id);
      expect(res.body.ticket.itPriority).toBe("LOW");
      expect(res.body.ticket.status).toBe("IN_PROGRESS");
    });
  });
});
