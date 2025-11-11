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
   - IMPORTANTE: Las claves foráneas (campos que terminan en _id) deben ser de tipo INT, NO SERIAL
   - Solo el campo "id" principal debe ser SERIAL con isPrimary: true

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

IMPORTANTE SOBRE TIPOS:
- Solo el campo "id" (PK) debe ser SERIAL con isPrimary: true
- Todas las FKs (usuario_id, libro_id, categoria_id, etc.) deben ser INT
- NO uses SERIAL para campos que no sean la llave primaria principal

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
 * System prompt especializado para análisis de imágenes de diagramas ER
 */
const IMAGE_SYSTEM_PROMPT = `Eres un modelo de IA experto en analizar diagramas Entidad-Relación (ER) desde imágenes.

TAREA:
- Identificar todas las tablas/entidades visibles en el diagrama
- Extraer los campos de cada tabla con sus tipos de datos
- Detectar relaciones entre tablas (líneas/flechas que las conectan)
- Devolver un JSON con acciones estructuradas

REGLAS GENERALES:
- Siempre devuelves un JSON válido con la propiedad "actions" (array de objetos)
- Cada acción tiene un campo "type" con valores: CreateTable, CreateRelation
- Usa nombres en minúsculas y snake_case (ej: "nombre_completo", "fecha_nacimiento")
- Si no detectas datos en la imagen, devuelve { "actions": [] }

ACCIONES DISPONIBLES:

1. CreateTable: Crear tabla con campos
   - SIEMPRE incluye campo "id" con type "SERIAL" e isPrimary: true
   - Tipos SQL comunes: INT, SERIAL, VARCHAR(100), TEXT, BOOLEAN, DATE, TIMESTAMP, DECIMAL(10,2)
   - IMPORTANTE: Las claves foráneas (campos *_id) deben ser INT, NO SERIAL
   - Solo el campo "id" principal debe ser SERIAL con isPrimary: true

2. CreateRelation: Crear relación entre tablas
   - Cardinalidades: "ONE_TO_ONE", "ONE_TO_MANY", "MANY_TO_MANY"
   - Detecta la cardinalidad según las notaciones visuales (1:1, 1:N, N:M, crow's foot, etc.)

INFERENCIA DE TIPOS:
- Si ves "email", "correo" → VARCHAR(100)
- Si ves "nombre", "apellido" → VARCHAR(100)
- Si ves "edad", "cantidad" → INT
- Si ves "precio", "monto" → DECIMAL(10,2)
- Si ves "descripción", "comentario" → TEXT
- Si ves "activo", "habilitado" → BOOLEAN
- Si ves "fecha", "fecha_creacion" → DATE
- Si ves "created_at", "updated_at" → TIMESTAMP
- Si ves PK, Primary Key, id → isPrimary: true

EJEMPLO DE RESPUESTA:
{
  "actions": [
    {
      "type": "CreateTable",
      "name": "usuario",
      "fields": [
        { "name": "id", "type": "SERIAL", "isPrimary": true },
        { "name": "nombre", "type": "VARCHAR(100)" },
        { "name": "email", "type": "VARCHAR(100)" }
      ]
    },
    {
      "type": "CreateTable",
      "name": "pedido",
      "fields": [
        { "name": "id", "type": "SERIAL", "isPrimary": true },
        { "name": "fecha", "type": "DATE" },
        { "name": "total", "type": "DECIMAL(10,2)" }
      ]
    },
    {
      "type": "CreateRelation",
      "fromTable": "usuario",
      "toTable": "pedido",
      "cardinality": "ONE_TO_MANY"
    }
  ]
}

IMPORTANTE:
- Si la imagen es borrosa o ilegible, haz tu mejor esfuerzo para interpretar
- Prioriza la detección de tablas sobre relaciones
- Si no estás seguro de un tipo, usa VARCHAR(100) por defecto
- Solo el campo "id" (PK) debe ser SERIAL, todas las FKs (*_id) deben ser INT
- Responde ÚNICAMENTE con JSON válido`;

