import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { ensureUserExists } from "../utils/ensureUserExists.js";

const prisma = new PrismaClient();
const router = Router();

// POST /api/locks/acquire
router.post("/acquire", async (req, res) => {
  try {
    const { diagramId, userId, resourceId } = req.body;
    const expiresAt = new Date(Date.now() + 30000); // 30s TTL

    // Ensure user exists before creating lock
    await ensureUserExists(userId);

    const lock = await prisma.lock.upsert({
      where: { diagramId_resourceId: { diagramId, resourceId } },
      create: { diagramId, userId, resourceId, expiresAt },
      update: { userId, expiresAt, acquiredAt: new Date() }
    });

    res.json(lock);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to acquire lock" });
  }
});

// POST /api/locks/release
router.post("/release", async (req, res) => {
  try {
    const { lockId } = req.body;
    await prisma.lock.delete({ where: { id: lockId } });
    res.json({ released: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to release lock" });
  }
});

export default router;
