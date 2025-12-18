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
      cardinality?: "ONE_TO_ONE" | "ONE_TO_MANY" | "MANY_TO_MANY";
      relationType?: "ASSOCIATION" | "AGGREGATION" | "COMPOSITION" | "INHERITANCE" | "DEPENDENCY" | "REALIZATION";
      onDelete?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
      onUpdate?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
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
    }
  | {
      type: "RenameField";
      tableName: string;
      oldFieldName: string;
      newFieldName: string;
    }
  | {
      type: "DeleteField";
      tableName: string;
      fieldNames: string[];
    }
  | {
      type: "ModifyField";
      tableName: string;
      fieldName: string;
      newType?: string;
      nullable?: boolean;
      isPrimary?: boolean;
    }
  | {
      type: "ModifyRelation";
      fromTable: string;
      toTable: string;
      relationType?: string;
      onDelete?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
      onUpdate?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
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
- Cada acción tiene un campo "type" con valores posibles: CreateTable, AddField, CreateRelation, DeleteTable, RenameTable, DeleteRelation, RenameField, DeleteField, ModifyField, ModifyRelation.
- No incluyas explicaciones ni texto adicional fuera del JSON.
- Usa nombres de tablas y campos en minúsculas y sin espacios (snake_case).

ACCIONES DISPONIBLES:

1. CreateTable: Crear una nueva tabla con campos
   - Incluye SIEMPRE un campo "id" con type "SERIAL" e isPrimary: true (a menos que el usuario especifique otra PK)
   - Tipos SQL comunes: INT, SERIAL, VARCHAR(n), TEXT, BOOLEAN, DATE, TIMESTAMP, DECIMAL(p,s), BIGINT
   - IMPORTANTE: Las claves foráneas (campos que terminan en _id) deben ser de tipo INT, NO SERIAL
   - Solo el campo "id" principal debe ser SERIAL con isPrimary: true

2. CreateRelation: Crear relación entre dos tablas existentes
   - IMPORTANTE: Usa "relationType" para tipos UML 2.5, NO uses "cardinality" para ellos
   - Campo "cardinality": Solo para cardinalidades clásicas ("ONE_TO_ONE", "ONE_TO_MANY", "MANY_TO_MANY")
   - Campo "relationType": Para tipos UML 2.5 ("ASSOCIATION", "AGGREGATION", "COMPOSITION", "INHERITANCE", "DEPENDENCY", "REALIZATION")
   - Propiedades CASCADE: "onDelete" y "onUpdate" (valores: "CASCADE", "SET NULL", "RESTRICT", "NO ACTION")
   
   TIPOS DE RELACIONES UML 2.5 (usar "relationType", NO "cardinality"):
   - INHERITANCE: Para relaciones "es un" (herencia, extiende, generalización, subclase, superclase)
     * "Empleado hereda de Persona" → { "relationType": "INHERITANCE", "fromTable": "empleado", "toTable": "persona" }
     * "Gerente extiende Empleado" → { "relationType": "INHERITANCE" }
   - COMPOSITION: Relación fuerte (el componente no existe sin el todo)
     * "Habitación es parte de Casa" → { "relationType": "COMPOSITION", "onDelete": "CASCADE" }
   - AGGREGATION: Relación débil (el componente puede existir independientemente)
     * "Profesor tiene Departamento" → { "relationType": "AGGREGATION", "onDelete": "SET NULL" }
   - ASSOCIATION: Relación simple entre entidades
   - DEPENDENCY: Dependencia temporal o de uso
   - REALIZATION: Implementación de interfaz
   
   CARDINALIDADES CLÁSICAS (usar "cardinality"):
   - "uno a uno" → { "cardinality": "ONE_TO_ONE" }
   - "uno a muchos" → { "cardinality": "ONE_TO_MANY" }
   - "muchos a muchos" → { "cardinality": "MANY_TO_MANY" }

3. DeleteTable: Eliminar una tabla existente

4. AddField: Agregar campo(s) a una tabla existente
   - Puede recibir un array "fields" con múltiples campos
   - Para campos FK, especifica "relationType", "onDelete", "onUpdate"

5. RenameTable: Renombrar una tabla existente
   - Requiere "oldName" y "newName"

6. DeleteRelation: Eliminar una relación entre dos tablas
   - Requiere "fromTable" y "toTable"

7. RenameField: Renombrar un campo de una tabla
   - Requiere "tableName", "oldFieldName", "newFieldName"

8. DeleteField: Eliminar campo(s) de una tabla
   - Requiere "tableName", "fieldNames" (array de nombres de campos)

9. ModifyField: Modificar propiedades de un campo
   - Requiere "tableName", "fieldName", y propiedades a cambiar ("newType", "nullable", "isPrimary")

10. ModifyRelation: Modificar tipo o propiedades de una relación
    - Requiere "fromTable", "toTable", y propiedades a cambiar ("relationType", "onDelete", "onUpdate")

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

GENERACIÓN DE DIAGRAMAS COMPLETOS:

Cuando el usuario solicite "diagrama de gestión de X", "sistema de X", o "base de datos para X", 
genera un diagrama COMPLETO Y FUNCIONAL con 4-7 tablas relacionadas siguiendo estos patrones:

PATRÓN BÁSICO DE GESTIÓN:
1. Tabla principal de la entidad a gestionar (ej: producto, empleado, cliente)
2. Tablas de categorización (ej: categoria, departamento, tipo)
3. Tablas de detalles/transacciones (ej: venta, pedido, movimiento)
4. Tablas de auditoría (ej: historial, log, seguimiento)
5. Tablas de relaciones M:N cuando sea necesario

EJEMPLOS DE DIAGRAMAS COMPLETOS:

📦 Sistema de Inventario con Sucursales:
- sucursal (id, nombre, direccion, telefono, activa)
- categoria (id, nombre, descripcion)
- producto (id, nombre, precio, stock_minimo, categoria_id)
- inventario (id, producto_id, sucursal_id, cantidad, fecha_actualizacion)
- movimiento (id, producto_id, sucursal_id, tipo, cantidad, fecha, usuario)
Relaciones: categoria 1:N producto, producto 1:N inventario, sucursal 1:N inventario, producto 1:N movimiento

🏥 Sistema de Gestión Hospitalaria:
- paciente (id, nombre, fecha_nacimiento, telefono, email)
- medico (id, nombre, especialidad, telefono)
- cita (id, paciente_id, medico_id, fecha_hora, motivo, estado)
- historial_medico (id, paciente_id, fecha, diagnostico, tratamiento)
- medicamento (id, nombre, descripcion, precio)
- receta (id, cita_id, medicamento_id, dosis, duracion_dias)

🎓 Sistema de Gestión Académica:
- estudiante (id, nombre, email, fecha_ingreso, carrera)
- profesor (id, nombre, especialidad, email)
- curso (id, nombre, codigo, creditos, profesor_id)
- inscripcion (id, estudiante_id, curso_id, semestre, nota_final)
- asistencia (id, inscripcion_id, fecha, presente)

🏪 Sistema de Ventas:
- cliente (id, nombre, email, telefono, direccion)
- categoria (id, nombre, descripcion)
- producto (id, nombre, precio, stock, categoria_id)
- venta (id, cliente_id, fecha, total, estado)
- detalle_venta (id, venta_id, producto_id, cantidad, precio_unitario)

REGLAS PARA DIAGRAMAS COMPLETOS:
1. Siempre incluye campos de auditoría (created_at, updated_at) cuando sea apropiado
2. Usa campos de estado (estado, activo, habilitado) para soft-deletes
3. Incluye al menos 2 relaciones ONE_TO_MANY
4. Si tiene sentido, agrega 1 relación MANY_TO_MANY
5. Todos los nombres en snake_case y en minúsculas
6. IDs como SERIAL y PKs, FKs como INT
7. Campos de texto corto VARCHAR(100-255), texto largo TEXT
8. Precios y cantidades como DECIMAL(10,2)
9. Fechas como DATE, timestamps como TIMESTAMP

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
  * "composición de A en B" → COMPOSITION (onDelete: CASCADE, onUpdate: CASCADE)
  * "agregación de X a Y" → AGGREGATION (onDelete: SET NULL, onUpdate: CASCADE)
  * "B hereda de A" → INHERITANCE (onDelete: CASCADE, onUpdate: CASCADE)
  * "asociación entre X y Y" → ASSOCIATION
  * "dependencia de A hacia B" → DEPENDENCY
  * "realización de interfaz I por clase C" → REALIZATION
- Si el usuario dice "1 a N", "1:N", "uno a muchos" → ONE_TO_MANY
- Si el usuario dice "N a M", "N:M", "muchos a muchos" → MANY_TO_MANY
- Si el usuario dice "1 a 1", "1:1", "uno a uno" → ONE_TO_ONE
- Si el usuario menciona "en cascada", "eliminar hijos", "parte de" → COMPOSITION con CASCADE
- Si el usuario menciona "opcional", "independiente", "agregado" → AGGREGATION con SET NULL

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

Entrada: "Crea un diagrama de gestión de inventario con sucursales"
Salida:
{
  "actions": [
    {
      "type": "CreateTable",
      "name": "sucursal",
      "fields": [
        { "name": "id", "type": "SERIAL", "isPrimary": true },
        { "name": "nombre", "type": "VARCHAR(100)" },
        { "name": "direccion", "type": "VARCHAR(200)" },
        { "name": "telefono", "type": "VARCHAR(20)" },
        { "name": "activa", "type": "BOOLEAN" }
      ]
    },
    {
      "type": "CreateTable",
      "name": "categoria",
      "fields": [
        { "name": "id", "type": "SERIAL", "isPrimary": true },
        { "name": "nombre", "type": "VARCHAR(100)" },
        { "name": "descripcion", "type": "TEXT" }
      ]
    },
    {
      "type": "CreateTable",
      "name": "producto",
      "fields": [
        { "name": "id", "type": "SERIAL", "isPrimary": true },
        { "name": "nombre", "type": "VARCHAR(150)" },
        { "name": "precio", "type": "DECIMAL(10,2)" },
        { "name": "stock_minimo", "type": "INT" },
        { "name": "categoria_id", "type": "INT", "isForeign": true }
      ]
    },
    {
      "type": "CreateTable",
      "name": "inventario",
      "fields": [
        { "name": "id", "type": "SERIAL", "isPrimary": true },
        { "name": "producto_id", "type": "INT", "isForeign": true },
        { "name": "sucursal_id", "type": "INT", "isForeign": true },
        { "name": "cantidad", "type": "INT" },
        { "name": "fecha_actualizacion", "type": "TIMESTAMP" }
      ]
    },
    {
      "type": "CreateTable",
      "name": "movimiento",
      "fields": [
        { "name": "id", "type": "SERIAL", "isPrimary": true },
        { "name": "producto_id", "type": "INT", "isForeign": true },
        { "name": "sucursal_id", "type": "INT", "isForeign": true },
        { "name": "tipo", "type": "VARCHAR(20)" },
        { "name": "cantidad", "type": "INT" },
        { "name": "fecha", "type": "TIMESTAMP" },
        { "name": "usuario", "type": "VARCHAR(100)" }
      ]
    },
    { "type": "CreateRelation", "fromTable": "categoria", "toTable": "producto", "cardinality": "ONE_TO_MANY" },
    { "type": "CreateRelation", "fromTable": "producto", "toTable": "inventario", "cardinality": "ONE_TO_MANY" },
    { "type": "CreateRelation", "fromTable": "sucursal", "toTable": "inventario", "cardinality": "ONE_TO_MANY" },
    { "type": "CreateRelation", "fromTable": "producto", "toTable": "movimiento", "cardinality": "ONE_TO_MANY" },
    { "type": "CreateRelation", "fromTable": "sucursal", "toTable": "movimiento", "cardinality": "ONE_TO_MANY" }
  ]
}

Entrada: "Sistema de ventas básico"
Salida:
{
  "actions": [
    {
      "type": "CreateTable",
      "name": "cliente",
      "fields": [
        { "name": "id", "type": "SERIAL", "isPrimary": true },
        { "name": "nombre", "type": "VARCHAR(100)" },
        { "name": "email", "type": "VARCHAR(100)" },
        { "name": "telefono", "type": "VARCHAR(20)" },
        { "name": "created_at", "type": "TIMESTAMP" }
      ]
    },
    {
      "type": "CreateTable",
      "name": "producto",
      "fields": [
        { "name": "id", "type": "SERIAL", "isPrimary": true },
        { "name": "nombre", "type": "VARCHAR(150)" },
        { "name": "precio", "type": "DECIMAL(10,2)" },
        { "name": "stock", "type": "INT" }
      ]
    },
    {
      "type": "CreateTable",
      "name": "venta",
      "fields": [
        { "name": "id", "type": "SERIAL", "isPrimary": true },
        { "name": "cliente_id", "type": "INT", "isForeign": true },
        { "name": "fecha", "type": "TIMESTAMP" },
        { "name": "total", "type": "DECIMAL(10,2)" },
        { "name": "estado", "type": "VARCHAR(20)" }
      ]
    },
    {
      "type": "CreateTable",
      "name": "detalle_venta",
      "fields": [
        { "name": "id", "type": "SERIAL", "isPrimary": true },
        { "name": "venta_id", "type": "INT", "isForeign": true },
        { "name": "producto_id", "type": "INT", "isForeign": true },
        { "name": "cantidad", "type": "INT" },
        { "name": "precio_unitario", "type": "DECIMAL(10,2)" }
      ]
    },
    { "type": "CreateRelation", "fromTable": "cliente", "toTable": "venta", "cardinality": "ONE_TO_MANY" },
    { "type": "CreateRelation", "fromTable": "venta", "toTable": "detalle_venta", "cardinality": "ONE_TO_MANY" },
    { "type": "CreateRelation", "fromTable": "producto", "toTable": "detalle_venta", "cardinality": "ONE_TO_MANY" }
  ]
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
 * System prompt especializado para análisis de imágenes de diagramas ER y UML 2.5
 */
const IMAGE_SYSTEM_PROMPT = `Eres un modelo de IA experto en analizar diagramas Entidad-Relación (ER) y diagramas UML 2.5 desde imágenes.

TAREA:
- Identificar TODAS las tablas/entidades visibles en el diagrama
- Extraer TODOS los campos de cada tabla con sus tipos de datos (incluidos los campos FK)
- Detectar TODAS las relaciones entre tablas (líneas, flechas, conectores)
- Identificar el tipo de relación según la notación visual (UML, Crow's Foot, Chen, etc.)
- Generar un diagrama COMPLETO y funcional listo para usar
- Devolver un JSON con acciones estructuradas

REGLAS GENERALES:
- Siempre devuelves un JSON válido con la propiedad "actions" (array de objetos)
- Cada acción tiene un campo "type" con valores: CreateTable, CreateRelation
- Usa nombres en minúsculas y snake_case (ej: "nombre_completo", "fecha_nacimiento")
- Si no detectas datos en la imagen, devuelve { "actions": [] }
- IMPORTANTE: Genera el diagrama COMPLETO, no omitas campos ni relaciones

ACCIONES DISPONIBLES:

1. CreateTable: Crear tabla con campos
   - SIEMPRE incluye campo "id" con type "SERIAL" e isPrimary: true (a menos que el diagrama muestre otra PK)
   - Tipos SQL comunes: INT, SERIAL, VARCHAR(100), TEXT, BOOLEAN, DATE, TIMESTAMP, DECIMAL(10,2), BIGINT
   - IMPORTANTE: Las claves foráneas (campos *_id) deben ser INT, NO SERIAL
   - Solo el campo "id" principal debe ser SERIAL con isPrimary: true
   - Extrae TODOS los campos visibles, incluyendo FKs

2. CreateRelation: Crear relación entre tablas
   - IMPORTANTE: Usa "cardinality" para cardinalidades clásicas, "relationType" para tipos UML 2.5
   - Campo "cardinality": Solo para cardinalidades clásicas ("ONE_TO_ONE", "ONE_TO_MANY", "MANY_TO_MANY")
   - Campo "relationType": Para tipos UML 2.5 ("ASSOCIATION", "AGGREGATION", "COMPOSITION", "INHERITANCE", "DEPENDENCY", "REALIZATION")
   - Propiedades CASCADE: "onDelete" y "onUpdate" (valores: "CASCADE", "SET NULL", "RESTRICT", "NO ACTION")
   
   DETECTAR TIPO SEGÚN NOTACIÓN VISUAL:
   * Rombo vacío (◇) → { "relationType": "AGGREGATION", "onDelete": "SET NULL", "onUpdate": "CASCADE" }
   * Rombo lleno (◆) → { "relationType": "COMPOSITION", "onDelete": "CASCADE", "onUpdate": "CASCADE" }
   * Flecha vacía cerrada/triangular (▷, △) → { "relationType": "INHERITANCE", "onDelete": "CASCADE", "onUpdate": "CASCADE" }
   * Línea punteada con flecha (- - >) → { "relationType": "DEPENDENCY" }
   * Línea punteada con flecha vacía (- - ▷) → { "relationType": "REALIZATION" }
   * Línea continua simple → { "relationType": "ASSOCIATION" }
   * Crow's foot (patas de gallo), 1:N, 1 a muchos → { "cardinality": "ONE_TO_MANY" }
   * Muchos a muchos, N:M, M:N → { "cardinality": "MANY_TO_MANY" }
   * Uno a uno, 1:1 → { "cardinality": "ONE_TO_ONE" }
   
   IMPORTANTE: 
   - NO uses "cardinality" para tipos UML (INHERITANCE, COMPOSITION, etc.)
   - Usa "relationType" para INHERITANCE, COMPOSITION, AGGREGATION, ASSOCIATION, DEPENDENCY, REALIZATION
   - Usa "cardinality" solo para ONE_TO_ONE, ONE_TO_MANY, MANY_TO_MANY

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

EJEMPLOS DE RESPUESTA:

Ejemplo 1: Herencia (Empleado hereda de Persona)
Si ves: Empleado ▷ Persona (flecha triangular apunta a Persona)
{
  "actions": [
    {
      "type": "CreateTable",
      "name": "persona",
      "fields": [
        { "name": "id", "type": "SERIAL", "isPrimary": true },
        { "name": "nombre", "type": "VARCHAR(100)" }
      ]
    },
    {
      "type": "CreateTable",
      "name": "empleado",
      "fields": [
        { "name": "id", "type": "SERIAL", "isPrimary": true },
        { "name": "salario", "type": "DECIMAL(10,2)" }
      ]
    },
    {
      "type": "CreateRelation",
      "fromTable": "empleado",
      "toTable": "persona",
      "relationType": "INHERITANCE",
      "onDelete": "CASCADE"
    }
  ]
}

Ejemplo 2: Relación 1-N (Un autor escribe muchos libros)
Si ves: Autor ─(1-N)─ Libro
{
  "actions": [
    {
      "type": "CreateTable",
      "name": "autor",
      "fields": [
        { "name": "id", "type": "SERIAL", "isPrimary": true },
        { "name": "nombre", "type": "VARCHAR(100)" }
      ]
    },
    {
      "type": "CreateTable",
      "name": "libro",
      "fields": [
        { "name": "id", "type": "SERIAL", "isPrimary": true },
        { "name": "titulo", "type": "VARCHAR(200)" },
        { "name": "autor_id", "type": "INT", "isForeign": true }
      ]
    },
    {
      "type": "CreateRelation",
      "fromTable": "autor",
      "toTable": "libro",
      "cardinality": "ONE_TO_MANY"
    }
  ]
}

Ejemplo 3: Composición (Libro contiene páginas)
Si ves: Libro ◆─ Pagina (rombo lleno en Libro)
{
  "actions": [
    {
      "type": "CreateTable",
      "name": "libro",
      "fields": [
        { "name": "id", "type": "SERIAL", "isPrimary": true },
        { "name": "titulo", "type": "VARCHAR(200)" }
      ]
    },
    {
      "type": "CreateTable",
      "name": "pagina",
      "fields": [
        { "name": "id", "type": "SERIAL", "isPrimary": true },
        { "name": "numero", "type": "INT" },
        { "name": "libro_id", "type": "INT", "isForeign": true }
      ]
    },
    {
      "type": "CreateRelation",
      "fromTable": "libro",
      "toTable": "pagina",
      "relationType": "COMPOSITION",
      "onDelete": "CASCADE"
    }
  ]
}

REGLAS PARA DIAGRAMAS DIBUJADOS A MANO:
- Identifica cajas/rectángulos como tablas, incluso si están irregulares
- El texto en la parte superior de cada caja es el nombre de la tabla
- Los textos dentro de cada caja son los campos/atributos
- Las líneas que conectan cajas son relaciones

⚠️ PASO 1 - EXAMINA CADA LÍNEA/FLECHA CUIDADOSAMENTE:
Antes de decidir el tipo de relación, pregúntate:
¿Hay una punta de flecha con forma de TRIÁNGULO VACÍO? → SÍ = INHERITANCE
¿Hay un ROMBO LLENO (negro/pintado) en la línea? → SÍ = COMPOSITION  
¿Hay un ROMBO VACÍO en la línea? → SÍ = AGGREGATION
¿Hay texto "1-N" o "1:N" sin símbolos especiales? → SÍ = ONE_TO_MANY
¿Es solo una línea simple sin símbolos? → Por defecto = ONE_TO_MANY o ASSOCIATION

⚠️ PRIORIDAD MÁXIMA - DETECTAR SÍMBOLOS UML PRIMERO:
Antes de analizar cardinalidades (1-N, 1-1), BUSCA ESTOS SÍMBOLOS en las flechas/líneas:

1️⃣ FLECHA TRIANGULAR VACÍA (▷, △, ▶ vacío): ES HERENCIA
   - Usa "relationType": "INHERITANCE"
   - NO uses "cardinality"
   - La flecha apunta del hijo al padre
   - Ejemplo: Si ves Autor con △ apuntando a Persona → Autor hereda de Persona

2️⃣ ROMBO LLENO/NEGRO (◆, ♦, rombo pintado): ES COMPOSICIÓN
   - Usa "relationType": "COMPOSITION"
   - NO uses "cardinality"
   - El rombo está en el contenedor, la FK va en la parte contenida
   - Ejemplo: Si ves Libro con ◆ conectado a Pagina → Libro contiene Páginas

3️⃣ ROMBO VACÍO (◇, ◊): ES AGREGACIÓN
   - Usa "relationType": "AGGREGATION"
   - NO uses "cardinality"

4️⃣ SOLO SI NO HAY SÍMBOLOS UML, entonces mira cardinalidades:
   - "1-N" o "1:N" → "cardinality": "ONE_TO_MANY"
   - "N-M" o "M-N" → "cardinality": "MANY_TO_MANY"
   - "1-1" → "cardinality": "ONE_TO_ONE"

CRÍTICO: Si ves un triángulo o rombo, IGNORA cualquier "1-N" que pueda estar cerca.
Los símbolos UML tienen prioridad absoluta sobre las cardinalidades numéricas.

CRÍTICO - DIRECCIÓN DE RELACIONES 1-N:
Para relaciones ONE_TO_MANY, la clave foránea (FK) SIEMPRE va en la tabla del lado "N" (muchos):
- Si la línea dice "1-N" y conecta TablaA con TablaB:
  * Identifica cuál tabla está en el lado "1" y cuál en el lado "N"
  * La FK va en la tabla del lado "N"
  * Ejemplo: Autor (1) ← → (N) Libro → libro debe tener autor_id
  * Ejemplo: Editorial (1) ← → (N) Libro → libro debe tener editorial_id
  
- Si hay una flecha simple (→) sin rombo:
  * Asume que la flecha apunta desde el lado "1" hacia el lado "N"
  * La FK va en la tabla hacia donde apunta la flecha
  * Ejemplo: Autor → Libro significa autor (1) hacia libro (N) → libro tiene autor_id
  
- Para INHERITANCE (▷, △):
  * La flecha apunta del hijo hacia el padre
  * El hijo hereda del padre
  * Ejemplo: Empleado ▷ Persona → empleado hereda de persona
  * fromTable = tabla hijo (donde está la base de la flecha)
  * toTable = tabla padre (donde apunta la punta de la flecha)

- Para COMPOSITION (◆):
  * El rombo está en la tabla contenedora (el "todo")
  * La FK va en la tabla contenida (la "parte")
  * Ejemplo: Libro ◆─ Pagina → libro contiene páginas → pagina tiene libro_id

IMPORTANTE:
- Si la imagen es borrosa o ilegible, haz tu mejor esfuerzo para interpretar
- DETECTA TODAS las tablas, campos y relaciones visibles - el objetivo es recrear el diagrama COMPLETO
- Prioriza completitud sobre perfección: mejor incluir algo dudoso que omitirlo
- Si no estás seguro de un tipo, usa VARCHAR(100) por defecto
- Solo el campo "id" (PK) debe ser SERIAL, todas las FKs (*_id) deben ser INT
- Si ves un campo FK pero no hay relación visual, CREA la relación (infiere ONE_TO_MANY)
- Si ves relaciones sin FKs explícitos, añade el FK automáticamente en CreateTable
- Para diagramas a mano, sé flexible con la ortografía y nombres irregulares
- Normaliza nombres a snake_case minúsculas (ej: "Nombre" → "nombre", "Fecha Nacimiento" → "fecha_nacimiento")
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
              text: `Analiza este diagrama entidad-relación y devuelve las acciones necesarias para recrearlo.

⚠️ IMPORTANTE - Busca estos símbolos UML en las líneas/flechas:
1. Flechas con TRIÁNGULO VACÍO (▷, △) = HERENCIA → usa "relationType": "INHERITANCE"
2. ROMBO LLENO/NEGRO (◆) = COMPOSICIÓN → usa "relationType": "COMPOSITION"
3. ROMBO VACÍO (◇) = AGREGACIÓN → usa "relationType": "AGGREGATION"
4. Solo usa "cardinality": "ONE_TO_MANY" si NO hay símbolos UML

Examina CADA línea cuidadosamente antes de decidir el tipo de relación.`,
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
        
        // Normalizar: si la IA puso un tipo UML en cardinality, moverlo a relationType
        const umlTypes = ["ASSOCIATION", "AGGREGATION", "COMPOSITION", "INHERITANCE", "DEPENDENCY", "REALIZATION"];
        if (action.cardinality && umlTypes.includes(action.cardinality as any)) {
          console.log(`🔧 [AI Normalize] Moving "${action.cardinality}" from cardinality to relationType`);
          action.relationType = action.cardinality as any;
          action.cardinality = undefined;
        }
        
        // Verificar que tenga al menos cardinality o relationType
        if (!action.cardinality && !action.relationType) {
          errors.push(`Action ${index}: CreateRelation must have cardinality or relationType`);
        }
        
        // Normalizamos cardinalidades equivalentes
        if ((action.cardinality as any) === "MANY_TO_ONE") action.cardinality = "ONE_TO_MANY";
        if ((action.cardinality as any) === "TO_ONE") action.cardinality = "ONE_TO_ONE";
        
        // Validar cardinalidad si está presente
        if (action.cardinality && !["ONE_TO_ONE", "ONE_TO_MANY", "MANY_TO_MANY"].includes(action.cardinality)) {
          errors.push(`Action ${index}: Invalid cardinality ${action.cardinality}`);
        }
        
        // Validar relationType si está presente
        const validRelationTypes = ["ASSOCIATION", "AGGREGATION", "COMPOSITION", "INHERITANCE", "DEPENDENCY", "REALIZATION"];
        if (action.relationType && !validRelationTypes.includes(action.relationType)) {
          errors.push(`Action ${index}: Invalid relationType ${action.relationType}`);
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

      case "RenameField":
        if (!action.tableName || action.tableName.trim() === "") {
          errors.push(`Action ${index}: RenameField missing tableName`);
        }
        if (!action.oldFieldName || action.oldFieldName.trim() === "") {
          errors.push(`Action ${index}: RenameField missing oldFieldName`);
        }
        if (!action.newFieldName || action.newFieldName.trim() === "") {
          errors.push(`Action ${index}: RenameField missing newFieldName`);
        }
        break;

      case "DeleteField":
        if (!action.tableName || action.tableName.trim() === "") {
          errors.push(`Action ${index}: DeleteField missing tableName`);
        }
        if (!action.fieldNames || action.fieldNames.length === 0) {
          errors.push(`Action ${index}: DeleteField missing fieldNames`);
        }
        break;

      case "ModifyField":
        if (!action.tableName || action.tableName.trim() === "") {
          errors.push(`Action ${index}: ModifyField missing tableName`);
        }
        if (!action.fieldName || action.fieldName.trim() === "") {
          errors.push(`Action ${index}: ModifyField missing fieldName`);
        }
        if (!action.newType && action.nullable === undefined && action.isPrimary === undefined) {
          errors.push(`Action ${index}: ModifyField has no properties to modify`);
        }
        break;

      case "ModifyRelation":
        if (!action.fromTable || !action.toTable) {
          errors.push(
            `Action ${index}: ModifyRelation missing fromTable or toTable`
          );
        }
        if (!action.relationType && !action.onDelete && !action.onUpdate) {
          errors.push(`Action ${index}: ModifyRelation has no properties to modify`);
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
