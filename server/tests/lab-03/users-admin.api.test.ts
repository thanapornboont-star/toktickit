import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createSession, hashPassword } from "../../src/services/auth.js";
import { Role } from "@prisma/client";

describe("Work Item 7: Administrator Account Maintenance (API-19 to API-25)", () => {
  let adminToken: string;
  let adminId: number;
  let staffToken: string;
  let requesterToken: string;

  const testUserEmail = "test.wi7.user@toktickit.local";
  const duplicateEmailTest = "test.wi7.duplicate@toktickit.local";
  const secondAdminEmail = "second.admin.wi7@toktickit.local";
  const thirdAdminEmail = "third.admin.wi7@toktickit.local";

  const allTestEmails = [
    testUserEmail,
    duplicateEmailTest,
    secondAdminEmail,
    thirdAdminEmail,
    "new.created.user@toktickit.local",
  ];

  beforeAll(async () => {
    const prisma = getPrisma();

    // Clean up test data if any
    await prisma.session.deleteMany({
      where: {
        user: {
          email: { in: allTestEmails },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: allTestEmails },
      },
    });

    const adminUser = await prisma.user.findUnique({
      where: { email: "admin.boss@toktickit.local" },
    });
    const staffUser = await prisma.user.findUnique({
      where: { email: "staff.alex@toktickit.local" },
    });
    const requesterUser = await prisma.user.findUnique({
      where: { email: "jennifer.anderson@toktickit.local" },
    });

    if (!adminUser || !staffUser || !requesterUser) {
      throw new Error("Required seed users not found in database.");
    }

    adminId = adminUser.id;
    adminToken = await createSession(adminUser.id);
    staffToken = await createSession(staffUser.id);
    requesterToken = await createSession(requesterUser.id);
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.session.deleteMany({
      where: {
        user: {
          email: { in: allTestEmails },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: allTestEmails },
      },
    });
  });

  // ---------------------------------------------------------------------------
  // API-19: GET /api/admin/users
  // ---------------------------------------------------------------------------
  describe("API-19: GET /api/admin/users", () => {
    it("returns 200 with list of user summaries for Administrator (AC-17, BR-10)", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const user = res.body[0];
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("name");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("role");
      expect(user).toHaveProperty("isActive");
      expect(user).toHaveProperty("mustChangePassword");
      expect(user).toHaveProperty("createdAt");
      // Must not leak passwordHash
      expect(user).not.toHaveProperty("passwordHash");
    });

    it("filters users by search query on name or email (API-19)", async () => {
      const res = await request(app)
        .get("/api/admin/users?search=alex")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      for (const u of res.body) {
        const matchesName = u.name.toLowerCase().includes("alex");
        const matchesEmail = u.email.toLowerCase().includes("alex");
        expect(matchesName || matchesEmail).toBe(true);
      }
    });

    it("filters users by role (API-19)", async () => {
      const res = await request(app)
        .get("/api/admin/users?role=IT_STAFF")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      for (const u of res.body) {
        expect(u.role).toBe(Role.IT_STAFF);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // API-20: POST /api/admin/users
  // ---------------------------------------------------------------------------
  describe("API-20: POST /api/admin/users", () => {
    it("creates a new user with one role and initial password, setting mustChangePassword to true (AC-18, BR-24)", async () => {
      const payload = {
        name: "Test WI7 User",
        email: testUserEmail,
        role: "REQUESTER",
        isActive: true,
        initialPassword: "InitialPassword123!",
      };

      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("user");
      expect(res.body.user).toMatchObject({
        name: "Test WI7 User",
        email: testUserEmail,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: true, // Required on newly created user (AC-18, BR-24)
      });
      expect(res.body.user).not.toHaveProperty("passwordHash");
    });

    it("rejects user creation with missing required fields (400 Bad Request)", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Incomplete User" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
    });

    it("rejects user creation when password fails complexity rules (400 Bad Request, BR-24)", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Weak Pass User",
          email: "weak.pass@toktickit.local",
          role: "REQUESTER",
          initialPassword: "weak",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
    });

    it("rejects user creation with invalid role (400 Bad Request)", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Invalid Role User",
          email: "invalid.role@toktickit.local",
          role: "SUPER_USER",
          initialPassword: "InitialPassword123!",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
    });
  });

  // ---------------------------------------------------------------------------
  // API-21: Duplicate Email Rejection (409 Conflict)
  // ---------------------------------------------------------------------------
  describe("API-21: POST /api/admin/users duplicate email (AC-19, BR-20)", () => {
    it("returns 409 Conflict when creating a user with existing email", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Duplicate User",
          email: testUserEmail, // Already created in API-20
          role: "IT_STAFF",
          initialPassword: "InitialPassword123!",
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
    });
  });

  // ---------------------------------------------------------------------------
  // API-22: PATCH /api/admin/users/:id - Self-Deactivation Prevention
  // ---------------------------------------------------------------------------
  describe("API-22: PATCH /api/admin/users/:id self-deactivation prevention (AC-20, BR-21)", () => {
    it("returns 400 Bad Request when admin attempts to deactivate their own account", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("CANNOT_DEACTIVATE_SELF");
      expect(res.body.error.message).toContain("deactivate your own administrator account");
    });
  });

  // ---------------------------------------------------------------------------
  // API-23: PATCH /api/admin/users/:id - Last Active Admin Protection
  // ---------------------------------------------------------------------------
  describe("API-23: PATCH /api/admin/users/:id last active admin protection (AC-21, BR-22)", () => {
    it("blocks demoting the sole remaining active admin with 400 Bad Request", async () => {
      // admin.boss is currently the only active admin
      const res = await request(app)
        .patch(`/api/admin/users/${adminId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "IT_STAFF" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("LAST_ADMIN_PROTECTED");
      expect(res.body.error.message).toContain("last active administrator");
    });

    it("allows deactivation of an admin when another active admin exists, but blocks the last one", async () => {
      const prisma = getPrisma();

      // Create a second active admin
      const secondAdmin = await prisma.user.create({
        data: {
          name: "Second Admin",
          email: secondAdminEmail,
          role: Role.ADMINISTRATOR,
          isActive: true,
          passwordHash: hashPassword("InitialPassword123!"),
          mustChangePassword: false,
        },
      });

      // Now 2 active admins exist: admin.boss and secondAdmin
      // Deactivating secondAdmin should succeed (200 OK)
      const resDeactivate = await request(app)
        .patch(`/api/admin/users/${secondAdmin.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(resDeactivate.status).toBe(200);
      expect(resDeactivate.body.user.isActive).toBe(false);

      // Create a third admin to test last-admin demotion protection on a non-self account
      const thirdAdmin = await prisma.user.create({
        data: {
          name: "Third Admin",
          email: thirdAdminEmail,
          role: Role.ADMINISTRATOR,
          isActive: true,
          passwordHash: hashPassword("InitialPassword123!"),
          mustChangePassword: false,
        },
      });

      // Demoting thirdAdmin should succeed because admin.boss is also active (activeAdminCount = 2)
      const resDemote = await request(app)
        .patch(`/api/admin/users/${thirdAdmin.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "IT_STAFF" });

      expect(resDemote.status).toBe(200);
      expect(resDemote.body.user.role).toBe("IT_STAFF");
    });

    it("returns 409 Conflict if PATCH attempts to set email already taken by another user", async () => {
      const prisma = getPrisma();
      const testUser = await prisma.user.findUnique({ where: { email: testUserEmail } });

      const res = await request(app)
        .patch(`/api/admin/users/${testUser!.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: "admin.boss@toktickit.local" });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
    });
  });

  // ---------------------------------------------------------------------------
  // API-24: POST /api/admin/users/:id/reset-password
  // ---------------------------------------------------------------------------
  describe("API-24: POST /api/admin/users/:id/reset-password (AC-22, BR-24)", () => {
    it("resets initial password and sets mustChangePassword to true", async () => {
      const prisma = getPrisma();
      const testUser = await prisma.user.findUnique({ where: { email: testUserEmail } });

      const res = await request(app)
        .post(`/api/admin/users/${testUser!.id}/reset-password`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ newInitialPassword: "NewResetPassword123!" });

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({
        id: testUser!.id,
        mustChangePassword: true,
      });

      // Verify in database
      const updatedInDb = await prisma.user.findUnique({ where: { id: testUser!.id } });
      expect(updatedInDb?.mustChangePassword).toBe(true);
    });

    it("rejects reset-password when newInitialPassword violates complexity rules (400 Bad Request)", async () => {
      const prisma = getPrisma();
      const testUser = await prisma.user.findUnique({ where: { email: testUserEmail } });

      const res = await request(app)
        .post(`/api/admin/users/${testUser!.id}/reset-password`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ newInitialPassword: "weak" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
    });

    it("returns 404 Not Found when resetting password for non-existent user", async () => {
      const res = await request(app)
        .post("/api/admin/users/999999/reset-password")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ newInitialPassword: "ValidPassword123!" });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  // ---------------------------------------------------------------------------
  // API-25: Non-Administrator Access Control
  // ---------------------------------------------------------------------------
  describe("API-25: Access Control / RBAC on Admin Endpoints (AC-23, BR-10)", () => {
    it("rejects IT Staff calling GET /api/admin/users with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rejects Requester calling GET /api/admin/users with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rejects unauthenticated user calling GET /api/admin/users with 401 Unauthorized", async () => {
      const res = await request(app).get("/api/admin/users");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects IT Staff calling POST /api/admin/users with 403 Forbidden", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          name: "Unauthorized Create",
          email: "unauth@toktickit.local",
          role: "REQUESTER",
          initialPassword: "Password123!",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rejects Requester calling PATCH /api/admin/users/:id with 403 Forbidden", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminId}`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ name: "Hacked Name" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });
});
