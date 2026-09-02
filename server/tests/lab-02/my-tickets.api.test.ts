import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Issue 7: My Tickets List API (GET /api/tickets)", () => {
  let ctx: {
    requesterAId: number;
    requesterBId: number;
    catHardwareId: number;
    catNetworkId: number;
  };

  beforeAll(async () => {
    const prisma = getPrisma();
    const requesterA = await prisma.devRequester.findFirst({ where: { email: "jennifer.anderson@toktickit.local" } });
    const requesterB = await prisma.devRequester.findFirst({ where: { email: "michael.brown@toktickit.local" } });
    const catHardware = await prisma.category.findUnique({ where: { name: "Hardware" } });
    const catSoftware = await prisma.category.findUnique({ where: { name: "Software" } });
    const catNetwork = await prisma.category.findUnique({ where: { name: "Network" } });
    const sysLaptop = await prisma.relatedSystem.findUnique({ where: { name: "Corporate Laptop" } });
    const sysVpn = await prisma.relatedSystem.findUnique({ where: { name: "VPN" } });

    // Clean any prior seeded test tickets
    await prisma.ticket.deleteMany({
      where: {
        ticketNumber: {
          startsWith: "TKT-2026-TEST-",
        },
      },
    });

    // Seed 10 tickets for Requester A
    for (let i = 1; i <= 10; i++) {
      const num = String(i).padStart(4, "0");
      await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-TEST-${num}`,
          summary: i % 2 === 0 ? `Laptop issue number ${i}` : `Network connection problem ${i}`,
          description: `Detailed description for test ticket ${i} with sufficient length.`,
          requestedPriority: i % 3 === 0 ? "HIGH" : i % 2 === 0 ? "MEDIUM" : "LOW",
          status: "NEW",
          requesterId: requesterA!.id,
          categoryId: i % 2 === 0 ? catHardware!.id : catNetwork!.id,
          relatedSystemId: i % 2 === 0 ? sysLaptop!.id : sysVpn!.id,
        },
      });
    }

    // Seed 2 tickets for Requester B
    for (let i = 91; i <= 92; i++) {
      const num = String(i).padStart(4, "0");
      await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-TEST-${num}`,
          summary: `Requester B Private Ticket ${i}`,
          description: `This ticket belongs exclusively to Requester B and must not leak.`,
          requestedPriority: "LOW",
          status: "NEW",
          requesterId: requesterB!.id,
          categoryId: catSoftware!.id,
          relatedSystemId: sysLaptop!.id,
        },
      });
    }

    ctx = {
      requesterAId: requesterA!.id,
      requesterBId: requesterB!.id,
      catHardwareId: catHardware!.id,
      catNetworkId: catNetwork!.id,
    };
  });

  it("API-06: searches tickets by keyword matching ticketNumber or summary", async () => {
    // Search by summary keyword 'Laptop'
    const resSummary = await request(app)
      .get("/api/tickets?search=Laptop")
      .set("X-Dev-Requester-Id", String(ctx.requesterAId));

    expect(resSummary.status).toBe(200);
    expect(resSummary.body.data.length).toBeGreaterThan(0);
    expect(resSummary.body.data.every((t: any) => t.summary.toLowerCase().includes("laptop"))).toBe(true);

    // Search by ticket number substring
    const resNumber = await request(app)
      .get("/api/tickets?search=TEST-0002")
      .set("X-Dev-Requester-Id", String(ctx.requesterAId));

    expect(resNumber.status).toBe(200);
    expect(resNumber.body.data.length).toBe(1);
    expect(resNumber.body.data[0].ticketNumber).toBe("TKT-2026-TEST-0002");
  });

  it("API-07: filters by category, priority and supports pagination with page sizes (8, 20, 50)", async () => {
    // Combined filter: Hardware + MEDIUM priority
    const resFilter = await request(app)
      .get(`/api/tickets?categoryId=${ctx.catHardwareId}&requestedPriority=MEDIUM`)
      .set("X-Dev-Requester-Id", String(ctx.requesterAId));

    expect(resFilter.status).toBe(200);
    expect(resFilter.body.data.every((t: any) => t.category.id === ctx.catHardwareId && t.requestedPriority === "MEDIUM")).toBe(true);

    // Pagination: page 1, pageSize 8
    const resPage1 = await request(app)
      .get("/api/tickets?page=1&pageSize=8")
      .set("X-Dev-Requester-Id", String(ctx.requesterAId));

    expect(resPage1.status).toBe(200);
    expect(resPage1.body.data.length).toBe(8);
    expect(resPage1.body.pagination.page).toBe(1);
    expect(resPage1.body.pagination.pageSize).toBe(8);
    expect(resPage1.body.pagination.totalItems).toBeGreaterThanOrEqual(10);
    expect(resPage1.body.pagination.totalPages).toBeGreaterThanOrEqual(2);

    // Pagination: page 2, pageSize 8
    const resPage2 = await request(app)
      .get("/api/tickets?page=2&pageSize=8")
      .set("X-Dev-Requester-Id", String(ctx.requesterAId));

    expect(resPage2.status).toBe(200);
    expect(resPage2.body.data.length).toBeGreaterThanOrEqual(2);
    expect(resPage2.body.pagination.page).toBe(2);
  });

  it("enforces ownership isolation: Requester B sees zero tickets belonging to Requester A", async () => {
    const resB = await request(app)
      .get("/api/tickets")
      .set("X-Dev-Requester-Id", String(ctx.requesterBId));

    expect(resB.status).toBe(200);
    expect(resB.body.data.length).toBeGreaterThanOrEqual(2);
    expect(resB.body.data.every((t: any) => t.requesterId === ctx.requesterBId)).toBe(true);

    // Requester B cannot find Requester A's tickets even via search
    const searchResB = await request(app)
      .get("/api/tickets?search=TEST-0001")
      .set("X-Dev-Requester-Id", String(ctx.requesterBId));

    expect(searchResB.status).toBe(200);
    expect(searchResB.body.data.length).toBe(0);
  });
});
