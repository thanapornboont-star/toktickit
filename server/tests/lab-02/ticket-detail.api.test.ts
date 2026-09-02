import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Issue 8: Ticket Detail API (GET /api/tickets/:id)", () => {
  const setupTestContext = async () => {
    const prisma = getPrisma();
    const requesterA = await prisma.devRequester.findFirst({ where: { isActive: true } });
    const requesterB = await prisma.devRequester.findFirst({
      where: { isActive: true, id: { not: requesterA!.id } },
    });
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    const res = await request(app)
      .post("/api/tickets")
      .set("X-Dev-Requester-Id", String(requesterA!.id))
      .send({
        summary: "Ticket for testing detail retrieval",
        description: "Comprehensive testing of the ticket detail endpoint.",
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "HIGH",
      });

    return {
      ticketId: res.body.id,
      requesterAId: requesterA!.id,
      requesterBId: requesterB!.id,
    };
  };

  it("API-08a: retrieves owned ticket detail with requester, category, related system, and attachments", async () => {
    const ctx = await setupTestContext();

    const uploadRes = await request(app)
      .post(`/api/tickets/${ctx.ticketId}/attachments`)
      .set("X-Dev-Requester-Id", String(ctx.requesterAId))
      .attach("file", Buffer.from("%PDF-1.4 dummy pdf"), "evidence.pdf");
    expect(uploadRes.status).toBe(201);

    const detailRes = await request(app)
      .get(`/api/tickets/${ctx.ticketId}`)
      .set("X-Dev-Requester-Id", String(ctx.requesterAId));

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.id).toBe(ctx.ticketId);
    expect(detailRes.body.summary).toBe("Ticket for testing detail retrieval");
    expect(detailRes.body.requester).toHaveProperty("name");
    expect(detailRes.body.category).toHaveProperty("name");
    expect(detailRes.body.relatedSystem).toHaveProperty("name");
    expect(Array.isArray(detailRes.body.attachments)).toBe(true);
    expect(detailRes.body.attachments).toHaveLength(1);
    expect(detailRes.body.attachments[0].originalFilename).toBe("evidence.pdf");
  });

  it("API-08b: rejects retrieval of a ticket that does not exist", async () => {
    const requesterA = await getPrisma().devRequester.findFirst({ where: { isActive: true } });
    const res = await request(app)
      .get("/api/tickets/999999999")
      .set("X-Dev-Requester-Id", String(requesterA!.id));
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it("API-08c (AC-03/BR-06): rejects retrieval of a ticket owned by another requester", async () => {
    const ctx = await setupTestContext();

    const crossRes = await request(app)
      .get(`/api/tickets/${ctx.ticketId}`)
      .set("X-Dev-Requester-Id", String(ctx.requesterBId));

    expect(crossRes.status).toBe(404);
    expect(crossRes.body.error.code).toBe("NOT_FOUND");
  });
});
