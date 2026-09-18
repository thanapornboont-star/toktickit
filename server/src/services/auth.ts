import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getPrisma } from "../prisma.js";
import { User } from "@prisma/client";

export function validatePasswordPolicy(password: string): { isValid: boolean; message?: string } {
  if (!password || typeof password !== "string") {
    return { isValid: false, message: "Password is required." };
  }
  if (password.length < 8) {
    return { isValid: false, message: "Password must be at least 8 characters long." };
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumOrSpecial = /[0-9\W_]/.test(password);

  if (!hasUpper || !hasLower) {
    return { isValid: false, message: "Password must include both uppercase and lowercase letters." };
  }
  if (!hasNumOrSpecial) {
    return { isValid: false, message: "Password must include at least one number or special character." };
  }
  return { isValid: true };
}

export function hashPassword(plainText: string): string {
  return bcrypt.hashSync(plainText, 10);
}

export function verifyPassword(plainText: string, hashed: string): boolean {
  return bcrypt.compareSync(plainText, hashed);
}

export async function createSession(userId: number): Promise<string> {
  const prisma = getPrisma();
  const token = "toktickit_session_" + crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
}

export async function revokeSession(token: string): Promise<boolean> {
  const prisma = getPrisma();
  try {
    await prisma.session.deleteMany({
      where: { token },
    });
    return true;
  } catch {
    return false;
  }
}

export async function findUserBySessionToken(token: string): Promise<User | null> {
  const prisma = getPrisma();
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  // Check expiration
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.user;
}
