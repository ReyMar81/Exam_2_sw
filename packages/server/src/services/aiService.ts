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
  isForeign?: boolean;
  references?: string;
  referencesField?: string;
  relationType?: "ASSOCIATION" | "AGGREGATION" | "COMPOSITION" | "INHERITANCE" | "DEPENDENCY" | "REALIZATION";
  onDelete?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
  onUpdate?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
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
   - Tipos SQL comunes: INT, SERIAL, VARCHAR(n), TEXT, BOOLEAN, DATE, TIMESTAMP, TIMESTAMPTZ, DECIMAL(p,s), BIGINT, BIGSERIAL, NUMERIC, JSON, JSONB, UUID
   - ⚠️ CRÍTICO: Las claves foráneas (campos que terminan en _id) SIEMPRE deben ser tipo INT, NUNCA SERIAL
   - ⚠️ CRÍTICO: Solo el campo "id" principal (PK) debe ser SERIAL con isPrimary: true
   - ⚠️ Si un campo tiene "isForeign": true, su tipo DEBE ser "INT" obligatoriamente
   - Propiedades opcionales de campos:
     * "nullable": true/false (por defecto true, excepto si es PK que es false)
     * "isPrimary": true/false (marca campo como llave primaria)
     * "isForeign": true/false (marca campo como llave foránea)
     * "references": "nombre_tabla" (solo si isForeign es true)
     * "referencesField": "nombre_campo" (campo PK específico de la tabla referenciada, ej: "id", "codigo", "dni")
     * "relationType": tipo de relación UML (solo si isForeign es true)
     * "onDelete": "CASCADE"/"SET NULL"/"RESTRICT"/"NO ACTION"
     * "onUpdate": "CASCADE"/"SET NULL"/"RESTRICT"/"NO ACTION"

2. CreateRelation: Crear relación entre dos tablas existentes
   - IMPORTANTE: Usa "relationType" para tipos UML 2.5, NO uses "cardinality" para ellos
   - Campo "cardinality": Solo para cardinalidades clásicas ("ONE_TO_ONE", "ONE_TO_MANY", "MANY_TO_MANY")
   - Campo "relationType": Para tipos UML 2.5 ("ASSOCIATION", "AGGREGATION", "COMPOSITION", "INHERITANCE", "DEPENDENCY", "REALIZATION")
   - Propiedades CASCADE: "onDelete" y "onUpdate" (valores: "CASCADE", "SET NULL", "RESTRICT", "NO ACTION")
   
   ⚠️ REGLA CRÍTICA PARA HERENCIA:
   Si el usuario dice "hereda", "extiende", "es un/una", "herencia", "tipo de", "especialización":
   → SIEMPRE crear CreateRelation con "relationType": "INHERITANCE"
   → fromTable = tabla hija/subclase (la que hereda)
   → toTable = tabla padre/superclase (de quien hereda)
   
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
- producto (id, nombre, precio, stock_minimo)
- inventario (id, cantidad, fecha_actualizacion)
- movimiento (id, tipo, cantidad, fecha, usuario)
Relaciones: categoria 1:N producto, producto 1:N inventario, sucursal 1:N inventario, producto 1:N movimiento

🏥 Sistema de Gestión Hospitalaria:
- paciente (id, nombre, fecha_nacimiento, telefono, email)
- medico (id, nombre, especialidad, telefono)
- cita (id, fecha_hora, motivo, estado)
- historial_medico (id, fecha, diagnostico, tratamiento)
- medicamento (id, nombre, descripcion, precio)
- receta (id, dosis, duracion_dias)
Relaciones: paciente 1:N cita, medico 1:N cita, paciente 1:N historial_medico, cita 1:N receta, medicamento 1:N receta

🎓 Sistema de Gestión Académica:
- estudiante (id, nombre, email, fecha_ingreso, carrera)
- profesor (id, nombre, especialidad, email)
- curso (id, nombre, codigo, creditos)
- inscripcion (id, semestre, nota_final)
- asistencia (id, fecha, presente)
Relaciones: profesor 1:N curso, estudiante N:N curso (genera inscripcion), inscripcion 1:N asistencia

