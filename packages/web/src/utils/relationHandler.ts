/**
 * Utilidades para manejo de relaciones en el diagrama ER
 * Detecta automáticamente PK/FK y gestiona la creación/eliminación de relaciones
 * Soporta UML 2.5: Herencia, Composición, Agregación, etc.
 */

import { Node, Edge } from "reactflow";
import type { Field, TableData } from "@shared/types";

export type { Field, TableData };

/**
 * Implementa herencia extendiendo campos de la clase padre a la clase hija
 * @param childTable - Nodo de la clase hija (subclase)
 * @param parentTable - Nodo de la clase padre (superclase)
 * @returns Array de campos heredados agregados
 */
export function implementInheritance(
  childTable: Node<TableData>,
  parentTable: Node<TableData>
): Field[] {
  const inheritedFields: Field[] = [];
  
  // 🎯 Estrategia Table-Per-Type (UML 2.5):
  // La subclase SOLO tiene FK al padre + campos propios
  // Los campos comunes NO se duplican (están en la superclase)
  
  const pkField = parentTable.data.fields.find(f => f.isPrimary);
  if (!pkField) {
    console.warn(`⚠️ [Inheritance] Parent table ${parentTable.data.name} has no PK`);
    return inheritedFields;
  }
  
  // Verificar si ya existe FK al padre
  const existingFK = childTable.data.fields.find(
    (f) => f.isForeign && f.references === parentTable.data.name
  );
  
  if (!existingFK) {
    // Crear SOLO FK al padre (no copiar campos)
    const fkField: Field = {
      id: Date.now() + Math.random(),
      name: `${parentTable.data.name.toLowerCase()}_${pkField.name}`,
      type: pkField.type,
      isForeign: true,
      isPrimary: false,
      nullable: false,
      references: parentTable.data.name,
      referencesField: pkField.name,
      relationType: "INHERITANCE",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    };
    childTable.data.fields.push(fkField);
    inheritedFields.push(fkField);
    
    console.log(`🔼 [Inheritance] ${childTable.data.name} → ${parentTable.data.name}: Created FK ${fkField.name}`);
  } else {
    console.log(`ℹ️ [Inheritance] FK already exists: ${childTable.data.name} → ${parentTable.data.name}`);
  }
  
  return inheritedFields;
}

/**
 * Determina cuál tabla debe tener la PK y cuál la FK al crear una relación
 * @param sourceTable - Nodo de la tabla origen
 * @param targetTable - Nodo de la tabla destino
 * @returns Objeto con pkTable y fkTable determinadas
 */
export function determinePKFK(
  sourceTable: Node<TableData>,
  targetTable: Node<TableData>
): { pkTable: Node<TableData>; fkTable: Node<TableData> } {
  const pkSource = sourceTable.data.fields.find((f) => f.isPrimary);
  const pkTarget = targetTable.data.fields.find((f) => f.isPrimary);

  // Si el source tiene PK y target no, target será FK
  if (pkSource && !pkTarget) {
    return { pkTable: sourceTable, fkTable: targetTable };
  }

  // Si el target tiene PK y source no, source será FK
  if (!pkSource && pkTarget) {
    return { pkTable: targetTable, fkTable: sourceTable };
  }

  // Si ambos tienen PK, asume que el source es PK por defecto (1-N)
  // El source (tabla referenciada) es el lado "1", el target es el lado "N"
  return { pkTable: sourceTable, fkTable: targetTable };
}

/**
 * Crea automáticamente un campo FK en la tabla foránea
 * @param fkTable - Nodo de la tabla que recibirá el FK
 * @param pkTable - Nodo de la tabla que contiene la PK
 * @param relationType - Tipo de relación: "1-1", "1-N", etc.
 * @returns El campo FK creado o undefined si no hay PK
 */
