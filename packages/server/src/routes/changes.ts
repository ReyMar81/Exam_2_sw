import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { ensureUserExists } from "../utils/ensureUserExists.js";

const prisma = new PrismaClient();
const router = Router();

// POST /api/changes/add
router.post("/add", async (req, res) => {
  try {
    const { diagramId, userId, action, payload } = req.body;
    
    // Ensure user exists before creating change
    await ensureUserExists(userId);
    
    const change = await prisma.diagramChange.create({
      data: { diagramId, userId, action, payload }
    });
    res.json(change);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add change" });
  }
});

// GET /api/changes/:diagramId
router.get("/:diagramId", async (req, res) => {
  try {
    const { diagramId } = req.params;
    const changes = await prisma.diagramChange.findMany({
      where: { diagramId },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    res.json(changes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list changes" });
  }
});

export default router;
