import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Issue 3: Create Ticket API (POST /api/tickets)", () => {
  const getActiveContext = async () => {
    const prisma = getPrisma();
    const requester = await prisma.devRequester.findFirst({ where: { isActive: true } });
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
    return {
      requesterId: requester!.id,
      categoryId: category!.id,
      relatedSystemId: system!.id,
    };
  };

  it("API-03: creates a ticket with valid data and returns official Ticket Number (201 Created)", async () => {
    const ctx = await getActiveContext();

    const payload = {
      summary: "Cannot access network shared drive",
      description: "Getting access denied error when opening Z: drive from work laptop since morning.",
      categoryId: ctx.categoryId,
      relatedSystemId: ctx.relatedSystemId,
      requestedPriority: "HIGH",
    };

    const res = await request(app)
      .post("/api/tickets")
      .set("X-Dev-Requester-Id", String(ctx.requesterId))
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.summary).toBe(payload.summary);
    expect(res.body.description).toBe(payload.description);
    expect(res.body.requestedPriority).toBe("HIGH");
    expect(res.body.status).toBe("NEW");
    expect(res.body.requesterId).toBe(ctx.requesterId);
    expect(res.body.category).toBeDefined();
    expect(res.body.category.id).toBe(ctx.categoryId);
    expect(res.body.relatedSystem).toBeDefined();
    expect(res.body.relatedSystem.id).toBe(ctx.relatedSystemId);
  });

  it("API-04: rejects ticket creation with missing or invalid fields (400 Bad Request)", async () => {
    const ctx = await getActiveContext();

    // Summary too short (< 5 chars)
    const resShortSummary = await request(app)
      .post("/api/tickets")
      .set("X-Dev-Requester-Id", String(ctx.requesterId))
      .send({
        summary: "Fix",
        description: "Valid description longer than 10 characters",
        categoryId: ctx.categoryId,
        relatedSystemId: ctx.relatedSystemId,
        requestedPriority: "MEDIUM",
      });
    expect(resShortSummary.status).toBe(400);
    expect(resShortSummary.body.error).toBeDefined();

    // Description too short (< 10 chars)
    const resShortDesc = await request(app)
      .post("/api/tickets")
      .set("X-Dev-Requester-Id", String(ctx.requesterId))
      .send({
        summary: "Valid summary text",
        description: "Too short",
        categoryId: ctx.categoryId,
        relatedSystemId: ctx.relatedSystemId,
        requestedPriority: "MEDIUM",
      });
    expect(resShortDesc.status).toBe(400);

    // Invalid priority enum
    const resInvalidPriority = await request(app)
      .post("/api/tickets")
      .set("X-Dev-Requester-Id", String(ctx.requesterId))
      .send({
        summary: "Valid summary text",
        description: "Valid description longer than 10 characters",
        categoryId: ctx.categoryId,
        relatedSystemId: ctx.relatedSystemId,
        requestedPriority: "URGENT_INVALID",
      });
    expect(resInvalidPriority.status).toBe(400);

    // Non-existent category
    const resInvalidCat = await request(app)
      .post("/api/tickets")
      .set("X-Dev-Requester-Id", String(ctx.requesterId))
      .send({
        summary: "Valid summary text",
        description: "Valid description longer than 10 characters",
        categoryId: 999999,
        relatedSystemId: ctx.relatedSystemId,
        requestedPriority: "MEDIUM",
      });
    expect(resInvalidCat.status).toBe(400);
  });

  it("API-05: ignores client-supplied ticketNumber, status, or requesterId in body", async () => {
    const ctx = await getActiveContext();
    const otherRequester = await getPrisma().devRequester.findFirst({
      where: { isActive: true, id: { not: ctx.requesterId } },
    });

    const forgedPayload = {
      ticketNumber: "TKT-1999-999999",
      status: "RESOLVED",
      requesterId: otherRequester?.id || 9999,
      summary: "Attempting to spoof ticket authority",
      description: "This test verifies that client cannot forge ticket number, status or ownership.",
      categoryId: ctx.categoryId,
      relatedSystemId: ctx.relatedSystemId,
      requestedPriority: "LOW",
    };

    const res = await request(app)
      .post("/api/tickets")
      .set("X-Dev-Requester-Id", String(ctx.requesterId))
      .send(forgedPayload);

    expect(res.status).toBe(201);
    expect(res.body.ticketNumber).not.toBe("TKT-1999-999999");
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.status).toBe("NEW");
    expect(res.body.requesterId).toBe(ctx.requesterId);
  });

  it("generates atomic sequential ticket numbers across successive creations", async () => {
    const ctx = await getActiveContext();

    const createOne = () =>
      request(app)
        .post("/api/tickets")
        .set("X-Dev-Requester-Id", String(ctx.requesterId))
        .send({
          summary: "Sequential ticket generation test",
          description: "Testing that sequential numbers increment atomically.",
          categoryId: ctx.categoryId,
          relatedSystemId: ctx.relatedSystemId,
          requestedPriority: "MEDIUM",
        });

    const res1 = await createOne();
    const res2 = await createOne();

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);

    const num1 = parseInt(res1.body.ticketNumber.split("-")[2], 10);
    const num2 = parseInt(res2.body.ticketNumber.split("-")[2], 10);
    expect(num2).toBe(num1 + 1);
  });
});
