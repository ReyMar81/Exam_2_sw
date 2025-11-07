import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { ensureUserExists } from "../utils/ensureUserExists.js";

const prisma = new PrismaClient();
const router = Router();

// POST /api/sessions/open
router.post("/open", async (req, res) => {
  try {
    const { userId, diagramId } = req.body;
    
    // Ensure user exists before creating session
    await ensureUserExists(userId);
    
    const session = await prisma.session.create({ 
      data: { userId, diagramId }
    });
    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to open session" });
  }
});

// POST /api/sessions/close
router.post("/close", async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await prisma.session.update({
      where: { id: sessionId },
      data: { endedAt: new Date() }
    });
    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to close session" });
  }
});

// GET /api/sessions/active/:diagramId
router.get("/active/:diagramId", async (req, res) => {
  try {
    const { diagramId } = req.params;
    const active = await prisma.session.findMany({
      where: {
        diagramId,
        endedAt: null,
        lastPing: { gt: new Date(Date.now() - 60000) } // activos últimos 60s
      },
      include: { user: true }
    });
    res.json(active);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list sessions" });
  }
});

export default router;