export function createFKField(
  fkTable: Node<TableData>,
  pkTable: Node<TableData>,
  relationType?: string
): Field | undefined {
  const pkField = pkTable.data.fields.find((f) => f.isPrimary);
  if (!pkField) return undefined;

  // Verificar si ya existe un FK hacia esta tabla y campo específico
  const existingFK = fkTable.data.fields.find(
    (f) => f.isForeign && f.references === pkTable.data.name && f.referencesField === pkField.name
  );

  if (existingFK) {
    // Actualizar tipo de relación si se proporciona
    if (relationType && existingFK.relationType !== relationType) {
      existingFK.relationType = relationType;
    }
    return existingFK; // No crear duplicado
  }

  // 🎯 Lógica UML 2.5 según tipo de relación
  let onDelete: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION" | undefined;
  let onUpdate: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION" | undefined;
  let nullable = false;
  
  switch (relationType) {
    case "COMPOSITION":
      // ◆ Composición: ciclo de vida dependiente
      // Si se elimina el "todo", se eliminan las "partes"
      onDelete = "CASCADE";
      onUpdate = "CASCADE";
      nullable = false; // La parte NO puede existir sin el todo
      break;
      
    case "AGGREGATION":
      // ◇ Agregación: existencia independiente
      // Si se elimina el "todo", las "partes" quedan huérfanas pero existen
      onDelete = "SET NULL";
      onUpdate = "NO ACTION";
      nullable = true; // La parte PUEDE existir sin el todo
      break;
      
    case "ASSOCIATION":
      // → Asociación: relación bidireccional estándar
      onDelete = "RESTRICT"; // Evitar eliminación accidental
      onUpdate = "NO ACTION";
      nullable = true;
      break;
      
    case "1-1":
    case "1-N":
      // Crow's Foot: comportamiento estándar
      onDelete = "RESTRICT";
      onUpdate = "NO ACTION";
      nullable = false;
      break;
      
    default:
      // Por defecto: RESTRICT para evitar eliminaciones accidentales
      onDelete = "RESTRICT";
      onUpdate = "NO ACTION";
      nullable = false;
  }

  const newField: Field = {
    id: Date.now(),
    name: `${pkTable.data.name.toLowerCase()}_${pkField.name}`,
    type: pkField.type,
    isForeign: true,
    nullable,
    references: pkTable.data.name,
    referencesField: pkField.name,
    relationType: relationType || "1-N",
    onDelete,
    onUpdate,
  };

  fkTable.data.fields.push(newField);
  return newField;
}

/**
 * Elimina la relación visual asociada a un campo FK
 * @param nodeId - ID del nodo que contiene el campo FK
 * @param fieldName - Nombre del campo FK a eliminar
 * @param edges - Array de edges actual
 * @param setEdges - Función para actualizar edges
 */
export function removeFKRelation(
  nodeId: string,
  fieldName: string,
  edges: Edge[],
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
): void {
  setEdges((prev) =>
    prev.filter((e) => {
      // Eliminar edge donde:
      // - El source es el nodo actual (relaciones salientes)
      // - O el target es el nodo actual (relaciones entrantes)
      // - Y el label coincide con el campo FK
      const isRelatedEdge =
        (e.source === nodeId || e.target === nodeId) &&
        (e.label === fieldName || e.label?.includes(fieldName));
      return !isRelatedEdge;
    })
  );
}

/**
 * Elimina todas las relaciones asociadas a un campo FK específico
 * @param nodeId - ID del nodo
 * @param references - Nombre de la tabla referenciada
 * @param edges - Array de edges actual
 * @param nodes - Array de nodos actual
 * @returns Array de edges filtrado
 */
export function removeRelationByReference(
  nodeId: string,
  references: string,
  edges: Edge[],
  nodes: Node<TableData>[]
): Edge[] {
  // Encontrar el nodo de la tabla referenciada
  const targetNode = nodes.find(
    (n) => n.data.name === references || n.data.label === references
  );

  if (!targetNode) return edges;

  // Eliminar edges entre estos dos nodos
  return edges.filter((e) => {
    const isRelation =
      (e.source === nodeId && e.target === targetNode.id) ||
      (e.source === targetNode.id && e.target === nodeId);
    return !isRelation;
  });
}

/**
 * Actualiza la relación cuando cambia la tabla referenciada de un FK
 * @param nodeId - ID del nodo que contiene el FK
 * @param oldReference - Tabla anterior referenciada
 * @param newReference - Nueva tabla referenciada
 * @param edges - Array de edges actual
 * @param nodes - Array de nodos actual
 * @param setEdges - Función para actualizar edges
 */
export function updateFKRelation(
  nodeId: string,
  oldReference: string | null,
  newReference: string | null,
  edges: Edge[],
  nodes: Node<TableData>[],
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
): void {
  // Eliminar relación anterior si existía
  if (oldReference) {
    const filteredEdges = removeRelationByReference(
      nodeId,
      oldReference,
      edges,
      nodes
    );
    setEdges(filteredEdges);
  }

  // No crear nueva relación aquí, se maneja en handleCreateRelationFromFK
}