🏪 Sistema de Ventas:
- cliente (id, nombre, email, telefono, direccion)
- categoria (id, nombre, descripcion)
- producto (id, nombre, precio, stock)
- venta (id, fecha, total, estado)
- detalle_venta (id, cantidad, precio_unitario)
Relaciones: cliente 1:N venta, venta 1:N detalle_venta, producto 1:N detalle_venta, categoria 1:N producto

REGLAS PARA DIAGRAMAS COMPLETOS:
1. Siempre incluye campos de auditoría (created_at, updated_at) cuando sea apropiado
2. Usa campos de estado (estado, activo, habilitado) para soft-deletes
3. Incluye al menos 2 relaciones ONE_TO_MANY
4. Si tiene sentido, agrega 1 relación MANY_TO_MANY
5. Todos los nombres en snake_case y en minúsculas
6. ⚠️ CRÍTICO: NO incluyas campos FK (_id) en CreateTable, usa SOLO CreateRelation
7. IDs como SERIAL y PKs solamente (sin FKs en CreateTable)
8. Campos de texto corto VARCHAR(100-255), texto largo TEXT
9. Precios y cantidades como DECIMAL(10,2)
10. Fechas como DATE, timestamps como TIMESTAMP

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
  
RECONOCIMIENTO DE PATRONES PARA RELACIONES UML:
  * Palabras clave para HERENCIA: "hereda", "hereda de", "extiende", "es un", "es una", "herencia", "generalización", "subclase", "superclase", "relación de herencia", "usando herencia", "tipo de", "especialización"
  * Palabras clave para COMPOSICIÓN: "composición", "parte de", "contiene", "compuesto por", "no existe sin", "eliminar en cascada"
  * Palabras clave para AGREGACIÓN: "agregación", "tiene", "incluye", "agregado de", "puede existir sin", "opcional"
  * Palabras clave para ASOCIACIÓN: "asociación", "asocia", "relaciona", "vincula", "conecta"
  * Palabras clave para DEPENDENCIA: "dependencia", "depende de", "usa", "utiliza"
  * Palabras clave para REALIZACIÓN: "realización", "implementa", "realiza", "interfaz"
- Si el usuario dice "1 a N", "1:N", "uno a muchos" → ONE_TO_MANY
- Si el usuario dice "N a M", "N:M", "muchos a muchos" → MANY_TO_MANY
- Si el usuario dice "1 a 1", "1:1", "uno a uno" → ONE_TO_ONE
- Si el usuario menciona "en cascada", "eliminar hijos", "parte de" → COMPOSITION con CASCADE
- Si el usuario menciona "opcional", "independiente", "agregado" → AGGREGATION con SET NULL

🎯 EJEMPLOS ESPECÍFICOS DE RELACIONES UML 2.5:

Entrada: "Crea una herencia de empleado a persona"
Salida:
{
  "actions": [{
    "type": "CreateRelation",
    "fromTable": "empleado",
    "toTable": "persona",
    "relationType": "INHERITANCE"
  }]
}

Entrada: "Empleado hereda de persona"
Salida:
{
  "actions": [{
    "type": "CreateRelation",
    "fromTable": "empleado",
    "toTable": "persona",
    "relationType": "INHERITANCE"
  }]
}

Entrada: "Gerente es un empleado"
Salida:
{
  "actions": [{
    "type": "CreateRelation",
    "fromTable": "gerente",
    "toTable": "empleado",
    "relationType": "INHERITANCE"
  }]
}

Entrada: "Estudiante extiende persona"
Salida:
{
  "actions": [{
    "type": "CreateRelation",
    "fromTable": "estudiante",
    "toTable": "persona",
    "relationType": "INHERITANCE"
  }]
}

Entrada: "Crea relación de herencia entre cliente_premium y cliente"
Salida:
{
  "actions": [{
    "type": "CreateRelation",
    "fromTable": "cliente_premium",
    "toTable": "cliente",
    "relationType": "INHERITANCE"
  }]
}

Entrada: "Relaciona auto con vehiculo usando herencia"
Salida:
{
  "actions": [{
    "type": "CreateRelation",
    "fromTable": "auto",
    "toTable": "vehiculo",
    "relationType": "INHERITANCE"
  }]
}

Entrada: "Habitación tiene composición con casa"
Salida:
{
  "actions": [{
    "type": "CreateRelation",
    "fromTable": "habitacion",
    "toTable": "casa",
    "relationType": "COMPOSITION",
    "onDelete": "CASCADE",
    "onUpdate": "CASCADE"
  }]
}

