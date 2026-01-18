// 🧠 AI Integration - REST Route for Intent Parsing
import { Router } from "express";
import { 
  parseUserIntent, 
  parseImageIntent, 
  validateActions,
  cleanDuplicateFKs,
  normalizeIntermediateTables 
} from "../services/aiService.js";

const router = Router();

/**
 * POST /api/ai/parse-intent
 * Endpoint para parsear prompts de lenguaje natural usando IA
 * 
 * Body:
 *   - prompt: string (máximo 500 caracteres)
 *   - projectId: string (para contexto opcional)
 *   - userId: string (para logs)
 * 
 * Response:
 *   - actions: AIAction[] (array de acciones a ejecutar)
 */
router.post("/parse-intent", async (req, res) => {
  try {
    const { prompt, projectId, userId } = req.body;

    // Validación de input
    if (!prompt || typeof prompt !== "string") {
      console.warn("[AI Route] Missing or invalid prompt");
      return res.status(400).json({ error: "Missing or invalid prompt" });
    }

    if (prompt.trim().length === 0) {
      console.warn("[AI Route] Empty prompt");
      return res.status(400).json({ error: "Prompt cannot be empty" });
    }

    if (prompt.length > 500) {
      console.warn(`[AI Route] Prompt too long: ${prompt.length} chars`);
      return res
        .status(400)
        .json({ error: "Prompt too long (max 500 characters)" });
    }

    console.log(
      `[AI Route] Received request from user ${userId || "unknown"} in project ${projectId || "unknown"}`
    );
    console.log(`[AI Route] Prompt: "${prompt.slice(0, 100)}..."`);

    // Verificar API key
    if (!process.env.OPENAI_API_KEY) {
      console.error("[AI Route] OPENAI_API_KEY not configured");
      return res.status(500).json({
        error: "AI service not configured. Please contact administrator.",
      });
    }

    // Llamar al servicio de IA
    const result = await parseUserIntent(prompt);

    // Validar acciones generadas
    const validation = validateActions(result.actions);
    if (!validation.valid) {
      console.error("[AI Route] Generated actions are invalid:", validation.errors);
      return res.status(500).json({
        error: "AI generated invalid actions",
        details: validation.errors,
      });
    }

    // 📊 Log de acciones antes de limpiar
    console.log("[AI Route] Actions before cleaning:");
    result.actions.forEach((action: any, i: number) => {
      if (action.type === "CreateRelation") {
        console.log(`  ${i}. CreateRelation: ${action.fromTable} -> ${action.toTable} (cardinality: ${action.cardinality || 'none'}, relationType: ${action.relationType || 'none'})`);
      } else {
        console.log(`  ${i}. ${action.type}: ${action.name || action.tableName || 'N/A'}`);
      }
    });

    // 🧹 Limpiar duplicados y normalizar tablas intermedias
    let cleanedActions = cleanDuplicateFKs(result.actions);
    cleanedActions = normalizeIntermediateTables(cleanedActions);

    // 📊 Log de acciones después de limpiar
    console.log("[AI Route] Actions after cleaning:");
    cleanedActions.forEach((action: any, i: number) => {
      if (action.type === "CreateRelation") {
        console.log(`  ${i}. CreateRelation: ${action.fromTable} -> ${action.toTable} (cardinality: ${action.cardinality || 'none'}, relationType: ${action.relationType || 'none'})`);
      } else {
        console.log(`  ${i}. ${action.type}: ${action.name || action.tableName || 'N/A'}`);
      }
    });

    console.log(
      `[AI Route] Successfully parsed and cleaned ${cleanedActions.length} action(s)`
    );

    // Retornar acciones al frontend
    res.json({
      actions: cleanedActions,
      metadata: {
        promptLength: prompt.length,
        actionsCount: cleanedActions.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[AI Route] Error processing request:", error);

    // Errores específicos de OpenAI
    if (error.message.includes("Invalid OpenAI API key")) {
      return res.status(500).json({
        error: "AI service configuration error",
        details: "Invalid API key",
      });
    }

    if (error.message.includes("rate limit")) {
      return res.status(429).json({
        error: "Too many AI requests",
        details: "Please try again in a few moments",
      });
    }

    // Error genérico
    res.status(500).json({
      error: "Failed to process AI request",
      details: error.message,
    });
  }
});

/**
 * GET /api/ai/health
 * Health check para verificar configuración de IA
 */
router.get("/health", (req, res) => {
  const hasApiKey = !!process.env.OPENAI_API_KEY;
  const apiKeyPreview = hasApiKey
    ? `${process.env.OPENAI_API_KEY?.slice(0, 7)}...`
    : "NOT_SET";

  res.json({
    status: hasApiKey ? "configured" : "not_configured",
    apiKey: apiKeyPreview,
    model: "gpt-4o-mini",
    temperature: 0.3,
  });
});

/**
 * POST /api/ai/parse-image
 * Endpoint para analizar imágenes de diagramas ER usando IA con visión
 * 
 * Body:
 *   - imageBase64: string (imagen en base64, sin prefijo data:image)
 *   - projectId?: string (para contexto opcional)
 *   - userId?: string (para logs)
 * 
 * Response:
 *   - actions: AIAction[] (array de acciones a ejecutar)
 */
router.post("/parse-image", async (req, res) => {
  try {
    const { imageBase64, projectId, userId } = req.body;

    // Validación de input
    if (!imageBase64 || typeof imageBase64 !== "string") {
      console.warn("[AI Image Route] Missing or invalid imageBase64");
      return res.status(400).json({ error: "Missing or invalid imageBase64" });
    }

    if (imageBase64.trim().length === 0) {
      console.warn("[AI Image Route] Empty imageBase64");
      return res.status(400).json({ error: "Image data cannot be empty" });
    }

    // Validar tamaño aproximado (5MB en base64 = ~6.67MB raw)
    const sizeInMB = (imageBase64.length * 0.75) / (1024 * 1024);
    if (sizeInMB > 5) {
      console.warn(`[AI Image Route] Image too large: ${sizeInMB.toFixed(2)}MB`);
      return res.status(400).json({ 
        error: "Image too large (max 5MB)",
        details: `Image size: ${sizeInMB.toFixed(2)}MB`
      });
    }

    console.log(
      `[AI Image Route] Received image from user ${userId || "unknown"} in project ${projectId || "unknown"}`
    );
    console.log(`🧠 [AI Image Route] Image size: ${sizeInMB.toFixed(2)}MB`);

    // Verificar API key
    if (!process.env.OPENAI_API_KEY) {
      console.error("[AI Image Route] OPENAI_API_KEY not configured");
      return res.status(500).json({
        error: "AI service not configured. Please contact administrator.",
      });
    }

    // Llamar al servicio de IA con visión
    const result = await parseImageIntent(imageBase64);

    // Validar acciones generadas
    const validation = validateActions(result.actions);
    if (!validation.valid) {
      console.error("[AI Image Route] Generated actions are invalid:", validation.errors);
      return res.status(500).json({
        error: "AI generated invalid actions",
        details: validation.errors,
      });
    }

    // 🧹 Limpiar duplicados y normalizar tablas intermedias
    let cleanedActions = cleanDuplicateFKs(result.actions);
    cleanedActions = normalizeIntermediateTables(cleanedActions);

    console.log(
      `[AI Image Route] Successfully parsed and cleaned ${cleanedActions.length} action(s) from image`
    );

    // Retornar acciones al frontend
    res.json({
      actions: cleanedActions,
      metadata: {
        imageSizeMB: parseFloat(sizeInMB.toFixed(2)),
        actionsCount: cleanedActions.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("❌ [AI Image Route] Error processing request:", error);

    // Errores específicos de OpenAI
    if (error.message.includes("Invalid OpenAI API key")) {
      return res.status(500).json({
        error: "AI service configuration error",
        details: "Invalid API key",
      });
    }

    if (error.message.includes("rate limit")) {
      return res.status(429).json({
        error: "Too many AI requests",
        details: "Please try again in a few moments",
      });
    }

    // Error genérico
    res.status(500).json({
      error: "Failed to process image",
      details: error.message,
    });
  }
});

export default router;
