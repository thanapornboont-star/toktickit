import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

// API-02: GET /api/categories returns the four seeded categories in id order.
// Requires the DB to be migrated and seeded first (see server/prisma/seed.ts).
describe("GET /api/categories", () => {
  it("returns the four seeded categories in id order", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(4);

    const names = res.body.map((c: { id: number; name: string }) => c.name);
    expect(names).toEqual([
      "Account and Access",
      "Hardware",
      "Software",
      "Network",
    ]);

    // verify ids are in ascending order
    const ids = res.body.map((c: { id: number }) => c.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });
});
