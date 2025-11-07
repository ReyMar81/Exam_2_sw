import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

// GET /api/projects/:userId
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { users: { some: { userId } } }
        ]
      },
      include: { 
        users: { 
          include: { user: true } 
        },
        diagrams: true
      }
    });
    res.json(projects);
  } catch (err) {
    console.error("[projects] fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// POST /api/projects
router.post("/", async (req, res) => {
  try {
    const { name, userId } = req.body;
    if (!name || !userId) return res.status(400).json({ error: "Missing fields" });

    const project = await prisma.project.create({
      data: {
        name,
        ownerId: userId,
        users: {
          create: [{ userId, role: "OWNER" }]
        }
      },
      include: {
        users: {
          include: { user: true }
        }
      }
    });

    console.log(`[projects] created project ${name} for user ${userId}`);
    res.json(project);
  } catch (err) {
    console.error("[projects] create failed:", err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

// GET /api/projects/role/:projectId - Obtener rol del usuario en el proyecto
router.get("/role/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.query.userId as string;

    if (!userId) {
      console.error("[projects] role lookup: missing userId");
      return res.status(400).json({ error: "Missing userId" });
    }

    console.log(`[projects] checking role for user ${userId} in project ${projectId}`);

    const member = await prisma.projectUser.findFirst({
      where: { projectId, userId },
      select: { role: true },
    });

    if (member) {
      console.log(`[projects] user ${userId} has role ${member.role}`);
      return res.json({ role: member.role });
    }
    
    console.log(`[projects] user ${userId} is not a member of project ${projectId}`);
    return res.json({ role: null });
  } catch (err) {
    console.error("[projects] role lookup failed:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