Entrada: "Profesor tiene agregación con departamento"
Salida:
{
  "actions": [{
    "type": "CreateRelation",
    "fromTable": "profesor",
    "toTable": "departamento",
    "relationType": "AGGREGATION",
    "onDelete": "SET NULL",
    "onUpdate": "NO ACTION"
  }]
}

Entrada: "Asociación entre pedido y cliente"
Salida:
{
  "actions": [{
    "type": "CreateRelation",
    "fromTable": "pedido",
    "toTable": "cliente",
    "relationType": "ASSOCIATION",
    "onDelete": "RESTRICT",
    "onUpdate": "NO ACTION"
  }]
}

Entrada: "Crea dependencia de factura hacia configuracion"
Salida:
{
  "actions": [{
    "type": "CreateRelation",
    "fromTable": "factura",
    "toTable": "configuracion",
    "relationType": "DEPENDENCY"
  }]
}

Entrada: "Realización de interfaz_pago por clase tarjeta"
Salida:
{
  "actions": [{
    "type": "CreateRelation",
    "fromTable": "tarjeta",
    "toTable": "interfaz_pago",
    "relationType": "REALIZATION"
  }]
}

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
      { "name": "id", "type": "SERIAL", "isPrimary": true, "nullable": false },
      { "name": "nombre", "type": "VARCHAR(100)", "nullable": false },
      { "name": "edad", "type": "INT", "nullable": true }
    ]
  }]
}

Entrada: "Crea tabla producto con id, nombre requerido, descripcion opcional, precio no nullable"
Salida:
{
  "actions": [{
    "type": "CreateTable",
    "name": "producto",
    "fields": [
      { "name": "id", "type": "SERIAL", "isPrimary": true, "nullable": false },
      { "name": "nombre", "type": "VARCHAR(150)", "nullable": false },
      { "name": "descripcion", "type": "TEXT", "nullable": true },
      { "name": "precio", "type": "DECIMAL(10,2)", "nullable": false }
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
        { "name": "stock_minimo", "type": "INT" }
      ]
    },
    {
      "type": "CreateTable",
      "name": "inventario",
      "fields": [
        { "name": "id", "type": "SERIAL", "isPrimary": true },
        { "name": "cantidad", "type": "INT" },
        { "name": "fecha_actualizacion", "type": "TIMESTAMP" }
      ]
    },
    {
      "type": "CreateTable",
      "name": "movimiento",
      "fields": [
        { "name": "id", "type": "SERIAL", "isPrimary": true },
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
        { "name": "cantidad", "type": "INT" },
        { "name": "precio_unitario", "type": "DECIMAL(10,2)" }
      ]
    },
    { "type": "CreateRelation", "fromTable": "cliente", "toTable": "venta", "cardinality": "ONE_TO_MANY" },
    { "type": "CreateRelation", "fromTable": "venta", "toTable": "detalle_venta", "cardinality": "ONE_TO_MANY" },
    { "type": "CreateRelation", "fromTable": "producto", "toTable": "detalle_venta", "cardinality": "ONE_TO_MANY" }
  ]
}

⚠️ IMPORTANTE SOBRE TIPOS (CRÍTICO):
- ✅ Solo el campo "id" (PK principal) debe ser SERIAL con isPrimary: true
- ✅ TODAS las FKs (usuario_id, libro_id, categoria_id, profesor_id, etc.) SIEMPRE deben ser INT
- ❌ NUNCA uses SERIAL para campos que no sean la PK principal
- ❌ SERIAL en FKs genera errores SQL graves

Ejemplos CORRECTOS de FKs:
  { "name": "profesor_id", "type": "INT", "isForeign": true }  ✅
  { "name": "estudiante_id", "type": "INT", "isForeign": true }  ✅
  { "name": "curso_id", "type": "INT", "isForeign": true }  ✅

Ejemplos INCORRECTOS (NO HACER):
  { "name": "profesor_id", "type": "SERIAL", "isForeign": true }  ❌
  { "name": "estudiante_id", "type": "SERIAL" }  ❌

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

Entrada: "Agrega campo email nullable y activo no nullable a usuario"
Salida:
{
  "actions": [{
    "type": "AddField",
    "tableName": "usuario",
    "fields": [
      { "name": "email", "type": "VARCHAR(100)", "nullable": true },
      { "name": "activo", "type": "BOOLEAN", "nullable": false }
    ]
  }]
}

