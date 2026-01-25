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
    foreignKeys: Array<string>;
    hasFK: boolean;
  } => {
    const data = node.data as TableData;
    const tableName = (data.name || data.label || "tabla_sin_nombre").toLowerCase().replace(/\s+/g, '_');
    
    // 🚫 Filtrar métodos (isMethod = true) ya que no son campos de BD
    const fields = (data.fields || []).filter(f => !f.isMethod);

    // 🔍 Buscar relaciones de HERENCIA donde esta tabla es la hija (source)
    const inheritanceEdges = edges.filter(edge => {
      const sourceNode = tableNodes.find(n => n.id === edge.source);
      const sourceTableName = (sourceNode?.data.name || sourceNode?.data.label || "").toLowerCase().replace(/\s+/g, '_');
      return sourceTableName === tableName && 
             edge.data?.relationType === "INHERITANCE";
    });

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

    // 🆕 Detectar HERENCIA: el PK del hijo ES el FK al padre (mismo campo)
    const hasInheritance = inheritanceEdges.length > 0;
    const referencedTables: string[] = [];

    // Detectar si es join table pura (solo 2 FKs, sin columnas adicionales)
    const foreignKeyFields = fields.filter(f => f.isForeign);
    const nonFkNonPkFields = fields.filter(f => !f.isForeign && !f.isPrimary);
    const isPureJoinTable = foreignKeyFields.length === 2 && nonFkNonPkFields.length === 0;
    
    // UML 2.5: Relaciones puramente conceptuales que NO generan FK física
    // NOTA: INHERITANCE sí genera FK (tabla hija referencia tabla padre)
    const conceptualRelations = ["DEPENDENCY", "REALIZATION"];

    fields.forEach((field) => {
      // UML 2.5: Ignorar FKs de relaciones puramente conceptuales
      // INHERITANCE sí crea FK física (tabla hija → tabla padre)
      if (field.isForeign && field.relationType && conceptualRelations.includes(field.relationType)) {
        return; // DEPENDENCY, REALIZATION no generan columnas en BD
      }
      
      const columnName = field.name.toLowerCase().replace(/\s+/g, '_');
      const columnType = field.type || "VARCHAR(255)";
      
      let columnDef = `  ${columnName} ${columnType}`;
      
      if (!field.nullable || field.isPrimary) {
        columnDef += " NOT NULL";
      }

      columns.push(columnDef);

      // Si es join pura, NO agregar id como PK (usaremos PK compuesta)
      if (field.isPrimary) {
        primaryKeys.push(columnName);
        
        // 🆕 HERENCIA: El PK del hijo ES FK al padre (Strategy Pattern en SQL)
        // En herencia, el hijo siempre referencia al padre por su PK
        if (hasInheritance) {
          inheritanceEdges.forEach(edge => {
            const targetNode = tableNodes.find(n => n.id === edge.target);
            const parentTableName = (targetNode?.data.name || targetNode?.data.label || "").toLowerCase().replace(/\s+/g, '_');
            const parentPK = targetNode?.data.fields?.find((f: Field) => f.isPrimary);
            const parentPKName = (parentPK?.name || 'id').toLowerCase().replace(/\s+/g, '_');
            
            // SIEMPRE crear FK de herencia: PK hijo → PK padre
            // Esto permite que el hijo "sea" el padre (IS-A relationship)
            foreignKeys.push({
              field: columnName,
              references: parentTableName,
              referencesField: parentPKName,
              onDelete: "CASCADE", // Herencia siempre CASCADE
              onUpdate: "CASCADE",
              relationType: "INHERITANCE"
            });
            referencedTables.push(parentTableName);
          });
        }
        
        if (!isPureJoinTable) {
          // Ya se agregó a primaryKeys arriba
        }
      }

      if (field.isForeign && field.references) {
        // UML 2.5: INHERITANCE sí genera FK física en BD
        // Solo DEPENDENCY y REALIZATION son puramente conceptuales
        if (field.relationType && conceptualRelations.includes(field.relationType)) {
          return; // DEPENDENCY, REALIZATION no generan FK en BD
        }
        
        const refTable = field.references.toLowerCase().replace(/\s+/g, '_');
        const refField = field.referencesField || 'id';
        
        // 🎯 Determinar ON DELETE según tipo de relación
        let onDeleteAction = "RESTRICT"; // DEFAULT: No permitir eliminar si hay dependencias
        if (field.relationType === 'COMPOSITION') {
          onDeleteAction = "CASCADE"; // Composición: eliminar hijos automáticamente
        } else if (field.relationType === 'AGGREGATION' || field.relationType === 'ASSOCIATION') {
          onDeleteAction = "RESTRICT"; // Agregación/Asociación: proteger referencias
        }
        
        foreignKeys.push({
          field: columnName,
          references: refTable,
          referencesField: refField,
          onDelete: field.onDelete || onDeleteAction,
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
      
      // 🔍 Buscar el nombre EXACTO de la PK en la tabla referenciada
      const referencedNode = tableNodes.find(n => {
        const nodeName = (n.data.name || n.data.label || "").toLowerCase().replace(/\s+/g, '_');
        return nodeName === fk.references;
      });
      
      let refField = 'id'; // default
      if (referencedNode) {
        // Buscar la PK real en la tabla referenciada
        const pkField = referencedNode.data.fields?.find((f: Field) => f.isPrimary && !f.isMethod);
        if (pkField) {
          // Usar el nombre EXACTO de la columna PK (normalizado a minúsculas)
          refField = pkField.name.toLowerCase().replace(/\s+/g, '_');
        }
      }
      
      // Si había un referencesField específico, usarlo (normalizado)
      if (fk.referencesField) {
        refField = fk.referencesField.toLowerCase().replace(/\s+/g, '_');
      }
      
      // Comentario con tipo de relación UML 2.5 y sus características
      let comment = '';
      if (fk.relationType) {
        const relationLabels: Record<string, string> = {
          "INHERITANCE": "Inheritance (△) - Subclass → Superclass",
          "ASSOCIATION": "Association",
          "AGGREGATION": "Aggregation (◇)",
          "COMPOSITION": "Composition (◆)",
          "1-1": "One-to-One",
          "1-N": "One-to-Many",
          "N-N": "Many-to-Many"
        };
        const label = relationLabels[fk.relationType] || fk.relationType;
        comment = ` -- ${label}`;
      }
      
      tableSql += `,\n  FOREIGN KEY (${fk.field}) REFERENCES ${fk.references}(${refField}) ON DELETE ${onDelete} ON UPDATE ${onUpdate}${comment}`;
    });

    tableSql += "\n);\n\n";

    return {
      tableName,
      sql: tableSql,
      foreignKeys: foreignKeys.map(fk => fk.references),
      hasFK: foreignKeys.length > 0 
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

  // === COMENTARIOS FINALES ===
  sql += "\n-- ✅ Script generado con exito\n";

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

