# 🤖 Arquitectura de Integración de IA - Diagramador Colaborativo

## 📋 Análisis del Código Existente

### 1. Representación de Datos en el Frontend

#### **Estructura de Nodos (Tablas)**

```typescript
// Ubicación: packages/web/src/pages/DiagramEditor.tsx
// Tipo: packages/shared/types.ts

interface Node {
  id: string; // Formato: "node-{timestamp}"
  type: "table"; // Tipo fijo para tablas ER
  position: { x: number; y: number };
  data: TableData; // Ver estructura abajo
}

interface TableData {
  name: string; // Nombre de la tabla (ej: "usuario")
  label?: string; // Alias visual (opcional)
  fields: Field[]; // Array de columnas
}

interface Field {
  id: string | number; // ID único del campo
  name: string; // Nombre de la columna (ej: "email")
  type: string; // Tipo SQL (INT, VARCHAR, etc.)
  isPrimary?: boolean; // Si es PK
  isForeign?: boolean; // Si es FK
  nullable?: boolean; // Permite NULL
  references?: string; // Tabla referenciada (para FK)
  referencesField?: string; // Campo específico en tabla referenciada
  relationType?: string; // Tipo de relación ("1-1", "1-N", "N-N")
}
```

#### **Estructura de Edges (Relaciones)**

```typescript
interface Edge {
  id: string; // Formato: "edge-{timestamp}"
  source: string; // ID del nodo con PK
  target: string; // ID del nodo con FK
  label: string; // Tipo visible ("1‒1", "1‒N", "N‒N")
  animated?: boolean;
  style?: EdgeStyle;
  data?: {
    sourceField: string; // Nombre del campo PK (ej: "id")
    targetField: string; // Nombre del campo FK (ej: "usuario_id")
    relationType: string; // Tipo normalizado
  };
}
```

**Ubicación en código:**

- **Estado global:** `DiagramEditor.tsx` usa hooks `useNodesState()` y `useEdgesState()` de ReactFlow
- **Persistencia:** Almacenados en `Diagram.data` (JSON en PostgreSQL vía Prisma)
- **No hay Zustand store específico para diagrama** (solo `useAppStore` para user/project)

---

### 2. Mecanismos de Actualización del Diagrama

#### **A) Flujo de Creación/Modificación Local**

**Funciones clave en `DiagramEditor.tsx`:**

| Función              | Propósito                  | Socket.IO Event                                                  |
| -------------------- | -------------------------- | ---------------------------------------------------------------- |
| `addNode()`          | Crea nueva tabla           | `diagram-change` → `ADD_NODE`                                    |
| `handleNodeUpdate()` | Actualiza data de tabla    | `diagram-change` → `UPDATE_NODE`                                 |
| `onNodeDragStop()`   | Mueve tabla                | `diagram-change` → `MOVE_NODE`                                   |
| `handleDeleteNode()` | Elimina tabla + edges      | `diagram-change` → `DELETE_NODE` + `DELETE_EDGE`                 |
| `handleConnect()`    | Crea relación entre tablas | `diagram-change` → `ADD_EDGE` (o crea tabla intermedia para N-N) |

**Patrón de ejecución:**

```typescript
// 1. Actualizar estado local inmediatamente (optimistic update)
setNodes((nds: Node[]) => [...nds, newNode]);

// 2. Emitir evento a Socket.IO para sincronización
socket.emit("diagram-change", {
  projectId: project.id,
  action: "ADD_NODE",
  payload: newNode,
});
```

#### **B) Flujo de Sincronización en Tiempo Real**

**Backend (`server/src/index.ts`):**

```typescript
socket.on("diagram-change", async ({ projectId, action, payload }) => {
  // 1. Validar rol (VIEWER no puede editar)
  if (role === "VIEWER") {
    return socket.emit("warning", { message: "VIEWER cannot modify" });
  }

  // 2. Broadcast a OTROS usuarios del proyecto (no al emisor)
  socket.to(projectId).emit("diagram-update", { action, payload });

  // 3. Persistir en base de datos (incremental)
  await prisma.diagram.update({
    where: { id: diagramId },
    data: {
      data: updatedData, // JSON con nodes y edges actualizados
      version: { increment: 1 },
    },
  });
});
```

**Frontend (listener en `DiagramEditor.tsx`):**