Entrada: "Crea FK empresa_id en empleado que referencia al campo codigo de empresa"
Salida:
{
  "actions": [{
    "type": "AddField",
    "tableName": "empleado",
    "field": {
      "name": "empresa_id",
      "type": "INT",
      "isForeign": true,
      "references": "empresa",
      "referencesField": "codigo",
      "relationType": "ASSOCIATION",
      "onDelete": "CASCADE"
    }
  }]
}

Entrada: "Marca el campo email de usuario como nullable"
Salida:
{
  "actions": [{
    "type": "ModifyField",
    "tableName": "usuario",
    "fieldName": "email",
    "nullable": true
  }]
}

Entrada: "Cambia el tipo de precio a DECIMAL(12,2) y hazlo no nullable"
Salida:
{
  "actions": [{
    "type": "ModifyField",
    "tableName": "producto",
    "fieldName": "precio",
    "newType": "DECIMAL(12,2)",
    "nullable": false
  }]
}

Entrada: "Cambia la relación entre orden y cliente a COMPOSITION con CASCADE"
Salida:
{
  "actions": [{
    "type": "ModifyRelation",
    "fromTable": "cliente",
    "toTable": "orden",
    "relationType": "COMPOSITION",
    "onDelete": "CASCADE",
    "onUpdate": "CASCADE"
  }]
}

