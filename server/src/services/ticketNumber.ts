import { PrismaClient } from "@prisma/client";

export async function generateTicketNumber(prisma: PrismaClient | any): Promise<string> {
  const currentYear = new Date().getFullYear();

  const sequence = await prisma.ticketSequence.upsert({
    where: { year: currentYear },
    update: {
      lastNumber: {
        increment: 1,
      },
    },
    create: {
      year: currentYear,
      lastNumber: 1,
    },
  });

  const paddedSequence = String(sequence.lastNumber).padStart(6, "0");
  return `TKT-${currentYear}-${paddedSequence}`;
}
