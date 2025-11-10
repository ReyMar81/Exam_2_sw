// 🧠 AI Integration - OpenAI Service
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Tipos de acciones que la IA puede generar
 */
export type AIAction =
  | {
      type: "CreateTable";
      name: string;
      fields: AIField[];
    }
  | {
      type: "CreateRelation";
      fromTable: string;
      toTable: string;
      cardinality: "ONE_TO_ONE" | "ONE_TO_MANY" | "MANY_TO_MANY";
      through?: string;
    }
  | {
      type: "DeleteTable";
      name: string;
    }
  | {
      type: "AddField";
      tableName?: string; // Para compatibilidad con formato anterior
      targetTable?: string; // Para el nuevo formato
      field?: AIField; // Para compatibilidad con formato anterior (un solo campo)
      fields?: AIField[]; // Para el nuevo formato (múltiples campos)
    }
  | {
      type: "RenameTable";
      oldName: string;
      newName: string;
    }
  | {
      type: "DeleteRelation";
      fromTable: string;
      toTable: string;
    };

export interface AIField {
  name: string;
  type: string;
  isPrimary?: boolean;
  nullable?: boolean;
}

/**
 * System prompt para el modelo GPT-4o-mini
 */
const SYSTEM_PROMPT = `Eres un modelo de IA encargado de interpretar instrucciones en lenguaje natural y convertirlas en acciones JSON que describen operaciones sobre diagramas entidad-relación.

REGLAS GENERALES:
- Siempre devuelves un JSON válido con la propiedad "actions" (array de objetos).
- Cada acción tiene un campo "type" con valores posibles: CreateTable, AddField, CreateRelation, DeleteTable, RenameTable, DeleteRelation.
- No incluyas explicaciones ni texto adicional fuera del JSON.
- Usa nombres de tablas y campos en minúsculas y sin espacios (snake_case).

ACCIONES DISPONIBLES:

1. CreateTable: Crear una nueva tabla con campos
   - Incluye SIEMPRE un campo "id" con type "SERIAL" e isPrimary: true (a menos que el usuario especifique otra PK)
   - Tipos SQL comunes: INT, SERIAL, VARCHAR(n), TEXT, BOOLEAN, DATE, TIMESTAMP, DECIMAL(p,s), BIGINT

2. CreateRelation: Crear relación entre dos tablas existentes
   - Cardinalidades: "ONE_TO_ONE", "ONE_TO_MANY", "MANY_TO_MANY"

3. DeleteTable: Eliminar una tabla existente

4. AddField: Agregar campo(s) a una tabla existente
   - Puede recibir un array "fields" con múltiples campos

5. RenameTable: Renombrar una tabla existente
   - Requiere "oldName" y "newName"

6. DeleteRelation: Eliminar una relación entre dos tablas
   - Requiere "fromTable" y "toTable"

REGLAS PARA RELACIONES MUCHOS A MUCHOS (M:N o N:N):

1️ Si el usuario solicita una relación muchos a muchos:
   - NO crees una tabla intermedia con CreateTable.
   - El sistema ya genera automáticamente esa tabla.
   - Devuelve una acción "CreateRelation" con "cardinality": "MANY_TO_MANY".

2️ Si el usuario menciona atributos adicionales para la tabla intermedia:
   - Devuelve una acción separada de tipo "AddField".
   - Si el usuario NO da un nombre para la tabla intermedia, dedúcelo combinando los nombres de las tablas conectadas, en minúsculas y separadas por guion bajo.
     Ejemplo: persona y perfil → persona_perfil

3️ Si el usuario especifica un nombre personalizado para la tabla intermedia:
   - No la crees.
   - Devuelve una acción "RenameTable" para cambiar el nombre generado por el sistema (por defecto <tabla1>_<tabla2>) al nuevo nombre dado.
   - Luego, si se mencionan atributos adicionales, agrega una acción "AddField" sobre la nueva tabla renombrada.

REGLAS DE INFERENCIA:
- Nombres en snake_case (ej: "nombre_completo", "fecha_nacimiento")
- Infiere tipos apropiados:
  * email → VARCHAR(100)
  * nombre, apellido → VARCHAR(100)
  * edad → INT
  * precio → DECIMAL(10,2)
  * descripción → TEXT
  * activo, habilitado → BOOLEAN
  * fecha, fecha_creacion, fecha_expiracion → DATE
  * created_at, updated_at → TIMESTAMP
- Para relaciones, identifica automáticamente la cardinalidad:
  * "cliente tiene muchos pedidos" → ONE_TO_MANY (from: cliente, to: pedido)
  * "usuario pertenece a un rol" → MANY_TO_ONE (from: usuario, to: rol) → interpreta como ONE_TO_MANY invertida
  * "producto y categoría muchos a muchos" → MANY_TO_MANY
- Si el usuario dice "1 a N", "1:N", "uno a muchos" → ONE_TO_MANY
- Si el usuario dice "N a M", "N:M", "muchos a muchos" → MANY_TO_MANY
- Si el usuario dice "1 a 1", "1:1", "uno a uno" → ONE_TO_ONE

EJEMPLOS DE COMPORTAMIENTO CORRECTO:

Entrada: "Crea una relación muchos a muchos entre persona y perfil con una tabla intermedia llamada acceso_persona_perfil con fecha_creacion y activo."
Salida:
{
  "actions": [
    {
      "type": "CreateRelation",
      "fromTable": "persona",
      "toTable": "perfil",
      "cardinality": "MANY_TO_MANY"
    },
    {
      "type": "RenameTable",
      "oldName": "persona_perfil",
      "newName": "acceso_persona_perfil"
    },
    {
      "type": "AddField",
      "targetTable": "acceso_persona_perfil",
      "fields": [
        { "name": "fecha_creacion", "type": "DATE" },
        { "name": "activo", "type": "BOOLEAN" }
      ]
    }
  ]
}

Entrada: "Crea una relación muchos a muchos entre persona y perfil con campos fecha_creacion y fecha_expiracion."
Salida:
{
  "actions": [
    {
      "type": "CreateRelation",
      "fromTable": "persona",
      "toTable": "perfil",
      "cardinality": "MANY_TO_MANY"
    },
    {
      "type": "AddField",
      "targetTable": "persona_perfil",
      "fields": [
        { "name": "fecha_creacion", "type": "DATE" },
        { "name": "fecha_expiracion", "type": "DATE" }
      ]
    }
  ]
}

Entrada: "Crea una relación muchos a muchos entre cliente y producto."
Salida:
{
  "actions": [
    {
      "type": "CreateRelation",
      "fromTable": "cliente",
      "toTable": "producto",
      "cardinality": "MANY_TO_MANY"
    }
  ]
}

Entrada: "Crea una tabla persona con id, nombre, edad"
Salida:
{
  "actions": [{
    "type": "CreateTable",
    "name": "persona",
    "fields": [
      { "name": "id", "type": "SERIAL", "isPrimary": true },
      { "name": "nombre", "type": "VARCHAR(100)" },
      { "name": "edad", "type": "INT" }
    ]
  }]
}

Entrada: "Relación 1 a muchos entre cliente y pedido"
Salida:
{
  "actions": [{
    "type": "CreateRelation",
    "fromTable": "cliente",
    "toTable": "pedido",
    "cardinality": "ONE_TO_MANY"
  }]
}

Entrada: "Agrega campo telefono VARCHAR(20) a tabla usuario"
Salida:
{
  "actions": [{
    "type": "AddField",
    "tableName": "usuario",
    "field": { "name": "telefono", "type": "VARCHAR(20)" }
  }]
}

Entrada: "Elimina tabla temporal"
Salida:
{
  "actions": [{
    "type": "DeleteTable",
    "name": "temporal"
  }]
}

IMPORTANTE:
- Si el usuario pide crear tablas simples (no intermedias), usa CreateTable normalmente.
- Si pide agregar o eliminar campos, usa AddField o DeleteField.
- Si pide eliminar relaciones, usa DeleteRelation con los nombres de las tablas.
- Asegúrate de que el JSON sea estrictamente válido.
- Responde ÚNICAMENTE con JSON válido, sin texto adicional antes o después.`;