```typescript
socket.on("diagram-update", ({ action, payload }: any) => {
  switch (action) {
    case "ADD_NODE":
      setNodes((nds) => [...nds, payload]);
      break;
    case "UPDATE_NODE":
      setNodes((nds) =>
        nds.map((n) => (n.id === payload.id ? { ...n, ...payload } : n))
      );
      break;
    case "DELETE_NODE":
      setNodes((nds) => nds.filter((n) => n.id !== payload.id));
      break;
    // ... similares para edges
  }
});
```

---

### 3. Sistema de Acciones Existente

**✅ YA EXISTE un sistema de acciones basado en eventos Socket.IO:**

#### **Acciones Soportadas:**

```typescript
type DiagramAction =
  | "ADD_NODE" // Crear tabla
  | "UPDATE_NODE" // Modificar campos de tabla
  | "MOVE_NODE" // Cambiar posición en canvas
  | "DELETE_NODE" // Eliminar tabla
  | "ADD_EDGE" // Crear relación
  | "DELETE_EDGE" // Eliminar relación
  | "SYNC_EDGES"; // Sincronizar todas las relaciones
```

#### **Formato del Payload:**

```typescript
// Ejemplo: Crear tabla "usuario"
{
  action: "ADD_NODE",
  payload: {
    id: "node-1699564820000",
    type: "table",
    position: { x: 100, y: 200 },
    data: {
      name: "usuario",
      fields: [
        { id: 1, name: "id", type: "SERIAL", isPrimary: true, nullable: false },
        { id: 2, name: "email", type: "VARCHAR(100)", nullable: false },
        { id: 3, name: "nombre", type: "VARCHAR(50)", nullable: false }
      ]
    }
  }
}
```

**🎯 Conclusión:** No necesitamos crear un nuevo sistema de dispatch/actions. **Reutilizaremos el sistema Socket.IO existente.**

---

## 🏗️ Arquitectura Propuesta para Integración de IA

