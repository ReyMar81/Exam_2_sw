import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/diagrams/:projectId
 * Guarda o actualiza un diagrama para un proyecto
 * Body: { data, userId }
 */
router.post("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { data, userId } = req.body;

    if (!userId) {
      console.error("❌ [diagrams] Missing userId in request");
      return res.status(400).json({ error: "userId is required" });
    }

    console.log(`💾 [diagrams] Saving diagram for project ${projectId} by user ${userId}`);
    console.log(`📊 [diagrams] Data:`, JSON.stringify(data).substring(0, 100) + "...");

    // Buscar diagrama existente para este proyecto
    const existing = await prisma.diagram.findFirst({ 
      where: { projectId } 
    });

    if (existing) {
      // Actualizar diagrama existente
      const updated = await prisma.diagram.update({
        where: { id: existing.id },
        data: { 
          data, 
          version: { increment: 1 },
          updatedAt: new Date()
        },
      });
      console.log(`✅ [diagrams] Updated diagram ${existing.id}, version ${updated.version}`);
      return res.json(updated);
    } else {
      // Crear nuevo diagrama
      const created = await prisma.diagram.create({
        data: { 
          projectId,
          authorId: userId,
          name: "Auto Diagram", 
          data,
          version: 1
        },
      });
      console.log(`✅ [diagrams] Created new diagram ${created.id}`);
      return res.json(created);
    }
  } catch (err) {
    console.error("❌ [diagrams] Error saving diagram:", err);
    return res.status(500).json({ error: "Failed to save diagram" });
  }
});

/**
 * GET /api/diagrams/:projectId
 * Obtiene el diagrama de un proyecto
 */
router.get("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    console.log(`📂 [diagrams] Loading diagram for project ${projectId}`);

    const diagram = await prisma.diagram.findFirst({
      where: { projectId }
    });

    if (!diagram) {
      console.log(`⚠️ [diagrams] No diagram found for project ${projectId}`);
      return res.json({ data: { nodes: [], edges: [] } });
    }

    console.log(`✅ [diagrams] Loaded diagram ${diagram.id}, version ${diagram.version}`);
    return res.json(diagram);
  } catch (err) {
    console.error("❌ [diagrams] Error loading diagram:", err);
    return res.status(500).json({ error: "Failed to load diagram" });
  }
});

/**
 * GET /api/diagrams/single/:projectId
 * Alias para obtener el diagrama (compatible con frontend)
 */
router.get("/single/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    console.log(`📂 [diagrams/single] Loading diagram for project ${projectId}`);

    const diagram = await prisma.diagram.findFirst({
      where: { projectId }
    });

    if (!diagram) {
      console.log(`⚠️ [diagrams/single] No diagram found for project ${projectId}`);
      return res.json({ data: { nodes: [], edges: [] } });
    }

    console.log(`✅ [diagrams/single] Loaded diagram ${diagram.id}, version ${diagram.version}`);
    return res.json(diagram);
  } catch (err) {
    console.error("❌ [diagrams/single] Error loading diagram:", err);
    return res.status(500).json({ error: "Failed to load diagram" });
  }
});

export default router;
