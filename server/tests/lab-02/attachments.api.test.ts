import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Issue 4: Attachment APIs (Upload, Metadata, Download, Soft-Removal)", () => {
  const setupTestContext = async () => {
    const prisma = getPrisma();
    const requesterA = await prisma.devRequester.findFirst({ where: { isActive: true } });
    const requesterB = await prisma.devRequester.findFirst({
      where: { isActive: true, id: { not: requesterA!.id } },
    });
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    // Create ticket owned by Requester A
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Dev-Requester-Id", String(requesterA!.id))
      .send({
        summary: "Ticket for testing attachment lifecycle",
        description: "Comprehensive testing of upload, metadata, download, and soft-removal.",
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "MEDIUM",
      });

    return {
      ticketId: res.body.id,
      requesterAId: requesterA!.id,
      requesterBId: requesterB!.id,
    };
  };

  it("API-09: uploads allowed file types and enforces 5 MB size limit", async () => {
    const ctx = await setupTestContext();

    // 1. Upload valid PNG
    const validPngBuffer = Buffer.from(
      "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082",
      "hex"
    );

    const uploadRes = await request(app)
      .post(`/api/tickets/${ctx.ticketId}/attachments`)
      .set("X-Dev-Requester-Id", String(ctx.requesterAId))
      .attach("file", validPngBuffer, "screenshot.png");

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body).toHaveProperty("id");
    expect(uploadRes.body.originalFilename).toBe("screenshot.png");
    expect(uploadRes.body.mimeType).toBe("image/png");
    expect(uploadRes.body.isRemoved).toBe(false);
    expect(uploadRes.body).not.toHaveProperty("storagePath");
    expect(uploadRes.body).not.toHaveProperty("storedFilename");

    // 2. Reject unsupported file extension/MIME (.exe)
    const invalidFileRes = await request(app)
      .post(`/api/tickets/${ctx.ticketId}/attachments`)
      .set("X-Dev-Requester-Id", String(ctx.requesterAId))
      .attach("file", Buffer.from("MZ dummy executable content"), "virus.exe");

    expect([400, 415]).toContain(invalidFileRes.status);
    expect(invalidFileRes.body.error).toBeDefined();

    // A permitted filename must not bypass the MIME allow-list.
    const spoofedMimeRes = await request(app)
      .post(`/api/tickets/${ctx.ticketId}/attachments`)
      .set("X-Dev-Requester-Id", String(ctx.requesterAId))
      .attach("file", Buffer.from("not a PNG"), {
        filename: "spoofed.png",
        contentType: "application/octet-stream",
      });
    expect(spoofedMimeRes.status).toBe(415);

    // A declared MIME type must also match the uploaded file signature.
    const spoofedSignatureRes = await request(app)
      .post(`/api/tickets/${ctx.ticketId}/attachments`)
      .set("X-Dev-Requester-Id", String(ctx.requesterAId))
      .attach("file", Buffer.from("this is not a PNG"), {
        filename: "spoofed-signature.png",
        contentType: "image/png",
      });
    expect(spoofedSignatureRes.status).toBe(415);

    // 3. Reject file > 5 MB
    const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024, "a"); // 5 MB + 1 KB
    const oversizedRes = await request(app)
      .post(`/api/tickets/${ctx.ticketId}/attachments`)
      .set("X-Dev-Requester-Id", String(ctx.requesterAId))
      .attach("file", oversizedBuffer, "large_document.pdf");

    expect(oversizedRes.status).toBe(413);
    expect(oversizedRes.body.error).toBeDefined();
  });

  it("API-10: rejects 6th active attachment when 5 active attachments exist", async () => {
    const ctx = await setupTestContext();
    const dummyBuffer = Buffer.from("%PDF-1.4 dummy pdf");

    // Upload 5 attachments
    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .post(`/api/tickets/${ctx.ticketId}/attachments`)
        .set("X-Dev-Requester-Id", String(ctx.requesterAId))
        .attach("file", dummyBuffer, `doc_${i}.pdf`);
      expect(res.status).toBe(201);
    }

    // 6th upload must fail with 400 Bad Request
    const sixthRes = await request(app)
      .post(`/api/tickets/${ctx.ticketId}/attachments`)
      .set("X-Dev-Requester-Id", String(ctx.requesterAId))
      .attach("file", dummyBuffer, "doc_6.pdf");

    expect(sixthRes.status).toBe(400);
    expect(sixthRes.body.error.message).toMatch(/limit|5/i);
  });

  it("enforces ownership isolation for every attachment operation (404 Not Found)", async () => {
    const ctx = await setupTestContext();
    const dummyBuffer = Buffer.from("%PDF-1.4 dummy pdf");

    const uploadByOwner = await request(app)
      .post(`/api/tickets/${ctx.ticketId}/attachments`)
      .set("X-Dev-Requester-Id", String(ctx.requesterAId))
      .attach("file", dummyBuffer, "owner-only.pdf");
    expect(uploadByOwner.status).toBe(201);
    const attachmentId = uploadByOwner.body.id;

    // Requester B tries to upload to Requester A's ticket
    const resB = await request(app)
      .post(`/api/tickets/${ctx.ticketId}/attachments`)
      .set("X-Dev-Requester-Id", String(ctx.requesterBId))
      .attach("file", dummyBuffer, "unauthorized.pdf");

    expect(resB.status).toBe(404);

    const listByB = await request(app)
      .get(`/api/tickets/${ctx.ticketId}/attachments`)
      .set("X-Dev-Requester-Id", String(ctx.requesterBId));
    expect(listByB.status).toBe(404);

    const downloadByB = await request(app)
      .get(`/api/tickets/${ctx.ticketId}/attachments/${attachmentId}/download`)
      .set("X-Dev-Requester-Id", String(ctx.requesterBId));
    expect(downloadByB.status).toBe(404);

    const removeByB = await request(app)
      .delete(`/api/tickets/${ctx.ticketId}/attachments/${attachmentId}`)
      .set("X-Dev-Requester-Id", String(ctx.requesterBId))
      .send({ reason: "Trying to remove another requester's file" });
    expect(removeByB.status).toBe(404);
  });

  it("API-11 & API-12: soft-removes attachment with reason, blocks download, but retains metadata", async () => {
    const ctx = await setupTestContext();
    const fileContent = "%PDF-1.4\nSimulated confidential PDF content for testing download.";
    const dummyBuffer = Buffer.from(fileContent);

    // 1. Upload attachment
    const uploadRes = await request(app)
      .post(`/api/tickets/${ctx.ticketId}/attachments`)
      .set("X-Dev-Requester-Id", String(ctx.requesterAId))
      .attach("file", dummyBuffer, "confidential.pdf");
    expect(uploadRes.status).toBe(201);
    const attachmentId = uploadRes.body.id;

    // 2. Download active attachment (200 OK)
    const downloadRes = await request(app)
      .get(`/api/tickets/${ctx.ticketId}/attachments/${attachmentId}/download`)
      .set("X-Dev-Requester-Id", String(ctx.requesterAId));
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.headers["content-disposition"]).toContain("confidential.pdf");

    // 3. Attempt soft removal with missing/short reason (< 5 chars) -> 400
    const shortReasonRes = await request(app)
      .delete(`/api/tickets/${ctx.ticketId}/attachments/${attachmentId}`)
      .set("X-Dev-Requester-Id", String(ctx.requesterAId))
      .send({ reason: "bad" });
    expect(shortReasonRes.status).toBe(400);

    const longReasonRes = await request(app)
      .delete(`/api/tickets/${ctx.ticketId}/attachments/${attachmentId}`)
      .set("X-Dev-Requester-Id", String(ctx.requesterAId))
      .send({ reason: "a".repeat(256) });
    expect(longReasonRes.status).toBe(400);

    // 4. Soft remove with valid reason (>= 5 chars) -> 200 OK
    const removeReason = "Uploaded wrong document containing sensitive information";
    const removeRes = await request(app)
      .delete(`/api/tickets/${ctx.ticketId}/attachments/${attachmentId}`)
      .set("X-Dev-Requester-Id", String(ctx.requesterAId))
      .send({ reason: removeReason });

    expect(removeRes.status).toBe(200);
    expect(removeRes.body.isRemoved).toBe(true);
    expect(removeRes.body.removalReason).toBe(removeReason);
    expect(removeRes.body.removedAt).toBeDefined();

    // 5. API-12: Attempt to download soft-removed attachment -> 404 Not Found
    const blockedDownloadRes = await request(app)
      .get(`/api/tickets/${ctx.ticketId}/attachments/${attachmentId}/download`)
      .set("X-Dev-Requester-Id", String(ctx.requesterAId));
    expect(blockedDownloadRes.status).toBe(404);

    // 6. Check metadata list: soft-removed attachment remains visible with reason
    const listRes = await request(app)
      .get(`/api/tickets/${ctx.ticketId}/attachments`)
      .set("X-Dev-Requester-Id", String(ctx.requesterAId));

    expect(listRes.status).toBe(200);
    const removedItem = listRes.body.find((a: { id: number }) => a.id === attachmentId);
    expect(removedItem).toBeDefined();
    expect(removedItem.isRemoved).toBe(true);
    expect(removedItem.removalReason).toBe(removeReason);
  });
});
