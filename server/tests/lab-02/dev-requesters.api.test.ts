import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Issue 2: Development Requester & Reference Data APIs", () => {
  describe("GET /api/dev-requesters", () => {
    it("returns 200 and a list containing only active development requesters", async () => {
      const res = await request(app).get("/api/dev-requesters");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(4);

      // Verify that every returned requester is active
      for (const req of res.body) {
        expect(req).toHaveProperty("id");
        expect(req).toHaveProperty("name");
        expect(req).toHaveProperty("email");
        expect(req).toHaveProperty("department");
        expect(req.isActive).toBe(true);
      }

      // Verify inactive requester is excluded
      const inactive = res.body.find((r: { email: string }) => r.email === "alex.inactive@toktickit.local");
      expect(inactive).toBeUndefined();
    });
  });

  describe("GET /api/categories", () => {
    it("returns 200 and 4 active categories", async () => {
      const res = await request(app).get("/api/categories");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(4);
      expect(res.body.every((c: { isActive: boolean }) => c.isActive !== false)).toBe(true);
    });
  });

  describe("GET /api/related-systems", () => {
    it("returns 200 and at least 6 active related systems", async () => {
      const res = await request(app).get("/api/related-systems");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(6);
      expect(res.body.every((s: { isActive: boolean }) => s.isActive !== false)).toBe(true);
    });
  });

  describe("Requester Context Middleware (X-Dev-Requester-Id)", () => {
    it("returns 400 when X-Dev-Requester-Id is missing on requester-scoped endpoint", async () => {
      const res = await request(app).get("/api/dev-requesters/me");
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("returns 403 when X-Dev-Requester-Id belongs to an inactive requester", async () => {
      const inactiveUser = await getPrisma().devRequester.findUnique({
        where: { email: "alex.inactive@toktickit.local" },
      });
      expect(inactiveUser).toBeDefined();

      const res = await request(app)
        .get("/api/dev-requesters/me")
        .set("X-Dev-Requester-Id", String(inactiveUser!.id));
      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/inactive/i);
    });

    it("returns 200 with requester info when X-Dev-Requester-Id is active", async () => {
      const activeUser = await getPrisma().devRequester.findFirst({
        where: { isActive: true },
      });
      expect(activeUser).toBeDefined();

      const res = await request(app)
        .get("/api/dev-requesters/me")
        .set("X-Dev-Requester-Id", String(activeUser!.id));
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(activeUser!.id);
      expect(res.body.name).toBe(activeUser!.name);
      expect(res.body.isActive).toBe(true);
    });
  });
});
