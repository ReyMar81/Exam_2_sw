import { Node, Edge } from "reactflow";

interface Field {
  id: string | number;
  name: string;
  type: string;
  isPrimary?: boolean;
  isForeign?: boolean;
  nullable?: boolean;
  references?: string | null;
}

interface TableNodeData {
  name?: string;
  label?: string;
  fields?: Field[];
}

/**
 * Genera un script SQL completo con CREATE TABLE, PRIMARY KEY, FOREIGN KEY
 * y constraints apropiados para PostgreSQL
 */
export function generateSQL(nodes: Node[], edges: Edge[]): string {
  const tableNodes = nodes.filter(n => n.type === 'table' || n.type === 'class');
  
  if (tableNodes.length === 0) {
    return "-- No hay tablas en el diagrama\n";
  }

  let sql = "-- ====================================\n";
  sql += "-- Script SQL generado automáticamente\n";
  sql += `-- Fecha: ${new Date().toLocaleString()}\n`;
  sql += `-- Tablas: ${tableNodes.length} | Relaciones: ${edges.length}\n`;
  sql += "-- Motor: PostgreSQL\n";
  sql += "-- ====================================\n\n";

  // === PASO 1: CREATE TABLE para cada tabla ===
  sql += "-- ====================================\n";
  sql += "-- CREACIÓN DE TABLAS\n";
  sql += "-- ====================================\n\n";

  tableNodes.forEach(node => {
    const data = node.data as TableNodeData;
    const tableName = (data.name || data.label || "tabla_sin_nombre").toLowerCase().replace(/\s+/g, '_');
    const fields = data.fields || [];

    sql += `CREATE TABLE ${tableName} (\n`;
    
    // Agregar columnas
    const columns: string[] = [];
    const primaryKeys: string[] = [];
    const foreignKeys: { field: string; references: string }[] = [];

    fields.forEach((field) => {
      const columnName = field.name.toLowerCase().replace(/\s+/g, '_');
      const columnType = field.type || "VARCHAR(255)";
      
      let columnDef = `  ${columnName} ${columnType}`;
      
      // Agregar NOT NULL si corresponde
      if (!field.nullable || field.isPrimary) {
        columnDef += " NOT NULL";
      }

      columns.push(columnDef);

      // Recolectar PKs
      if (field.isPrimary) {
        primaryKeys.push(columnName);
      }

      // Recolectar FKs
      if (field.isForeign && field.references) {
        foreignKeys.push({
          field: columnName,
          references: field.references.toLowerCase().replace(/\s+/g, '_')
        });
      }
    });

    // Escribir columnas
    sql += columns.join(",\n");

    // Agregar constraint de PRIMARY KEY
    if (primaryKeys.length > 0) {
      sql += `,\n  PRIMARY KEY (${primaryKeys.join(", ")})`;
    }

    // Agregar constraints de FOREIGN KEY
    foreignKeys.forEach(fk => {
      sql += `,\n  FOREIGN KEY (${fk.field}) REFERENCES ${fk.references}(id) ON DELETE CASCADE`;
    });

    sql += "\n);\n\n";
  });

  // === PASO 2: Relaciones basadas en edges (opcional, para relaciones adicionales) ===
  if (edges.length > 0) {
    sql += "-- ====================================\n";
    sql += "-- RELACIONES ADICIONALES (N-N)\n";
    sql += "-- ====================================\n\n";

    const processedEdges = new Set<string>();

    edges.forEach((edge, index) => {
      const sourceNode = tableNodes.find(n => n.id === edge.source);
      const targetNode = tableNodes.find(n => n.id === edge.target);

      if (!sourceNode || !targetNode) return;

      const sourceTable = ((sourceNode.data as TableNodeData).name || 
                          (sourceNode.data as TableNodeData).label || 
                          "tabla_origen").toLowerCase().replace(/\s+/g, '_');
      const targetTable = ((targetNode.data as TableNodeData).name || 
                          (targetNode.data as TableNodeData).label || 
                          "tabla_destino").toLowerCase().replace(/\s+/g, '_');
      
      // Detectar tipo de relación desde el label del edge
      const relationType = (edge.label as string || "1-N").toUpperCase();
      
      // Evitar duplicados
      const edgeKey = `${sourceTable}-${targetTable}-${relationType}`;
      if (processedEdges.has(edgeKey)) return;
      processedEdges.add(edgeKey);

      sql += `-- Relación ${index + 1}: ${sourceTable} → ${targetTable} (${relationType})\n`;

      if (relationType.includes("N-N") || relationType.includes("N:N") || relationType.includes("MANY-TO-MANY")) {
        // Relación N-N: crear tabla intermedia
        const junctionTable = `${sourceTable}_${targetTable}`;
        sql += `CREATE TABLE IF NOT EXISTS ${junctionTable} (\n`;
        sql += `  id SERIAL PRIMARY KEY,\n`;
        sql += `  ${sourceTable}_id INT NOT NULL,\n`;
        sql += `  ${targetTable}_id INT NOT NULL,\n`;
        sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n`;
        sql += `  FOREIGN KEY (${sourceTable}_id) REFERENCES ${sourceTable}(id) ON DELETE CASCADE,\n`;
        sql += `  FOREIGN KEY (${targetTable}_id) REFERENCES ${targetTable}(id) ON DELETE CASCADE,\n`;
        sql += `  UNIQUE (${sourceTable}_id, ${targetTable}_id)\n`;
        sql += `);\n\n`;
        
        sql += `CREATE INDEX idx_${junctionTable}_${sourceTable} ON ${junctionTable}(${sourceTable}_id);\n`;
        sql += `CREATE INDEX idx_${junctionTable}_${targetTable} ON ${junctionTable}(${targetTable}_id);\n\n`;
      }
      // Las relaciones 1-1 y 1-N ya se manejan con los campos FK marcados en los nodos
    });
  }

  sql += "-- ====================================\n";
  sql += "-- FIN DEL SCRIPT\n";
  sql += "-- ====================================\n";
  sql += "\n-- Para ejecutar este script en PostgreSQL:\n";
  sql += "-- psql -U usuario -d nombre_base_datos -f archivo.sql\n";

  return sql;
}

/**
 * Descarga el SQL generado como archivo .sql
 */
export function downloadSQL(sql: string, fileName = "diagrama.sql"): void {
  const blob = new Blob([sql], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