/**
 * Parsea un prompt del usuario y devuelve acciones estructuradas
 * usando GPT-4o-mini con respuesta JSON estricta
 */
export async function parseUserIntent(
  prompt: string
): Promise<{ actions: AIAction[] }> {
  try {
    console.log(`🧠 [AI] Parsing user intent: "${prompt.slice(0, 100)}..."`);

    const startTime = Date.now();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    const duration = Date.now() - startTime;
    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    console.log(`🧠 [AI] Raw response: ${content.slice(0, 200)}...`);

    const parsed = JSON.parse(content);

    if (!parsed.actions || !Array.isArray(parsed.actions)) {
      throw new Error("Invalid response format: missing actions array");
    }

    console.log(
      `✅ [AI] Successfully parsed ${parsed.actions.length} action(s) in ${duration}ms`
    );

    return { actions: parsed.actions };
  } catch (error: any) {
    console.error("❌ [AI] OpenAI API error:", error);

    if (error.code === "invalid_api_key") {
      throw new Error(
        "Invalid OpenAI API key. Please check OPENAI_API_KEY in .env"
      );
    }

    if (error.status === 429) {
      throw new Error("OpenAI API rate limit exceeded. Please try again later");
    }

    throw new Error(`AI parsing failed: ${error.message}`);
  }
}

/**
 * Valida que las acciones generadas sean correctas
 */
export function validateActions(actions: AIAction[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  actions.forEach((action, index) => {
    switch (action.type) {
      case "CreateTable":
        if (!action.name || action.name.trim() === "") {
          errors.push(`Action ${index}: CreateTable missing name`);
        }
        if (!action.fields || action.fields.length === 0) {
          errors.push(`Action ${index}: CreateTable has no fields`);
        }
        break;

      case "CreateRelation":
        if (!action.fromTable || !action.toTable) {
          errors.push(
            `Action ${index}: CreateRelation missing fromTable or toTable`
          );
        }
        if (
          !["ONE_TO_ONE", "ONE_TO_MANY", "MANY_TO_MANY"].includes(
            action.cardinality
          )
        ) {
          errors.push(`Action ${index}: Invalid cardinality ${action.cardinality}`);
        }
        break;

      case "DeleteTable":
        if (!action.name || action.name.trim() === "") {
          errors.push(`Action ${index}: DeleteTable missing name`);
        }
        break;

      case "AddField":
        const tableName = action.tableName || action.targetTable;
        if (!tableName || tableName.trim() === "") {
          errors.push(`Action ${index}: AddField missing tableName/targetTable`);
        }
        // Validar que tenga al menos uno de los dos formatos
        if (!action.field && (!action.fields || action.fields.length === 0)) {
          errors.push(`Action ${index}: AddField missing field/fields data`);
        }
        break;

      case "RenameTable":
        if (!action.oldName || action.oldName.trim() === "") {
          errors.push(`Action ${index}: RenameTable missing oldName`);
        }
        if (!action.newName || action.newName.trim() === "") {
          errors.push(`Action ${index}: RenameTable missing newName`);
        }
        break;

      case "DeleteRelation":
        if (!action.fromTable || !action.toTable) {
          errors.push(
            `Action ${index}: DeleteRelation missing fromTable or toTable`
          );
        }
        break;

      default:
        errors.push(`Action ${index}: Unknown action type`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