/**
 * Parsea una imagen de diagrama ER y devuelve acciones estructuradas
 * usando GPT-4o-mini con visión
 */
export async function parseImageIntent(
  imageBase64: string
): Promise<{ actions: AIAction[] }> {
  try {
    console.log(`🧠 [AI Image] Processing image input (${Math.round(imageBase64.length / 1024)}KB)...`);

    const startTime = Date.now();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: IMAGE_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analiza este diagrama entidad-relación y devuelve las acciones necesarias para recrearlo.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
    });

    const duration = Date.now() - startTime;
    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    console.log(`🧠 [AI Image] Raw response: ${content.slice(0, 200)}...`);

    const parsed = JSON.parse(content);

    if (!parsed.actions || !Array.isArray(parsed.actions)) {
      throw new Error("Invalid response format: missing actions array");
    }

    console.log(
      `✅ [AI Image] Successfully parsed ${parsed.actions.length} action(s) in ${duration}ms`
    );

    return { actions: parsed.actions };
  } catch (error: any) {
    console.error("❌ [AI Image] OpenAI API error:", error);

    if (error.code === "invalid_api_key") {
      throw new Error(
        "Invalid OpenAI API key. Please check OPENAI_API_KEY in .env"
      );
    }

    if (error.status === 429) {
      throw new Error("OpenAI API rate limit exceeded. Please try again later");
    }

    throw new Error(`AI image parsing failed: ${error.message}`);
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
        // Normalizamos cardinalidades equivalentes
        if ((action.cardinality as any) === "MANY_TO_ONE") action.cardinality = "ONE_TO_MANY";
        if ((action.cardinality as any) === "TO_ONE") action.cardinality = "ONE_TO_ONE";
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

/**
 * 🧹 Limpia campos duplicados en acciones CreateTable
 * Elimina campos con nombres idénticos, conservando solo la primera ocurrencia
 * Normaliza tipos: SERIAL en FKs se convierte a INT (solo las PKs deben ser SERIAL)
 */
export function cleanDuplicateFKs(actions: AIAction[]): AIAction[] {
  return actions.map((action) => {
    if (action.type === "CreateTable" && action.fields) {
      const uniqueFieldsMap = new Map<string, AIField>();
      
      action.fields.forEach((field) => {
        const fieldKey = field.name.toLowerCase();
        
        // Normalizar tipo: Si es FK (termina en _id) y es SERIAL, convertir a INT
        let normalizedField = { ...field };
        if (fieldKey.endsWith("_id") && !field.isPrimary && field.type === "SERIAL") {
          normalizedField.type = "INT";
          console.log(
            `🧹 [AI Clean] Normalized FK type "${field.name}" from SERIAL to INT in table "${action.name}"`
          );
        }
        
        if (uniqueFieldsMap.has(fieldKey)) {
          console.log(
            `🧹 [AI Clean] Removed duplicate field "${field.name}" from table "${action.name}"`
          );
        } else {
          uniqueFieldsMap.set(fieldKey, normalizedField);
        }
      });

      const uniqueFields = Array.from(uniqueFieldsMap.values());

      if (uniqueFields.length !== action.fields.length) {
        return { ...action, fields: uniqueFields };
      } else {
        // Aunque no haya duplicados, puede haber normalizado tipos
        const hasNormalizedTypes = uniqueFields.some((f, i) => 
          f.type !== action.fields[i].type
        );
        if (hasNormalizedTypes) {
          return { ...action, fields: uniqueFields };
        }
      }
    }
    return action;
  });
}

/**
 * 🧹 Normaliza tablas intermedias y tablas con FKs redundantes
 * 
 * 1. Detecta tablas intermedias (con guion bajo) y elimina FKs que el sistema crea automáticamente
 * 2. Detecta tablas normales con FKs redundantes basándose en relaciones definidas
 */
export function normalizeIntermediateTables(actions: AIAction[]): AIAction[] {
  // Primero, recopilamos todas las relaciones para saber qué FKs se crearán automáticamente
  const relationFKs = new Map<string, Set<string>>(); // tableName -> Set de FKs que se crearán
  
  actions.forEach((action) => {
    if (action.type === "CreateRelation") {
      const { fromTable, toTable, cardinality } = action;
      
      // En relaciones 1-N, la tabla "to" recibe FK de "from"
      if (cardinality === "ONE_TO_MANY") {
        if (!relationFKs.has(toTable.toLowerCase())) {
          relationFKs.set(toTable.toLowerCase(), new Set());
        }
        relationFKs.get(toTable.toLowerCase())!.add(`${fromTable.toLowerCase()}_id`);
      }
      
      // En relaciones N-N, se crea tabla intermedia con ambos FKs
      if (cardinality === "MANY_TO_MANY") {
        const intermediateTable = `${fromTable.toLowerCase()}_${toTable.toLowerCase()}`;
        if (!relationFKs.has(intermediateTable)) {
          relationFKs.set(intermediateTable, new Set());
        }
        relationFKs.get(intermediateTable)!.add(`${fromTable.toLowerCase()}_id`);
        relationFKs.get(intermediateTable)!.add(`${toTable.toLowerCase()}_id`);
      }
    }
  });

  // Ahora limpiamos las tablas
  return actions.map((action) => {
    if (action.type === "CreateTable" && action.fields) {
      const tableName = action.name.toLowerCase();
      
      // Obtener FKs que se crearán automáticamente para esta tabla
      const autoFKs = relationFKs.get(tableName) || new Set();
      
      // Detectar si es tabla intermedia (tiene guion bajo)
      const isIntermediateTable = tableName.includes("_");
      
      if (isIntermediateTable) {
        const parts = tableName.split("_");
        
        // Filtrar campos FK redundantes
        const cleanedFields = action.fields.filter((field) => {
          const fieldName = field.name.toLowerCase();
          
          // Mantener campos que NO son FKs o que son PKs
          if (!fieldName.endsWith("_id") || field.isPrimary) {
            return true;
          }
          
          // Verificar si es FK redundante (coincide con partes del nombre de tabla)
          const fieldBase = fieldName.replace("_id", "");
          
          for (const part of parts) {
            // Manejar singular/plural: "usuario" coincide con "usuarios"
            if (fieldBase === part || 
                fieldBase === part.slice(0, -1) || 
                fieldBase === part.slice(0, -2) + (part.endsWith("s") ? "" : "s")) {
              console.log(
                `🧹 [AI Clean] Removed redundant FK "${field.name}" from intermediate table "${action.name}" (system will auto-create it)`
              );
              return false;
            }
          }
          
          // Verificar si está en la lista de FKs automáticos
          if (autoFKs.has(fieldName)) {
            console.log(
              `🧹 [AI Clean] Removed redundant FK "${field.name}" from intermediate table "${action.name}" (defined in CreateRelation)`
            );
            return false;
          }
          
          return true;
        });

        if (cleanedFields.length !== action.fields.length) {
          return { ...action, fields: cleanedFields };
        }
      } else {
        // Para tablas normales, solo eliminar FKs que están definidas en relaciones
        if (autoFKs.size > 0) {
          const cleanedFields = action.fields.filter((field) => {
            const fieldName = field.name.toLowerCase();
            
            if (autoFKs.has(fieldName) && !field.isPrimary) {
              console.log(
                `🧹 [AI Clean] Removed redundant FK "${field.name}" from table "${action.name}" (defined in CreateRelation)`
              );
              return false;
            }
            
            return true;
          });
          
          if (cleanedFields.length !== action.fields.length) {
            return { ...action, fields: cleanedFields };
          }
        }
      }
    }
    return action;
  });
}