Entrada: "Elimina los campos temporal y antiguo_id de usuario"
Salida:
{
  "actions": [{
    "type": "DeleteField",
    "tableName": "usuario",
    "fieldNames": ["temporal", "antiguo_id"]
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
 * 🛡️ Sanitiza y corrige errores comunes en las respuestas de la IA
 * - Corrige FKs con tipo SERIAL -> INT
 * - Detecta campos FK por nombre (_id) y tipo SERIAL
 * - Valida campos obligatorios
 */
function sanitizeAIActions(actions: AIAction[]): AIAction[] {
  return actions.map((action) => {
    if (action.type === "CreateTable") {
      return {
        ...action,
        fields: action.fields.map((field: AIField) => {
          const fieldName = field.name.toLowerCase();
          const isLikelyFK = fieldName.endsWith('_id') && fieldName !== 'id';
          const hasSerialType = field.type.toUpperCase().includes("SERIAL");
          
          // 🔧 Caso 1: Campo marcado explícitamente como FK con tipo SERIAL
          if (field.isForeign && hasSerialType) {
            console.warn(
              `⚠️ [Sanitizer] Correcting FK type from ${field.type} to INT for field: ${field.name}`
            );
            return { ...field, type: "INT" };
          }
          
          // 🔧 Caso 2: Campo que parece FK por nombre (termina en _id) con tipo SERIAL
          if (isLikelyFK && hasSerialType) {
            console.warn(
              `⚠️ [Sanitizer] Detected FK-like field with SERIAL type, correcting to INT: ${field.name}`
            );
            return { ...field, type: "INT" };
          }
          
          return field;
        }),
      };
    }

    if (action.type === "AddField") {
      const field = action.field;
      const fields = action.fields;

      // Sanitizar field único
      if (field) {
        const fieldName = field.name?.toLowerCase() || '';
        const isLikelyFK = fieldName.endsWith('_id') && fieldName !== 'id';
        const hasSerialType = field.type?.toUpperCase().includes("SERIAL");
        
        if ((field.isForeign || isLikelyFK) && hasSerialType) {
          console.warn(
            `⚠️ [Sanitizer] Correcting FK type from ${field.type} to INT for field: ${field.name}`
          );
          return {
            ...action,
            field: { ...field, type: "INT" },
          };
        }
      }

      // Sanitizar múltiples fields
      if (fields && Array.isArray(fields)) {
        return {
          ...action,
          fields: fields.map((f: AIField) => {
            const fieldName = f.name?.toLowerCase() || '';
            const isLikelyFK = fieldName.endsWith('_id') && fieldName !== 'id';
            const hasSerialType = f.type?.toUpperCase().includes("SERIAL");
            
            if ((f.isForeign || isLikelyFK) && hasSerialType) {
              console.warn(
                `⚠️ [Sanitizer] Correcting FK type from ${f.type} to INT for field: ${f.name}`
              );
              return { ...f, type: "INT" };
            }
            return f;
          }),
        };
      }
    }

    return action;
  });
}

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

    // 🛡️ Sanitizar acciones para corregir errores comunes de la IA
    const sanitizedActions = sanitizeAIActions(parsed.actions);

    return { actions: sanitizedActions };
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

🎯 OBJETIVO: Recrear el diagrama EXACTAMENTE como aparece en la imagen, sin agregar ni omitir nada.

⚠️ REGLAS CRÍTICAS - LEE ESTO PRIMERO:
1. SOLO crea lo que VES explícitamente en la imagen
2. NO inventes relaciones que no existen visualmente
3. NO agregues campos FK automáticamente si no están en el diagrama
4. Si una línea/flecha no es clara, OMÍTELA (mejor omitir que inventar)
5. Prioriza EXACTITUD sobre completitud

TAREA:
- Identificar TODAS las tablas/entidades visibles
- Extraer TODOS los campos mostrados en cada tabla (solo los visibles)
- Detectar SOLO las relaciones que tienen líneas/flechas visibles
- Identificar el tipo de relación según la notación visual UML 2.5
- Devolver un JSON con acciones estructuradas

FORMATO DE RESPUESTA:
{
  "actions": [
    { "type": "CreateTable", ... },
    { "type": "CreateRelation", ... }
  ]
}

═══════════════════════════════════════════════════════════════
📋 ACCIÓN 1: CreateTable (Crear tabla con campos)
═══════════════════════════════════════════════════════════════

SOLO incluye campos que aparezcan EXPLÍCITAMENTE en la imagen:
- Si ves "id", "ID", "pk" → { "name": "id", "type": "SERIAL", "isPrimary": true }
- Si ves "*_id", "*_fk" → { "name": "..._id", "type": "INT", "isForeign": true }
- Si NO ves un campo "id" en la tabla, NO lo agregues automáticamente

Tipos SQL según lo que veas:
- "nombre", "email", "dirección" → VARCHAR(100)
- "descripción", "comentario" → TEXT
- "edad", "cantidad", "numero" → INT
- "precio", "salario" → DECIMAL(10,2)
- "activo", "habilitado" → BOOLEAN
- "fecha", "fecha_*" → DATE
- "created_at", "updated_at" → TIMESTAMP

Ejemplo CreateTable:
{
  "type": "CreateTable",
  "name": "persona",
  "fields": [
    { "name": "id", "type": "SERIAL", "isPrimary": true },
    { "name": "nombre", "type": "VARCHAR(100)" },
    { "name": "email", "type": "VARCHAR(100)" }
  ]
}

═══════════════════════════════════════════════════════════════
🔗 ACCIÓN 2: CreateRelation (Crear relación entre tablas)
═══════════════════════════════════════════════════════════════

⚠️ PASO 1 - IDENTIFICAR TIPO DE RELACIÓN POR SÍMBOLOS:

🔺 HERENCIA (triángulo vacío):
   Símbolo: ▷, △, ▶ vacío
   → { "relationType": "INHERITANCE", "onDelete": "CASCADE" }
   Dirección: fromTable = hijo (base de flecha), toTable = padre (punta de flecha)
   Ejemplo visual: Empleado ▷ Persona

◆ COMPOSICIÓN (rombo lleno/negro):
   Símbolo: ◆, ♦, rombo pintado
   → { "relationType": "COMPOSITION", "onDelete": "CASCADE" }
   El rombo está en el contenedor (TODO), FK va en la parte (PARTE)
   Ejemplo visual: Libro ◆─ Pagina

◇ AGREGACIÓN (rombo vacío):
   Símbolo: ◇, ◊, rombo sin pintar
   → { "relationType": "AGGREGATION", "onDelete": "SET NULL" }
   Similar a composición pero con dependencia más débil

─ ASOCIACIÓN (línea simple continua):
   Símbolo: Línea recta sin símbolos especiales
   → { "relationType": "ASSOCIATION" }

- - → DEPENDENCIA (línea punteada con flecha):
   Símbolo: Línea discontinua/punteada con flecha normal
   → { "relationType": "DEPENDENCY" }

- - ▷ REALIZACIÓN (línea punteada con flecha triangular):
   Símbolo: Línea discontinua con triángulo vacío
   → { "relationType": "REALIZATION" }

⚠️ PASO 2 - SI NO HAY SÍMBOLOS UML, USAR CARDINALIDAD:

Si la línea muestra "1-N", "1:N", "1 a N":
→ { "cardinality": "ONE_TO_MANY" }
Ejemplo: Autor ─1-N─ Libro

Si la línea muestra "N-M", "M-N", "N a M":
→ { "cardinality": "MANY_TO_MANY" }
Ejemplo: Estudiante ─N-M─ Curso

Si la línea muestra "1-1", "1:1":
→ { "cardinality": "ONE_TO_ONE" }
Ejemplo: Usuario ─1-1─ Perfil

⚠️ PRIORIDAD: Símbolos UML > Cardinalidades numéricas
Si ves ▷ cerca de "1-N", usa INHERITANCE e ignora el "1-N"

⚠️ PASO 3 - DETERMINAR DIRECCIÓN (fromTable → toTable):

Para HERENCIA (▷):
- fromTable = clase hija (donde inicia la flecha)
- toTable = clase padre (donde apunta la flecha)
- Ejemplo: Si Empleado tiene flecha hacia Persona → fromTable: "empleado", toTable: "persona"

Para COMPOSICIÓN/AGREGACIÓN (◆, ◇):
- fromTable = contenedor (donde está el rombo)
- toTable = contenido (lo que está siendo contenido)
- Ejemplo: Si Libro◆ conecta con Pagina → fromTable: "libro", toTable: "pagina"

Para ONE_TO_MANY:
- fromTable = lado "1" (uno)
- toTable = lado "N" (muchos)
- Ejemplo: Si Autor(1)─→Libro(N) → fromTable: "autor", toTable: "libro"

═══════════════════════════════════════════════════════════════
📖 EJEMPLOS COMPLETOS
═══════════════════════════════════════════════════════════════

EJEMPLO 1 - Herencia pura (Empleado hereda de Persona):
Imagen muestra: [Empleado] ▷ [Persona]
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
      "relationType": "INHERITANCE"
    }
  ]
}

