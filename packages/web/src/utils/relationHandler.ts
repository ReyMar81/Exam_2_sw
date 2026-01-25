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
  
  const pkField = parentTable.data.fields.find(f => f.isPrimary);
  if (!pkField) {
    console.warn(`⚠️ [Inheritance] Parent table ${parentTable.data.name} has no PK`);
    return inheritedFields;
  }
  
  const existingFK = childTable.data.fields.find(
    (f) => f.isForeign && f.references === parentTable.data.name
  );
  
  if (!existingFK) {
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

  if (pkSource && !pkTarget) {
    return { pkTable: sourceTable, fkTable: targetTable };
  }

  if (!pkSource && pkTarget) {
    return { pkTable: targetTable, fkTable: sourceTable };
  }

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

  const existingFK = fkTable.data.fields.find(
    (f) => f.isForeign && f.references === pkTable.data.name && f.referencesField === pkField.name
  );

  if (existingFK) {
    if (relationType && existingFK.relationType !== relationType) {
      existingFK.relationType = relationType;
    }
    return existingFK;
  }

  let onDelete: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION" | undefined;
  let onUpdate: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION" | undefined;
  let nullable = false;
  
  switch (relationType) {
    case "COMPOSITION":
      onDelete = "CASCADE";
      onUpdate = "CASCADE";
      nullable = false;
      break;
      
    case "AGGREGATION":
      onDelete = "SET NULL";
      onUpdate = "NO ACTION";
      nullable = true;
      break;
      
    case "ASSOCIATION":
      onDelete = "RESTRICT";
      onUpdate = "NO ACTION";
      nullable = true;
      break;
      
    case "1-1":
    case "1-N":
      onDelete = "RESTRICT";
      onUpdate = "NO ACTION";
      nullable = false;
      break;
      
    default:
      onDelete = "RESTRICT";
      onUpdate = "NO ACTION";
      nullable = false;
  }

  const newField: Field = {
    id: Date.now(),
    name: `${pkTable.data.name.toLowerCase()}_${pkField.name}`,
    type: pkField.type.toUpperCase().includes("SERIAL") ? "INT" : pkField.type,
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
  const targetNode = nodes.find(
    (n) => n.data.name === references || n.data.label === references
  );

  if (!targetNode) return edges;
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
  if (oldReference) {
    const filteredEdges = removeRelationByReference(
      nodeId,
      oldReference,
      edges,
      nodes
    );
    setEdges(filteredEdges);
  }
}

/**
 * Elimina campos FK generados automáticamente cuando se elimina una relación (edge)
 * @param edge - El edge que se está eliminando
 * @param nodes - Array de nodos actual
 * @param setNodes - Función para actualizar nodos
 * @returns true si se eliminó algún campo FK
 */
export function removeFKFieldsFromEdge(
  edge: Edge,
  nodes: Node<TableData>[],
  setNodes: React.Dispatch<React.SetStateAction<Node<TableData>[]>>
): boolean {
  let fieldsRemoved = false;
  
  // Obtener información del edge
  const sourceNodeId = edge.source;
  const targetNodeId = edge.target;
  const relationType = edge.data?.relationType;
  const targetFieldName = edge.data?.targetField;
  const sourceFieldName = edge.data?.sourceField;
  
  console.log(`🗑️ [FK Cleanup] Removing FK fields for edge: ${edge.id}`);
  console.log(`   Source: ${sourceNodeId}, Target: ${targetNodeId}`);
  console.log(`   Relation: ${relationType}, Target Field: ${targetFieldName}`);
  
  // Actualizar nodos eliminando campos FK relacionados
  setNodes((currentNodes) => {
    return currentNodes.map((node) => {
      // Verificar si este nodo es parte de la relación eliminada
      if (node.id !== sourceNodeId && node.id !== targetNodeId) {
        return node;
      }
      
      // Filtrar campos FK que fueron creados por esta relación
      const updatedFields = node.data.fields.filter((field) => {
        // Si el campo no es FK, mantenerlo
        if (!field.isForeign) return true;
        
        // Para el nodo target: eliminar FK si coincide con targetFieldName
        if (node.id === targetNodeId && field.name === targetFieldName) {
          console.log(`   ✂️ Removing FK field "${field.name}" from target node`);
          fieldsRemoved = true;
          return false;
        }
        
        // Para el nodo source: eliminar FK si coincide con sourceFieldName (menos común)
        if (node.id === sourceNodeId && field.name === sourceFieldName && field.isForeign) {
          console.log(`   ✂️ Removing FK field "${field.name}" from source node`);
          fieldsRemoved = true;
          return false;
        }
        
        // Para relaciones especiales, verificar por referencias
        const sourceNode = currentNodes.find(n => n.id === sourceNodeId);
        const targetNode = currentNodes.find(n => n.id === targetNodeId);
        
        if (sourceNode && targetNode) {
          // Si el campo FK referencia a alguna de las tablas en la relación eliminada
          const referencesSource = field.references === sourceNode.data.name;
          const referencesTarget = field.references === targetNode.data.name;
          
          if ((node.id === targetNodeId && referencesSource) || 
              (node.id === sourceNodeId && referencesTarget)) {
            // Verificar que el campo tenga el mismo tipo de relación
            if (field.relationType === relationType || !field.relationType) {
              console.log(`   ✂️ Removing FK field "${field.name}" (references ${field.references})`);
              fieldsRemoved = true;
              return false;
            }
          }
        }
        
        return true;
      });
      
      // Si se modificaron los campos, retornar nodo actualizado
      if (updatedFields.length !== node.data.fields.length) {
        return {
          ...node,
          data: {
            ...node.data,
            fields: updatedFields
          }
        };
      }
      
      return node;
    });
  });
  
  return fieldsRemoved;
}
