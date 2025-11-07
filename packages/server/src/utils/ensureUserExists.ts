import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Verifica si el usuario existe; si no, lo crea automáticamente.
 * @param userId string
 * @returns Promise<void>
 */
export async function ensureUserExists(userId: string): Promise<void> {
  const exists = await prisma.user.findUnique({ where: { id: userId } });
  if (!exists) {
    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@auto.local`,
        name: userId,
      },
    });
    console.log(`[auto-user] Created user placeholder: ${userId}`);
  }
}
