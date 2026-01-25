import { Node, Edge } from "reactflow";
import type { Field } from "@shared/types";

/**
 * Parsea un script SQL y genera nodes y edges para ReactFlow
 * Soporta: PostgreSQL, MySQL, SQLite básico
 */
export function parseSQLToNodes(sqlScript: string): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  // Normalizar SQL: eliminar comentarios
  let normalizedSQL = sqlScript
    .replace(/--[^\n]*/g, '') // Comentarios de línea --
    .replace(/\/\*[\s\S]*?\*\//g, ''); // Comentarios de bloque /* */
  
  // Extraer todas las sentencias CREATE TABLE
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z_][a-z0-9_]*)\s*\(([\s\S]*?)\);/gi;
  let match;
  
  const tables: Map<string, { fields: Field[]; foreignKeys: any[] }> = new Map();
  
  while ((match = createTableRegex.exec(normalizedSQL)) !== null) {
    const tableName = match[1].toLowerCase();
    const tableBody = match[2];
    
    const { fields, foreignKeys } = parseTableBody(tableBody);
    tables.set(tableName, { fields, foreignKeys });
  }
  
  // Generar nodes
  let positionY = 100;
  let positionX = 100;
  const tablesPerRow = 3;
  let tableIndex = 0;
  
  for (const [tableName, { fields }] of tables.entries()) {
    const node: Node = {
      id: `table-${tableName}`,
      type: "table",
      position: { 
        x: positionX + (tableIndex % tablesPerRow) * 350, 
        y: positionY + Math.floor(tableIndex / tablesPerRow) * 300 
      },
      data: {
        name: tableName,
        label: tableName,
        fields: fields
      }
    };
    
    nodes.push(node);
    tableIndex++;
  }
  
  // Generar edges desde foreign keys
  for (const [tableName, { foreignKeys }] of tables.entries()) {
    for (const fk of foreignKeys) {
      const sourceNode = nodes.find(n => n.data.name === tableName);
      const targetNode = nodes.find(n => n.data.name === fk.referencedTable);
      
      if (sourceNode && targetNode) {
        const edge: Edge = {
          id: `edge-${tableName}-${fk.referencedTable}-${Date.now()}`,
          source: sourceNode.id,
          target: targetNode.id,
          type: "smoothstep",
          data: {
            sourceField: fk.referencedField,
            targetField: fk.fieldName,
            relationType: fk.onDelete === 'CASCADE' ? 'COMPOSITION' : 'AGGREGATION'
          }
        };
        
        edges.push(edge);
      }
    }
  }
  
  return { nodes, edges };
}

/**
 * Parsea el cuerpo de una tabla
 */
function parseTableBody(tableBody: string): { 
  fields: Field[]; 
  foreignKeys: any[];
} {
  const fields: Field[] = [];
  const foreignKeys: any[] = [];
  
  const parts = splitByTopLevelComma(tableBody);
  
  for (const part of parts) {
    const trimmed = part.trim();
    
    if (!trimmed) continue;
    
    // PRIMARY KEY constraint
    if (/^PRIMARY\s+KEY\s*\(/i.test(trimmed)) {
      const pkMatch = trimmed.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        const pkFields = pkMatch[1].split(',').map(f => f.trim().replace(/["`]/g, ''));
        pkFields.forEach(pkName => {
          const field = fields.find(f => f.name === pkName);
          if (field) field.isPrimary = true;
        });
      }
      continue;
    }
    
    // FOREIGN KEY constraint
    if (/^FOREIGN\s+KEY\s*\(/i.test(trimmed) || /^CONSTRAINT\s+/i.test(trimmed)) {
      const fkMatch = trimmed.match(/FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([a-z_][a-z0-9_]*)\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+(CASCADE|RESTRICT|SET\s+NULL|NO\s+ACTION))?/i);
      if (fkMatch) {
        const fieldName = fkMatch[1].trim().replace(/["`]/g, '');
        const referencedTable = fkMatch[2].toLowerCase();
        const referencedField = fkMatch[3].trim().replace(/["`]/g, '');
        const onDelete = fkMatch[4] || 'RESTRICT';
        
        foreignKeys.push({
          fieldName,
          referencedTable,
          referencedField,
          onDelete
        });
        
        const field = fields.find(f => f.name === fieldName);
        if (field) {
          field.isForeign = true;
          field.references = referencedTable;
          field.referencesField = referencedField;
        }
      }
      continue;
    }
    
    // Campo normal
    const field = parseFieldDefinition(trimmed);
    if (field) {
      fields.push(field);
    }
  }
  
  return { fields, foreignKeys };
}

/**
 * Parsea una definición de campo
 */
function parseFieldDefinition(definition: string): Field | null {
  const match = definition.match(/^([a-z_][a-z0-9_]*)\s+([A-Z]+(?:\([^)]+\))?)(.*)/i);
  
  if (!match) return null;
  
  const fieldName = match[1].toLowerCase();
  const fieldType = match[2].toUpperCase();
  const constraints = match[3] || '';
  
  const field: Field = {
    name: fieldName,
    type: fieldType,
    nullable: !/NOT\s+NULL/i.test(constraints),
    isPrimary: /PRIMARY\s+KEY/i.test(constraints),
    isUnique: /UNIQUE/i.test(constraints),
    isForeign: false
  };
  
  return field;
}

/**
 * Divide por comas de nivel superior
 */
function splitByTopLevelComma(str: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    
    if (char === '(') {
      depth++;
      current += char;
    } else if (char === ')') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    parts.push(current.trim());
  }
  
  return parts;
}
