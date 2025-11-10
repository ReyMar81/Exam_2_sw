import type { Field } from "@shared/types";

/**
 * Clasificación de tablas según su propósito en el diagrama ER
 */
export type TableKind = 'ENTITY' | 'JOIN_PURE' | 'JOIN_ENRICHED';

/**
 * Metadata básica de una tabla para clasificación
 */
export interface TableClassification {
  kind: TableKind;
  foreignKeys: Field[];
  nonForeignFields: Field[];
  primaryKey: Field | null;
}

/**
 * Clasifica una tabla según su estructura:
 * 
 * - ENTITY: Tabla normal con datos propios
 * - JOIN_PURE: Tabla intermedia N-M con SOLO 2 FKs (sin columnas adicionales)
 * - JOIN_ENRICHED: Tabla intermedia N-M con 2 FKs + columnas adicionales
 * 
 * Esta lógica es coherente con:
 * - sqlGenerator.ts: usa PK compuesta para JOIN_PURE
 * - springBootGenerator.ts: usa @ManyToMany para JOIN_PURE, Entity para JOIN_ENRICHED
 * 
 * @param fields - Array de campos de la tabla
 * @returns Clasificación de la tabla
 */
export function classifyTable(fields: Field[]): TableClassification {
  const foreignKeys = fields.filter(f => f.isForeign);
  const primaryKey = fields.find(f => f.isPrimary) || null;
  
  // Campos que no son FK ni PK (columnas de datos propios)
  const nonForeignFields = fields.filter(f => !f.isForeign && !f.isPrimary);
  
  // Detectar timestamps opcionales (no cuentan como campos adicionales significativos)
  const hasOnlyTimestamps = nonForeignFields.every(f => 
    f.name.toLowerCase().includes('created') || 
    f.name.toLowerCase().includes('updated') ||
    f.name.toLowerCase().includes('timestamp')
  );
  
  // JOIN_PURE: exactamente 2 FKs y sin columnas adicionales (o solo timestamps)
  if (foreignKeys.length === 2 && (nonForeignFields.length === 0 || hasOnlyTimestamps)) {
    return {
      kind: 'JOIN_PURE',
      foreignKeys,
      nonForeignFields,
      primaryKey
    };
  }
  
  // JOIN_ENRICHED: 2+ FKs con columnas adicionales significativas
  if (foreignKeys.length >= 2 && nonForeignFields.length > 0 && !hasOnlyTimestamps) {
    return {
      kind: 'JOIN_ENRICHED',
      foreignKeys,
      nonForeignFields,
      primaryKey
    };
  }
  
  // ENTITY: tabla normal (puede tener 0, 1, o más FKs)
  return {
    kind: 'ENTITY',
    foreignKeys,
    nonForeignFields,
    primaryKey
  };
}

/**
 * Valida si una tabla debe generar CRUD completo
 * 
 * - ENTITY: SÍ (tabla normal)
 * - JOIN_ENRICHED: SÍ (tabla intermedia con datos propios)
 * - JOIN_PURE: NO (solo relación, sin entidad propia)
 */
export function shouldGenerateCRUD(kind: TableKind): boolean {
  return kind === 'ENTITY' || kind === 'JOIN_ENRICHED';
}

/**
 * Determina si una tabla necesita manejo de clave compuesta
 * (para JOIN_ENRICHED sin id simple)
 */
export function needsCompositeKey(classification: TableClassification): boolean {
  return classification.kind === 'JOIN_ENRICHED' && 
         classification.primaryKey === null &&
         classification.foreignKeys.length >= 2;
}