### Visión General

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
├─────────────────────────────────────────────────────────────────┤
│  DiagramEditor.tsx                                              │
│    │                                                             │
│    ├─► [Nuevo] AIPromptBar Component                           │
│    │     • Input de texto para prompts                          │
│    │     • Botón de enviar + loader                             │
│    │     • Historial de comandos (opcional)                     │
│    │                                                             │
│    └─► applyAIActions(actions: AIAction[])  ← Nueva función    │
│          • Itera sobre acciones de IA                           │
│          • Llama a funciones existentes (addNode, handleConnect)│
│          • Emite eventos Socket.IO                              │
│                                                                  │
│  api.ts                                                          │
│    └─► POST /api/ai/parse-intent  ← Nueva ruta                 │
│          • Envía prompt del usuario                             │
│          • Recibe JSON con acciones                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP Request
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js + Express)                 │
├─────────────────────────────────────────────────────────────────┤
│  server/src/routes/ai.ts  ← Nuevo archivo                      │
│    │                                                             │
│    └─► POST /api/ai/parse-intent                               │
│          1. Validar input (max 500 chars, rate limit)          │
│          2. Construir prompt para GPT-4o-mini                   │
│          3. Llamar a OpenAI API                                 │
│          4. Parsear respuesta JSON                              │
│          5. Retornar acciones al frontend                       │
│                                                                  │
│  server/src/services/aiService.ts  ← Nuevo archivo            │
│    │                                                             │
│    ├─► parseUserIntent(prompt: string)                         │
│    │     • Construye prompt estructurado                        │
│    │     • Incluye esquema JSON esperado                        │
│    │     • Maneja errores de API                                │
│    │                                                             │
│    └─► Integración con OpenAI SDK                              │
│          • Model: gpt-4o-mini                                   │
│          • Temperature: 0.3 (determinístico)                    │
│          • Response format: json_object                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓ JSON Response
┌─────────────────────────────────────────────────────────────────┐
│                    Formato de Respuesta IA                      │
├─────────────────────────────────────────────────────────────────┤
│  {                                                               │
│    "actions": [                                                  │
│      {                                                           │
│        "type": "CreateTable",                                   │
│        "tableName": "usuario",                                  │
│        "fields": [                                              │
│          { "name": "id", "type": "SERIAL", "isPrimary": true }, │
│          { "name": "email", "type": "VARCHAR(100)" }           │
│        ]                                                         │
│      },                                                          │
│      {                                                           │
│        "type": "CreateRelation",                                │
│        "from": "usuario",                                       │
│        "to": "rol",                                             │
│        "cardinality": "N:M"                                     │
│      }                                                           │
│    ]                                                             │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📂 Archivos a Crear/Modificar

### ✨ Archivos Nuevos

#### 1. **Backend: Ruta de IA**

**Archivo:** `packages/server/src/routes/ai.ts`

```typescript
import { Router } from "express";
import { parseUserIntent } from "../services/aiService.js";

const router = Router();

// POST /api/ai/parse-intent
router.post("/parse-intent", async (req, res) => {
  try {
    const { prompt, projectId, userId } = req.body;

    // Validaciones
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing or invalid prompt" });
    }
    if (prompt.length > 500) {
      return res.status(400).json({ error: "Prompt too long (max 500 chars)" });
    }

    console.log(`🤖 [AI] Parsing intent for user ${userId}: "${prompt}"`);

    // Llamar al servicio de IA
    const actions = await parseUserIntent(prompt);

    res.json({ actions });
  } catch (error: any) {
    console.error("❌ [AI] Error parsing intent:", error);
    res.status(500).json({
      error: "Failed to parse intent",
      details: error.message,
    });
  }
});

export default router;
```

#### 2. **Backend: Servicio de IA**

**Archivo:** `packages/server/src/services/aiService.ts`

```typescript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Tipo de acciones que la IA puede generar
 */
export type AIAction =
  | { type: "CreateTable"; tableName: string; fields: AIField[] }
  | {
      type: "CreateRelation";
      from: string;
      to: string;
      cardinality: "1:1" | "1:N" | "N:M";
    }
  | { type: "DeleteTable"; tableName: string }
  | { type: "AddField"; tableName: string; field: AIField };

export interface AIField {
  name: string;
  type: string;
  isPrimary?: boolean;
  nullable?: boolean;
}

/**
 * Prompt del sistema para el modelo
 */
const SYSTEM_PROMPT = `Eres un asistente especializado en diseño de bases de datos relacionales.
Tu tarea es convertir instrucciones en lenguaje natural del usuario en acciones estructuradas para un diagramador ER.

ACCIONES DISPONIBLES:
1. CreateTable: Crear una nueva tabla con campos
   - Incluye siempre un campo "id" SERIAL PRIMARY KEY (a menos que el usuario especifique otra PK)
   - Tipos comunes: INT, SERIAL, VARCHAR(n), TEXT, BOOLEAN, DATE, TIMESTAMP, DECIMAL(p,s)

2. CreateRelation: Crear relación entre dos tablas
   - Cardinalidades: "1:1", "1:N", "N:M"
   - "from" y "to" deben ser nombres de tablas que ya existen o se van a crear

3. DeleteTable: Eliminar una tabla existente

4. AddField: Agregar campo a tabla existente

REGLAS:
- Usa nombres en snake_case (ej: "nombre_completo")
- Infiere tipos apropiados (email → VARCHAR(100), edad → INT)
- Para relaciones N:M, NO crees tabla intermedia (el sistema la crea automáticamente)
- Si el usuario menciona "cliente y pedido 1 a N", pon "from: cliente, to: pedido, cardinality: 1:N"

FORMATO DE RESPUESTA (JSON estricto):
{
  "actions": [
    {
      "type": "CreateTable",
      "tableName": "nombre_tabla",
      "fields": [
        { "name": "id", "type": "SERIAL", "isPrimary": true },
        { "name": "campo", "type": "VARCHAR(100)", "nullable": false }
      ]
    }
  ]
}`;

/**
 * Parsea un prompt del usuario y devuelve acciones estructuradas
 */
export async function parseUserIntent(prompt: string): Promise<AIAction[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const parsed = JSON.parse(content);

    if (!parsed.actions || !Array.isArray(parsed.actions)) {
      throw new Error("Invalid response format: missing actions array");
    }

    console.log(`✅ [AI] Parsed ${parsed.actions.length} action(s)`);
    return parsed.actions;
  } catch (error: any) {
    console.error("❌ [AI] OpenAI API error:", error);
    throw new Error(`AI parsing failed: ${error.message}`);
  }
}
```

#### 3. **Frontend: Componente de Prompt IA**

**Archivo:** `packages/web/src/components/AIPromptBar.tsx`

```typescript
import React, { useState } from "react";
import { api } from "../api";

interface AIPromptBarProps {
  projectId: string;
  userId: string;
  onActionsReceived: (actions: any[]) => void;
}

export function AIPromptBar({
  projectId,
  userId,
  onActionsReceived,
}: AIPromptBarProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!prompt.trim()) return;
    if (prompt.length > 500) {
      setError("Prompt demasiado largo (máximo 500 caracteres)");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("🤖 [AI] Sending prompt:", prompt);

      const response = await api.post("/api/ai/parse-intent", {
        prompt: prompt.trim(),
        projectId,
        userId,
      });

      const { actions } = response.data;
      console.log("✅ [AI] Received actions:", actions);

      onActionsReceived(actions);
      setPrompt(""); // Limpiar input
    } catch (err: any) {
      console.error("❌ [AI] Error:", err);
      setError(err.response?.data?.error || "Error al procesar el prompt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(600px, 90%)",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderRadius: 12,
        padding: "12px 16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        zIndex: 1000,
      }}
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='Ej: "crea tabla persona con id, nombre, edad"'
          disabled={loading}
          style={{
            flex: 1,
            padding: "10px 14px",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          style={{
            padding: "10px 20px",
            background: loading ? "#555" : "#fff",
            color: loading ? "#aaa" : "#667eea",
            border: "none",
            borderRadius: 8,
            fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 14,
          }}
        >
          {loading ? "🔄" : "🪄"} {loading ? "Procesando..." : "Generar"}
        </button>
      </form>

      {error && (
        <div
          style={{
            marginTop: 8,
            padding: "8px 12px",
            background: "rgba(255,0,0,0.2)",
            borderRadius: 6,
            color: "#fff",
            fontSize: 13,
          }}
        >
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
```

---

### 🔧 Archivos a Modificar

#### 4. **Backend: `index.ts` (registrar ruta)**

**Archivo:** `packages/server/src/index.ts`

```typescript
// Agregar import
import aiRouter from "./routes/ai.js";

// Agregar después de las otras rutas (línea ~60)
app.use("/api/ai", aiRouter);
```

#### 5. **Backend: `package.json` (dependencias)**

**Archivo:** `packages/server/package.json`

```json
{
  "dependencies": {
    // ... existentes
    "openai": "^4.73.0"
  }
}
```

#### 6. **Backend: `.env` (API Key)**

**Archivo:** `packages/server/.env`

```env
OPENAI_API_KEY=sk-proj-...  # Tu API key de OpenAI
```

#### 7. **Frontend: `DiagramEditor.tsx` (integrar IA)**

**Ubicación:** Línea ~1100 (dentro del return, antes del cierre del div principal)

**Agregar import:**

```typescript
import { AIPromptBar } from "../components/AIPromptBar";
```

**Agregar función para aplicar acciones:**

```typescript
const applyAIActions = useCallback(
  async (actions: any[]) => {
    console.log("🤖 [AI] Applying actions:", actions);

    for (const action of actions) {
      try {
        switch (action.type) {
          case "CreateTable": {
            const nodeId = `node-${Date.now()}-${Math.random()}`;
            const newNode: Node = {
              id: nodeId,
              type: "table",
              position: {
                x: Math.random() * 400 + 100,
                y: Math.random() * 300 + 100,
              },
              data: {
                name: action.tableName,
                label: action.tableName,
                fields: action.fields.map((f: any, idx: number) => ({
                  id: Date.now() + idx,
                  name: f.name,
                  type: f.type,
                  isPrimary: f.isPrimary || false,
                  isForeign: f.isForeign || false,
                  nullable: f.nullable !== false, // Default true
                })),
              },
            };

            setNodes((nds: Node[]) => [...nds, newNode]);
            socket.emit("diagram-change", {
              projectId: project.id,
              action: "ADD_NODE",
              payload: newNode,
            });

            console.log(`✅ [AI] Created table: ${action.tableName}`);
            break;
          }

          case "CreateRelation": {
            // Buscar nodos source y target
            const sourceNode = nodes.find(
              (n) => n.data.name === action.from || n.data.label === action.from
            );
            const targetNode = nodes.find(
              (n) => n.data.name === action.to || n.data.label === action.to
            );

            if (!sourceNode || !targetNode) {
              console.warn(
                `⚠️ [AI] Relation skipped: table not found (${action.from} → ${action.to})`
              );
              break;
            }

            // Simular conexión
            await handleConnect({
              source: sourceNode.id,
              target: targetNode.id,
              sourceHandle: null,
              targetHandle: null,
            } as Connection);

            // Nota: El tipo de relación se preguntará con el modal existente
            // o podrías modificar handleConnect para aceptar un parámetro opcional

            console.log(
              `✅ [AI] Created relation: ${action.from} → ${action.to}`
            );
            break;
          }

          case "DeleteTable": {
            const nodeToDelete = nodes.find(
              (n) =>
                n.data.name === action.tableName ||
                n.data.label === action.tableName
            );

            if (nodeToDelete) {
              handleDeleteNode(nodeToDelete.id);
              console.log(`✅ [AI] Deleted table: ${action.tableName}`);
            }
            break;
          }

          case "AddField": {
            const nodeToUpdate = nodes.find(
              (n) =>
                n.data.name === action.tableName ||
                n.data.label === action.tableName
            );

            if (nodeToUpdate) {
              const newField = {
                id: Date.now(),
                name: action.field.name,
                type: action.field.type,
                isPrimary: action.field.isPrimary || false,
                nullable: action.field.nullable !== false,
              };

              const updatedFields = [...nodeToUpdate.data.fields, newField];
              handleNodeUpdate(nodeToUpdate.id, { fields: updatedFields });

              console.log(
                `✅ [AI] Added field to ${action.tableName}: ${action.field.name}`
              );
            }
            break;
          }

          default:
            console.warn("⚠️ [AI] Unknown action type:", action.type);
        }

        // Delay corto entre acciones para evitar condiciones de carrera
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error("❌ [AI] Error applying action:", action, error);
      }
    }

    alert(`✅ ${actions.length} acción(es) aplicada(s) correctamente!`);
  },
  [
    nodes,
    project,
    setNodes,
    socket,
    handleConnect,
    handleDeleteNode,
    handleNodeUpdate,
  ]
);
```

**Agregar componente en el JSX (antes del cierre del div principal):**

```typescript
{
  /* Barra de prompt de IA */
}
{
  !isViewer && !isGuest && (
    <AIPromptBar
      projectId={project.id}
      userId={user.id}
      onActionsReceived={applyAIActions}
    />
  );
}
```

---

## 🔄 Flujo Completo de Ejecución

### Caso de Uso: "crea tabla persona con id, nombre, edad"

```
1. USUARIO escribe en AIPromptBar:
   └─► "crea tabla persona con id, nombre, edad"

2. FRONTEND (AIPromptBar.tsx):
   └─► POST /api/ai/parse-intent
       Body: { prompt: "...", projectId, userId }

3. BACKEND (server/src/routes/ai.ts):
   └─► parseUserIntent(prompt)
       └─► OpenAI API call con SYSTEM_PROMPT
           └─► GPT-4o-mini responde JSON:
               {
                 "actions": [{
                   "type": "CreateTable",
                   "tableName": "persona",
                   "fields": [
                     { "name": "id", "type": "SERIAL", "isPrimary": true },
                     { "name": "nombre", "type": "VARCHAR(100)" },
                     { "name": "edad", "type": "INT" }
                   ]
                 }]
               }

4. BACKEND responde al frontend:
   └─► res.json({ actions: [...] })

5. FRONTEND (AIPromptBar):
   └─► onActionsReceived(actions)
       └─► DiagramEditor.applyAIActions(actions)
           └─► Itera sobre actions:
               • CreateTable → addNode() lógica interna
               • Emite socket.emit("diagram-change", ...)

6. SOCKET.IO BROADCAST:
   └─► Backend: socket.to(projectId).emit("diagram-update")
       └─► Todos los clientes reciben:
           • socket.on("diagram-update")
           • Actualizan su estado local
           • Tabla "persona" aparece en todos los editores

7. PERSISTENCIA:
   └─► Backend guarda en PostgreSQL:
       await prisma.diagram.update({
         data: { data: { nodes: [...], edges: [...] } }
       })
```

---

## 🛡️ Validaciones y Seguridad

### Backend

1. **Rate Limiting:**

   ```typescript
   // En server/src/routes/ai.ts (opcional, con express-rate-limit)
   import rateLimit from "express-rate-limit";

   const aiLimiter = rateLimit({
     windowMs: 60 * 1000,      // 1 minuto
     max: 10,                   // Max 10 requests por minuto
     message: "Too many AI requests, please try again later"
   });

   router.post("/parse-intent", aiLimiter, async (req, res) => { ... });
   ```

2. **Validación de Roles:**

   ```typescript
   // Verificar que el usuario tenga permisos de edición
   const membership = await prisma.projectUser.findFirst({
     where: { projectId, userId },
   });

   if (membership?.role === "VIEWER") {
     return res.status(403).json({ error: "Viewers cannot use AI features" });
   }
   ```

3. **Sanitización de Nombres:**
   ```typescript
   // En aiService.ts, validar nombres de tablas
   function sanitizeTableName(name: string): string {
     return name
       .toLowerCase()
       .replace(/[^a-z0-9_]/g, "_")
       .slice(0, 63); // Max PostgreSQL identifier length
   }
   ```

### Frontend

1. **Validación de Input:**

   ```typescript
   // En AIPromptBar.tsx
   if (prompt.length > 500) {
     setError("Prompt demasiado largo");
     return;
   }

   if (!/[a-zA-Z]/.test(prompt)) {
     setError("El prompt debe contener al menos letras");
     return;
   }
   ```

2. **Confirmación de Acciones Destructivas:**
   ```typescript
   // En applyAIActions
   if (action.type === "DeleteTable") {
     const confirm = window.confirm(`¿Eliminar tabla ${action.tableName}?`);
     if (!confirm) continue;
   }
   ```

---

## 🧪 Testing

### Casos de Prueba

#### **Backend (aiService.ts)**

```typescript
// test/aiService.test.ts (con Jest)

describe("AI Service", () => {
  it("should parse simple table creation", async () => {
    const actions = await parseUserIntent("crea tabla usuario con id y email");

    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe("CreateTable");
    expect(actions[0].tableName).toBe("usuario");
    expect(actions[0].fields).toContainEqual(
      expect.objectContaining({ name: "email" })
    );
  });

  it("should parse 1-N relation", async () => {
    const actions = await parseUserIntent(
      "relación 1 a N entre cliente y pedido"
    );

    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      type: "CreateRelation",
      from: "cliente",
      to: "pedido",
      cardinality: "1:N",
    });
  });
});
```

#### **Frontend (AIPromptBar)**

```typescript
// Manual testing con ejemplos:

// ✅ Tabla simple
"crea tabla producto con id, nombre, precio"

// ✅ Relación 1-N
"cliente tiene muchos pedidos"

// ✅ Relación N-M
"relación muchos a muchos entre proyecto y etiqueta"

// ✅ Eliminar
"elimina tabla temporal"

// ✅ Agregar campo
"agrega campo telefono VARCHAR(20) a tabla usuario"

// ❌ Error esperado (prompt vacío)
""

// ❌ Error esperado (prompt muy largo)
"crea tabla con campos..." (> 500 chars)
```

---

## 📊 Métricas y Monitoreo

### Logs Clave

```typescript
// Backend (aiService.ts)
console.log(`🤖 [AI] Request from user ${userId}: "${prompt.slice(0, 50)}..."`);
console.log(`✅ [AI] Generated ${actions.length} actions in ${duration}ms`);
console.error(`❌ [AI] OpenAI API error: ${error.message}`);

// Frontend (DiagramEditor.tsx)
console.log(`🤖 [AI] Applying ${actions.length} actions`);
console.log(`✅ [AI] Created table: ${tableName}`);
console.warn(`⚠️ [AI] Relation skipped: table not found`);
```

### Dashboard Opcional (Futuro)

```typescript
// Agregar en Prisma schema:
model AIRequest {
  id        String   @id @default(cuid())
  userId    String
  prompt    String
  actions   Json
  success   Boolean
  createdAt DateTime @default(now())
}

// Registrar cada request:
await prisma.aiRequest.create({
  data: { userId, prompt, actions, success: true }
});
```

---

## 🚀 Próximos Pasos (Opcional - Futuro)

### 1. **Reconocimiento de Voz**

```typescript
// packages/web/src/components/AIPromptBar.tsx

const [isListening, setListening] = useState(false);

const handleVoiceInput = () => {
  const recognition = new (window as any).webkitSpeechRecognition();
  recognition.lang = "es-ES";

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    setPrompt(transcript);
  };

  recognition.start();
  setListening(true);
};
```

### 2. **OCR de Imágenes (Diagrams escaneados)**

```typescript
// Backend: server/src/services/ocrService.ts
import OpenAI from "openai";

export async function extractDiagramFromImage(imageBase64: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o", // Modelo con visión
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extrae las tablas y relaciones de este diagrama ER",
          },
          {
            type: "image_url",
            image_url: { url: `data:image/png;base64,${imageBase64}` },
          },
        ],
      },
    ],
  });

  // Parsear respuesta y generar acciones
}
```

### 3. **Autocompletado Inteligente**

```typescript
// Frontend: sugerencias en tiempo real
const [suggestions, setSuggestions] = useState<string[]>([]);

useEffect(() => {
  if (prompt.length > 10) {
    // Llamar a /api/ai/suggest
    api
      .post("/api/ai/suggest", { partial: prompt })
      .then((res) => setSuggestions(res.data.suggestions));
  }
}, [prompt]);
```

### 4. **Historial de Comandos**

```typescript
// Frontend: guardar en localStorage
const [history, setHistory] = useState<string[]>([]);

const saveToHistory = (prompt: string) => {
  const updated = [prompt, ...history].slice(0, 10);
  setHistory(updated);
  localStorage.setItem("ai-history", JSON.stringify(updated));
};
```

---

## 📋 Resumen de Implementación

### Archivos a Crear (3)

1. ✅ `packages/server/src/routes/ai.ts` - Ruta REST para IA
2. ✅ `packages/server/src/services/aiService.ts` - Lógica de parseo con OpenAI
3. ✅ `packages/web/src/components/AIPromptBar.tsx` - UI del prompt

### Archivos a Modificar (4)

4. ✅ `packages/server/src/index.ts` - Registrar ruta `/api/ai`
5. ✅ `packages/server/package.json` - Agregar dependencia `openai`
6. ✅ `packages/server/.env` - Agregar `OPENAI_API_KEY`
7. ✅ `packages/web/src/pages/DiagramEditor.tsx` - Integrar `AIPromptBar` y `applyAIActions()`

### Pasos de Instalación

```bash
# Backend
cd packages/server
npm install openai@^4.73.0

# Agregar API key en .env
echo "OPENAI_API_KEY=sk-proj-..." >> .env

# Frontend (sin dependencias nuevas)
```

### Testing Rápido

```bash
# 1. Iniciar backend
cd packages/server
npm run dev

# 2. Iniciar frontend
cd packages/web
npm run dev

# 3. En el navegador:
# - Abrir proyecto
# - Escribir en la barra inferior: "crea tabla usuario con id, nombre, email"
# - Presionar "Generar"
# - Verificar que la tabla aparece en el canvas
```

---

## ✅ Checklist Final

- [ ] Crear `server/src/routes/ai.ts`
- [ ] Crear `server/src/services/aiService.ts`
- [ ] Modificar `server/src/index.ts` (agregar ruta)
- [ ] Modificar `server/package.json` (dependencia openai)
- [ ] Agregar `OPENAI_API_KEY` en `.env`
- [ ] Crear `web/src/components/AIPromptBar.tsx`
- [ ] Modificar `web/src/pages/DiagramEditor.tsx` (función `applyAIActions` + componente)
- [ ] Probar con prompts de ejemplo
- [ ] Verificar sincronización en tiempo real con múltiples usuarios
- [ ] Agregar validaciones de seguridad (rate limit, roles)
- [ ] Documentar en README principal

---

## 🎯 Conclusión

Esta arquitectura:

- ✅ **Reutiliza** el sistema Socket.IO existente (no reinventa la rueda)
- ✅ **Mantiene** la sincronización en tiempo real sin cambios
- ✅ **Separa** responsabilidades (backend parsea, frontend aplica)
- ✅ **Escala** fácilmente para agregar voz/OCR/autocompletado
- ✅ **No rompe** nada existente (solo agrega features)

El flujo es simple: **Prompt → GPT-4o-mini → JSON → Acciones Socket.IO → Sincronización**

Total estimado de implementación: **4-6 horas** (3 archivos nuevos + 4 modificaciones pequeñas)
