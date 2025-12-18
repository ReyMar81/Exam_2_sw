import { Node, Edge } from "reactflow";
import type { Field, TableData } from "@shared/types";

/**
 * Genera un script SQL completo con CREATE TABLE, PRIMARY KEY, FOREIGN KEY
 * y constraints apropiados para PostgreSQL
 */
export function generateSQL(nodes: Node[], edges: Edge[]): string {
  const tableNodes = nodes.filter(n => n.type === 'table');
  
  if (tableNodes.length === 0) {
    return "-- No hay tablas en el diagrama\n";
  }

  let sql = `-- PostgreSQL Script | ${new Date().toLocaleString()}\n`;
  sql += `-- Tablas: ${tableNodes.length} | Relaciones: ${edges.length}\n\n`;

  // === PASO 1: ORDENAMIENTO DE TABLAS POR DEPENDENCIAS ===

  // Función auxiliar para generar el SQL de una tabla
  const generateTableSQL = (node: Node): { 
    tableName: string; 
    sql: string; 
    foreignKeys: Array<{
      field: string;
      references: string;
      referencesField?: string;
      onDelete?: string;
      onUpdate?: string;
      relationType?: string;
    }>;
    hasFK: boolean;
  } => {
    const data = node.data as TableData;
    const tableName = (data.name || data.label || "tabla_sin_nombre").toLowerCase().replace(/\s+/g, '_');
    const fields = data.fields || [];

    let tableSql = `CREATE TABLE ${tableName} (\n`;
    
    const columns: string[] = [];
    const primaryKeys: string[] = [];
    const foreignKeys: Array<{
      field: string;
      references: string;
      referencesField?: string;
      onDelete?: string;
      onUpdate?: string;
      relationType?: string;
    }> = [];
    const referencedTables: string[] = [];

    // Detectar si es join table pura (solo 2 FKs, sin columnas adicionales)
    const foreignKeyFields = fields.filter(f => f.isForeign);
    const nonFkNonPkFields = fields.filter(f => !f.isForeign && !f.isPrimary);
    const isPureJoinTable = foreignKeyFields.length === 2 && nonFkNonPkFields.length === 0;

    fields.forEach((field) => {
      const columnName = field.name.toLowerCase().replace(/\s+/g, '_');
      const columnType = field.type || "VARCHAR(255)";
      
      let columnDef = `  ${columnName} ${columnType}`;
      
      if (!field.nullable || field.isPrimary) {
        columnDef += " NOT NULL";
      }

      columns.push(columnDef);

      // Si es join pura, NO agregar id como PK (usaremos PK compuesta)
      if (field.isPrimary && !isPureJoinTable) {
        primaryKeys.push(columnName);
      }

      if (field.isForeign && field.references) {
        const refTable = field.references.toLowerCase().replace(/\s+/g, '_');
        const refField = field.referencesField || 'id';
        foreignKeys.push({
          field: columnName,
          references: refTable,
          referencesField: refField,
          onDelete: field.onDelete || "CASCADE",
          onUpdate: field.onUpdate || "CASCADE",
          relationType: field.relationType
        });
        referencedTables.push(refTable);
      }
    });

    tableSql += columns.join(",\n");

    // PRIMARY KEY: compuesta para joins puras, normal para el resto
    if (isPureJoinTable && foreignKeys.length === 2) {
      // Join pura: PK compuesta de las 2 FKs
      tableSql += `,\n  PRIMARY KEY (${foreignKeys[0].field}, ${foreignKeys[1].field})`;
    } else if (primaryKeys.length > 0) {
      // Tabla normal: PK estándar
      tableSql += `,\n  PRIMARY KEY (${primaryKeys.join(", ")})`;
    }

    foreignKeys.forEach(fk => {
      const onDelete = fk.onDelete || "CASCADE";
      const onUpdate = fk.onUpdate || "CASCADE";
      const refField = fk.referencesField || 'id';
      
      // Comentario UML si existe
      const comment = fk.relationType && !["1-1", "1-N", "N-N", "FK"].includes(fk.relationType)
        ? ` -- ${fk.relationType}`
        : '';
      
      tableSql += `,\n  FOREIGN KEY (${fk.field}) REFERENCES ${fk.references}(${refField}) ON DELETE ${onDelete} ON UPDATE ${onUpdate}${comment}`;
    });

    tableSql += "\n);\n\n";

    return {
      tableName,
      sql: tableSql,
      foreignKeys: foreignKeys.map(fk => fk.references), // Solo los nombres de las tablas referenciadas
      hasFK: referencedTables.length > 0
    };
  };

  // Preparar metadata de todas las tablas
  const tablesInfo = tableNodes.map(node => ({
    node,
    ...generateTableSQL(node)
  }));

  // Separar tablas: sin FK (base) vs con FK (dependientes)
  const tablasBase: typeof tablesInfo = [];
  const pendientes: typeof tablesInfo = [];

  tablesInfo.forEach(table => {
    if (!table.hasFK) {
      // ✅ Tabla sin llaves foráneas: se crea inmediatamente
      tablasBase.push(table);
    } else {
      // ⏳ Tabla con llaves foráneas: se guarda para procesar después
      pendientes.push(table);
    }
  });

  sql += `-- Base: ${tablasBase.length} | Dependientes: ${pendientes.length}\n\n`;

  // === PASO 1.1: Crear tablas base (sin FK) ===
  if (tablasBase.length > 0) {
    tablasBase.forEach(table => {
      sql += `-- ${table.tableName}\n`;
      sql += table.sql;
    });
  }

  // === PASO 1.2: Resolver tablas con dependencias ===
  if (pendientes.length > 0) {
    const createdTables = new Set<string>(tablasBase.map(t => t.tableName));
    const remainingTables = [...pendientes];
    let iteration = 0;
    const maxIterations = pendientes.length * 2; // Prevenir loops infinitos

    // Algoritmo de resolución iterativa de dependencias
    while (remainingTables.length > 0 && iteration < maxIterations) {
      iteration++;
      let progressMade = false;

      // Intentar crear tablas cuyas dependencias ya están satisfechas
      for (let i = remainingTables.length - 1; i >= 0; i--) {
        const table = remainingTables[i];
        
        // Verificar si todas las tablas referenciadas ya fueron creadas
        const allDependenciesMet = table.foreignKeys.every(refTable => 
          createdTables.has(refTable)
        );

        if (allDependenciesMet) {
          // ✅ Dependencias satisfechas: crear esta tabla
          sql += `-- ${table.tableName} → ${table.foreignKeys.join(", ")}\n`;
          sql += table.sql;
          
          createdTables.add(table.tableName);
          remainingTables.splice(i, 1);
          progressMade = true;
        }
      }

      // Si no se pudo crear ninguna tabla en esta iteración, hay dependencias circulares
      if (!progressMade) {
        break;
      }
    }

    // === PASO 1.3: Manejar dependencias circulares o sin resolver ===
    if (remainingTables.length > 0) {
      sql += "\n-- ⚠️ DEPENDENCIAS NO RESUELTAS (circulares o referencias faltantes)\n";
      sql += "-- Solución: Crear sin FKs y agregar después con ALTER TABLE\n\n";

      remainingTables.forEach(table => {
        const missingDeps = table.foreignKeys.filter(ref => !createdTables.has(ref));
        sql += `-- ❌ ${table.tableName} → requiere: ${missingDeps.join(", ")}\n`;
        sql += `${table.sql.split('\n').map(line => '-- ' + line).join('\n')}\n`;
      });
    }
  }

  // === PASO 2: Relaciones basadas en edges (opcional, para relaciones adicionales) ===
  if (edges.length > 0) {
    const processedEdges = new Set<string>();

    edges.forEach((edge, index) => {
      const sourceNode = tableNodes.find(n => n.id === edge.source);
      const targetNode = tableNodes.find(n => n.id === edge.target);

      if (!sourceNode || !targetNode) return;

      const sourceTable = ((sourceNode.data as TableData).name || 
                          (sourceNode.data as TableData).label || 
                          "tabla_origen").toLowerCase().replace(/\s+/g, '_');
      const targetTable = ((targetNode.data as TableData).name || 
                          (targetNode.data as TableData).label || 
                          "tabla_destino").toLowerCase().replace(/\s+/g, '_');
      
      // Detectar tipo de relación desde el label del edge
      const relationType = (edge.label as string || "1-N").toUpperCase();
      
      // Evitar duplicados
      const edgeKey = `${sourceTable}-${targetTable}-${relationType}`;
      if (processedEdges.has(edgeKey)) return;
      processedEdges.add(edgeKey);

      if (relationType.includes("N-N") || relationType.includes("N:N") || relationType.includes("MANY-TO-MANY")) {
        const junctionTable = `${sourceTable}_${targetTable}`;
        sql += `\n-- N-N: ${sourceTable} ↔ ${targetTable}\n`;
        sql += `CREATE TABLE IF NOT EXISTS ${junctionTable} (\n`;
        sql += `  ${sourceTable}_id INT NOT NULL,\n`;
        sql += `  ${targetTable}_id INT NOT NULL,\n`;
        sql += `  PRIMARY KEY (${sourceTable}_id, ${targetTable}_id),\n`;
        sql += `  FOREIGN KEY (${sourceTable}_id) REFERENCES ${sourceTable}(id) ON DELETE CASCADE,\n`;
        sql += `  FOREIGN KEY (${targetTable}_id) REFERENCES ${targetTable}(id) ON DELETE CASCADE\n`;
        sql += `);\n\n`;
        
        sql += `CREATE INDEX idx_${junctionTable}_${sourceTable} ON ${junctionTable}(${sourceTable}_id);\n`;
        sql += `CREATE INDEX idx_${junctionTable}_${targetTable} ON ${junctionTable}(${targetTable}_id);\n`;
      }
    });
  }

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

