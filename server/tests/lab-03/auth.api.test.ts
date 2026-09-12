import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Work Item 3: Authentication & Account-Entry API Tests", () => {
  const activeRequesterEmail = "jennifer.anderson@toktickit.local";
  const validPassword = "Password123!";
  const inactiveRequesterEmail = "alex.inactive@toktickit.local";
  const mustChangeRequesterEmail = "new.user@toktickit.local";
  const initialPassword = "Initial123!";

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.user.upsert({
      where: { email: mustChangeRequesterEmail },
      update: {
        passwordHash: bcrypt.hashSync(initialPassword, 10),
        mustChangePassword: true,
        isActive: true,
      },
      create: {
        name: "New Requester",
        email: mustChangeRequesterEmail,
        passwordHash: bcrypt.hashSync(initialPassword, 10),
        mustChangePassword: true,
        role: "REQUESTER",
        isActive: true,
      },
    });
  });

  describe("POST /api/auth/login", () => {
    it("API-01: returns 200 with session token and safe user profile for valid credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: activeRequesterEmail,
          password: validPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(typeof res.body.token).toBe("string");
      expect(res.body.token).toMatch(/^toktickit_session_/);

      expect(res.body).toHaveProperty("user");
      expect(res.body.user.email).toBe(activeRequesterEmail);
      expect(res.body.user.name).toBe("Jennifer Anderson");
      expect(res.body.user.role).toBe("REQUESTER");
      expect(res.body.user.isActive).toBe(true);
      expect(res.body.user.mustChangePassword).toBe(false);
      // Ensure passwordHash is NOT returned in response
      expect(res.body.user).not.toHaveProperty("passwordHash");
    });

    it("API-02: returns 401 Unauthorized with generic message on wrong password (BR-02)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: activeRequesterEmail,
          password: "WrongPassword999!",
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("UNAUTHORIZED");
      expect(res.body.error.message).toMatch(/invalid email or password/i);
    });

    it("API-02b: returns 401 Unauthorized with generic message on unknown email (BR-02)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "unknown.user.doesnotexist@toktickit.local",
          password: validPassword,
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("UNAUTHORIZED");
      expect(res.body.error.message).toMatch(/invalid email or password/i);
    });

    it("API-03: returns 403 Forbidden when authenticating with a deactivated account (BR-01)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: inactiveRequesterEmail,
          password: validPassword,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("ACCOUNT_DEACTIVATED");
      expect(res.body.error.message).toMatch(/deactivated/i);
    });

    it("returns 400 Bad Request when email or password is missing", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: activeRequesterEmail });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("API-04: returns user with mustChangePassword: true for users with initial password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: mustChangeRequesterEmail,
          password: initialPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.user.mustChangePassword).toBe(true);
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns current user profile when valid Bearer token is provided", async () => {
      // 1. Login to get token
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: activeRequesterEmail, password: validPassword });
      const token = loginRes.body.token;

      // 2. Call /api/auth/me
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.email).toBe(activeRequesterEmail);
      expect(meRes.body.user.role).toBe("REQUESTER");
    });

    it("returns 401 when Authorization header is missing or invalid", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);

      const invalidRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid_token_12345");
      expect(invalidRes.status).toBe(401);
    });
  });

  describe("POST /api/auth/change-password", () => {
    it("rejects request if current password is incorrect (401)", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: mustChangeRequesterEmail, password: initialPassword });
      const token = loginRes.body.token;

      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "WrongInitialPassword!",
          newPassword: "BrandNewSecurePassword123!",
          confirmPassword: "BrandNewSecurePassword123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/current password is incorrect/i);
    });

    it("rejects request if newPassword and confirmPassword do not match (400)", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: mustChangeRequesterEmail, password: initialPassword });
      const token = loginRes.body.token;

      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: initialPassword,
          newPassword: "BrandNewSecurePassword123!",
          confirmPassword: "MismatchedPassword123!",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/do not match/i);
    });

    it("rejects weak passwords failing policy (e.g. < 8 chars, missing upper/lower/special) (400) (BR-04)", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: mustChangeRequesterEmail, password: initialPassword });
      const token = loginRes.body.token;

      const weakPasswords = [
        "short1!", // < 8 chars
        "alllowercase123!", // no uppercase
        "ALLUPPERCASE123!", // no lowercase
        "NoNumbersOrSpecial", // no number/special
      ];

      for (const weak of weakPasswords) {
        const res = await request(app)
          .post("/api/auth/change-password")
          .set("Authorization", `Bearer ${token}`)
          .send({
            currentPassword: initialPassword,
            newPassword: weak,
            confirmPassword: weak,
          });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("INVALID_PASSWORD_POLICY");
      }
    });

    it("API-05: successfully updates password, clears mustChangePassword flag, and permits login with new password", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: mustChangeRequesterEmail, password: initialPassword });
      const token = loginRes.body.token;

      const newSecurePassword = "UpdatedSecurePass2026!";

      const changeRes = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: initialPassword,
          newPassword: newSecurePassword,
          confirmPassword: newSecurePassword,
        });

      expect(changeRes.status).toBe(200);
      expect(changeRes.body.user.mustChangePassword).toBe(false);

      // Verify old password no longer works
      const oldLoginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: mustChangeRequesterEmail, password: initialPassword });
      expect(oldLoginRes.status).toBe(401);

      // Verify new password works
      const newLoginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: mustChangeRequesterEmail, password: newSecurePassword });
      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body.user.mustChangePassword).toBe(false);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("API-06: invalidates the session token so subsequent requests return 401 (BR-06)", async () => {
      // 1. Login
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: activeRequesterEmail, password: validPassword });
      const token = loginRes.body.token;

      // 2. Verify token works
      const preLogoutRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);
      expect(preLogoutRes.status).toBe(200);

      // 3. Logout
      const logoutRes = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${token}`);
      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toMatch(/logged out successfully/i);

      // 4. Verify revoked token returns 401 Unauthorized
      const postLogoutRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);
      expect(postLogoutRes.status).toBe(401);
      expect(postLogoutRes.body.error.code).toBe("UNAUTHORIZED");
    });
  });
});