EJEMPLO 2 - Relación 1-N clásica:
Imagen muestra: [Autor] ─1-N→ [Libro] con libro_autor_id visible
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

═══════════════════════════════════════════════════════════════
⚠️ RECORDATORIOS FINALES
═══════════════════════════════════════════════════════════════

✅ SÍ hacer:
- Examinar cada línea/flecha con cuidado antes de clasificarla
- Buscar símbolos UML primero (▷, ◆, ◇) antes de cardinalidades
- Solo crear relaciones con líneas visibles claramente
- Usar nombres exactos de las tablas como aparecen (normalizar a minúsculas)
- Copiar solo los campos que aparecen en las cajas/rectángulos

❌ NO hacer:
- NO inventes campos FK si no están dibujados
- NO agregues relaciones que no tienen línea visual
- NO asumas "id" automático si no aparece en la tabla
- NO confundas símbolos: ▷ ≠ ◆ ≠ ◇
- NO uses "cardinality" para relaciones UML (INHERITANCE, COMPOSITION, etc.)

🎯 RESPONDE ÚNICAMENTE CON JSON VÁLIDO EN ESTE FORMATO:
{
  "actions": [...]
}`;

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
      const { fromTable, toTable, cardinality, relationType } = action;
      
      // Relaciones UML con FK físico (NO INHERITANCE, DEPENDENCY, REALIZATION)
      const umlTypesWithFK = ["COMPOSITION", "AGGREGATION", "ASSOCIATION"];
      
      // En relaciones 1-N, la tabla "to" recibe FK de "from"
      if (cardinality === "ONE_TO_MANY") {
        if (!relationFKs.has(toTable.toLowerCase())) {
          relationFKs.set(toTable.toLowerCase(), new Set());
        }
        relationFKs.get(toTable.toLowerCase())!.add(`${fromTable.toLowerCase()}_id`);
      }
      
      // En relaciones UML con FK, la tabla "from" recibe FK de "to"
      if (relationType && umlTypesWithFK.includes(relationType)) {
        if (!relationFKs.has(fromTable.toLowerCase())) {
          relationFKs.set(fromTable.toLowerCase(), new Set());
        }
        relationFKs.get(fromTable.toLowerCase())!.add(`${toTable.toLowerCase()}_id`);
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
