/**
 * Mapeo bidireccional entre tipos SQL y tipos UML 2.5
 * Para visualización: SQL → UML en modo UML puro
 * Para persistencia: Se mantienen tipos SQL internamente
 */

export const SQL_TO_UML_TYPE_MAP: Record<string, string> = {
  // Enteros
  "INT": "Integer",
  "INTEGER": "Integer",
  "SERIAL": "Integer",
  "BIGINT": "Long",
  "BIGSERIAL": "Long",
  "SMALLINT": "Integer",
  
  // Cadenas
  "VARCHAR": "String",
  "VARCHAR(50)": "String",
  "VARCHAR(100)": "String",
  "VARCHAR(150)": "String",
  "VARCHAR(200)": "String",
  "VARCHAR(255)": "String",
  "CHAR": "String",
  "TEXT": "String",
  
  // Booleanos
  "BOOLEAN": "Boolean",
  "BOOL": "Boolean",
  
  // Decimales
  "DECIMAL": "Float",
  "DECIMAL(10,2)": "Float",
  "NUMERIC": "Float",
  "FLOAT": "Float",
  "DOUBLE": "Double",
  "REAL": "Float",
  
  // Fechas
  "DATE": "Date",
  "TIMESTAMP": "DateTime",
  "TIME": "Time",
  "DATETIME": "DateTime",
  
  // Otros
  "UUID": "String",
  "JSON": "Object",
  "JSONB": "Object",
};

/**
 * Convierte un tipo SQL a su equivalente UML 2.5
 */
export function sqlToUmlType(sqlType: string): string {
  const upperType = sqlType.toUpperCase().trim();
  
  // Buscar coincidencia exacta primero
  if (SQL_TO_UML_TYPE_MAP[upperType]) {
    return SQL_TO_UML_TYPE_MAP[upperType];
  }
  
  // Buscar por prefijo (VARCHAR(N) -> String)
  for (const [sqlPattern, umlType] of Object.entries(SQL_TO_UML_TYPE_MAP)) {
    if (upperType.startsWith(sqlPattern)) {
      return umlType;
    }
  }
  
  // Si no hay mapeo, retornar tal cual (o String por defecto)
  return "String";
}

/**
 * Verifica si un campo es una FK por su estructura
 */
export function isForeignKeyField(field: any): boolean {
  // Caso 1: Marcado explícitamente como FK
  if (field.isForeign === true) {
    return true;
  }
  
  // Caso 2: Tiene referencias configuradas
  if (field.references && field.referencesField) {
    return true;
  }
  
  // Caso 3: Termina en _id y no es la PK
  if (field.name.toLowerCase().endsWith('_id') && !field.isPrimary) {
    return true;
  }
  
  return false;
}
