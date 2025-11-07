import React, { useState, useEffect } from "react";
import { Node, Edge } from "reactflow";
import { removeFKRelation, updateFKRelation } from "../utils/relationHandler";
import { askRelationType } from "../utils/relationPrompt";
import { getEdgeStyle } from "../utils/relationStyles";

interface Field {
  id: string | number;
  name: string;
  type: string;
  isPrimary?: boolean;
  isForeign?: boolean;
  nullable?: boolean;
  references?: string | null;
  relationType?: string; // 🆕 Tipo de relación: "1-1", "1-N", "N-N"
}

interface PropertiesPanelProps {
  selectedNode: Node | null;
  availableTables: string[];
  edges?: Edge[];
  nodes?: Node[];
  setEdges?: React.Dispatch<React.SetStateAction<Edge[]>>;
  onUpdate: (nodeId: string, updatedData: any) => void;
  socket?: any; // 🆕 Socket para emitir eventos
  project?: any; // 🆕 Proyecto actual
}

// Tipos de datos PostgreSQL comunes
const DATA_TYPES = [
  "VARCHAR(255)",
  "VARCHAR(100)",
  "TEXT",
  "INT",
  "BIGINT",
  "SERIAL",
  "BIGSERIAL",
  "BOOLEAN",
  "DATE",
  "TIMESTAMP",
  "TIMESTAMPTZ",
  "DECIMAL(10,2)",
  "NUMERIC",
  "JSON",
  "JSONB",
  "UUID"
];

export default function PropertiesPanel({ 
  selectedNode, 
  availableTables, 
  edges = [],
  nodes = [],
  setEdges,
  onUpdate,
  socket,
  project
}: PropertiesPanelProps) {
  const [table, setTable] = useState<any>(null);

  // Actualizar estado local cuando cambia el nodo seleccionado
  useEffect(() => {
    if (selectedNode?.data) {
      setTable({
        name: selectedNode.data.name || selectedNode.data.label || "NuevaTabla",
        fields: selectedNode.data.fields || []
      });
    } else {
      setTable(null);
    }
  }, [selectedNode]);

  if (!selectedNode || !table) {
    return (
      <div
        style={{
          background: "#1a1a1a",
          color: "#aaa",
          padding: 20,
          borderLeft: "1px solid #333",
          height: "100vh",
          width: 320,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          boxSizing: "border-box"
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📋</div>
        <p style={{ margin: 0, fontSize: 14 }}>Selecciona una tabla</p>
        <p style={{ margin: "8px 0 0", fontSize: 12, opacity: 0.7 }}>
          Haz clic en un nodo para editar sus propiedades
        </p>
      </div>
    );
  }

  const updateTable = (key: string, value: any) => {
    const updated = { ...table, [key]: value };
    setTable(updated);
    onUpdate(selectedNode.id, updated);
  };

  const updateField = (index: number, key: string, value: any) => {
    const newFields = [...table.fields];
    newFields[index] = { ...newFields[index], [key]: value };
    
    // Si se marca como PK, automáticamente hacer NOT NULL
    if (key === "isPrimary" && value === true) {
      newFields[index].nullable = false;
    }
    
    // Si se desmarca FK, limpiar referencias
    if (key === "isForeign" && value === false) {
      newFields[index].references = null;
    }
    
    updateTable("fields", newFields);
  };

  const addField = () => {
    const newField: Field = {
      id: Date.now(),
      name: "nuevo_campo",
      type: "VARCHAR(255)",
      isPrimary: false,
      isForeign: false,
      nullable: true,
      references: null,
      relationType: undefined, // 🆕 Inicializar relationType
    };
    updateTable("fields", [...table.fields, newField]);
  };

  const removeField = (i: number) => {
    const fieldToRemove = table.fields[i];
    
    // Si el campo es FK, eliminar la relación visual
    if (fieldToRemove.isForeign && setEdges && selectedNode) {
      removeFKRelation(selectedNode.id, fieldToRemove.name, edges, setEdges);
    }
    
    updateTable("fields", table.fields.filter((_: any, idx: number) => idx !== i));
  };

  const duplicateField = (i: number) => {
    const field = { ...table.fields[i], id: Date.now(), name: `${table.fields[i].name}_copia` };
    const newFields = [...table.fields];
    newFields.splice(i + 1, 0, field);
    updateTable("fields", newFields);
  };

  return (
    <div
      style={{
        background: "#1a1a1a",
        color: "white",
        padding: 16,
        width: 320,
        borderLeft: "1px solid #333",
        height: "100vh",
        overflowY: "auto",
        flexShrink: 0,
        boxSizing: "border-box",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}
    >
      {/* Header */}
      <div style={{ 
        marginBottom: 20,
        paddingBottom: 16,
        borderBottom: "2px solid #667eea"
      }}>
        <h3 style={{ 
          margin: "0 0 8px 0", 
          fontSize: 16,
          color: "#667eea",
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          ⚙️ Propiedades
        </h3>
        <p style={{ 
          margin: 0, 
          fontSize: 11, 
          opacity: 0.6 
        }}>
          Edita los campos de la tabla seleccionada
        </p>
      </div>

      {/* Nombre de la tabla */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ 
          display: "block", 
          fontSize: 11, 
          fontWeight: 600,
          marginBottom: 6,
          opacity: 0.8,
          letterSpacing: "0.5px"
        }}>
          NOMBRE DE LA TABLA
        </label>
        <input
          value={table.name || ""}
          placeholder="Nombre de tabla..."
          onChange={(e) => updateTable("name", e.target.value)}
          onBlur={(e) => {
            // Si lo deja vacío, solo conservar vacío (no autogenerar)
            if (!table.name || table.name.trim() === "") {
              updateTable("name", "");
            }
            // Restaurar borde
            e.target.style.borderColor = "#333";
          }}
          onFocus={(e) => e.target.style.borderColor = "#667eea"}
          style={{
            width: "100%",
            background: "#252525",
            color: "#fff",
            border: "2px solid #333",
            padding: "10px 12px",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            outline: "none",
            transition: "border-color 0.2s"
          }}
        />
      </div>

      {/* Lista de campos */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12
        }}>
          <label style={{ 
            fontSize: 11, 
            fontWeight: 600,
            opacity: 0.8,
            letterSpacing: "0.5px"
          }}>
            CAMPOS ({table.fields.length})
          </label>
          <button
            onClick={addField}
            style={{
              background: "#667eea",
              border: "none",
              color: "#fff",
              padding: "6px 12px",
              cursor: "pointer",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#7c8ef0"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#667eea"}
          >
            ➕ Agregar Campo
          </button>
        </div>

        {table.fields.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            padding: "32px 16px",
            background: "#252525",
            borderRadius: 8,
            border: "2px dashed #333"
          }}>
            <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>📝</div>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>
              No hay campos. Agrega uno para empezar.
            </p>
          </div>
        ) : (
          table.fields.map((f: Field, i: number) => (
            <div
              key={f.id}
              style={{
                background: "#252525",
                padding: 12,
                borderRadius: 8,
                marginBottom: 12,
                border: "1px solid #333",
                transition: "border-color 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "#444"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "#333"}
            >
              {/* Nombre del campo */}
              <div style={{ marginBottom: 8 }}>
                <label style={{ 
                  display: "block", 
                  fontSize: 10, 
                  marginBottom: 4,
                  opacity: 0.6 
                }}>
                  Nombre
                </label>
                <input
                  value={f.name}
                  onChange={(e) => updateField(i, "name", e.target.value)}
                  placeholder="nombre_campo"
                  style={{
                    width: "100%",
                    background: "#1f1f1f",
                    color: "#fff",
                    border: "1px solid #333",
                    padding: "8px 10px",
                    borderRadius: 4,
                    fontSize: 13,
                    outline: "none"
                  }}
                />
              </div>

              {/* Tipo de dato */}
              <div style={{ marginBottom: 8 }}>
                <label style={{ 
                  display: "block", 
                  fontSize: 10, 
                  marginBottom: 4,
                  opacity: 0.6 
                }}>
                  Tipo de dato
                </label>
                <select
                  value={f.type}
                  onChange={(e) => updateField(i, "type", e.target.value)}
                  style={{
                    width: "100%",
                    background: "#1f1f1f",
                    color: "#fff",
                    border: "1px solid #333",
                    padding: "8px 10px",
                    borderRadius: 4,
                    fontSize: 12,
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  {DATA_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Checkboxes */}
              <div style={{ 
                display: "flex", 
                gap: 12,
                marginBottom: 8,
                paddingTop: 8,
                borderTop: "1px solid #2a2a2a"
              }}>
                <label
                  style={{
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    cursor: "pointer",
                    flex: 1
                  }}
                >
                  <input
                    type="checkbox"
                    checked={f.isPrimary || false}
                    onChange={(e) => updateField(i, "isPrimary", e.target.checked)}
                    style={{ cursor: "pointer" }}
                  />
                  🔑 PK
                </label>

                <label
                  style={{
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    cursor: "pointer",
                    flex: 1
                  }}
                >
                  <input
                    type="checkbox"
                    checked={f.isForeign || false}
                    onChange={(e) => updateField(i, "isForeign", e.target.checked)}
                    style={{ cursor: "pointer" }}
                  />
                  🔗 FK
                </label>

                <label
                  style={{
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    cursor: "pointer",
                    flex: 1
                  }}
                  title={f.nullable ? "Permite NULL" : "NOT NULL"}
                >
                  <input
                    type="checkbox"
                    checked={f.nullable !== false}
                    onChange={(e) => updateField(i, "nullable", e.target.checked)}
                    disabled={f.isPrimary}
                    style={{ cursor: f.isPrimary ? "not-allowed" : "pointer" }}
                  />
                  Null
                </label>
              </div>

              {/* Selector de tabla referenciada (solo si es FK) */}
              {f.isForeign && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ 
                    display: "block", 
                    fontSize: 10, 
                    marginBottom: 4,
                    opacity: 0.6 
                  }}>
                    Tabla referenciada
                  </label>
                  <select
                    value={table.fields[i].references || ""}
                    onChange={async (e) => {
                      const oldReference = table.fields[i].references;
                      const targetTable = e.target.value || null;
                      
                      if (!targetTable) {
                        // Si deseleccionó, eliminar relación
                        if (setEdges && selectedNode && oldReference) {
                          updateFKRelation(selectedNode.id, oldReference, null, edges, nodes, setEdges);
                        }
                        updateField(i, "references", null);
                        updateField(i, "relationType", undefined);
                        return;
                      }

                      // 🎨 PRIMERO: Mostrar modal para seleccionar tipo de relación
                      const relationType = await askRelationType();
                      if (!relationType) {
                        // Usuario canceló - NO actualizar nada
                        console.log("⚠️ [PropertiesPanel] User cancelled relation type selection");
                        return;
                      }

                      // ✅ SEGUNDO: Actualizar el campo con references Y relationType juntos
                      const newFields = [...table.fields];
                      newFields[i] = { 
                        ...newFields[i], 
                        references: targetTable,
                        relationType: relationType
                      };
                      updateTable("fields", newFields);

                      console.log(`🔗 [PropertiesPanel] Creating ${relationType} relation to ${targetTable}`);

                      // Encontrar el nodo destino
                      const targetNode = nodes.find(n => 
                        n.data.name === targetTable || n.data.label === targetTable
                      );

                      if (!targetNode || !selectedNode) {
                        console.warn("⚠️ [PropertiesPanel] Target node not found");
                        return;
                      }

                      // Eliminar relaciones FK previas si las había
                      if (setEdges && oldReference) {
                        const filteredEdges = edges.filter(e => 
                          !(e.source === targetNode.id && e.target === selectedNode.id && e.label?.includes("‒"))
                        );
                        setEdges(filteredEdges);

                        // Emitir eliminación de edges previos si hay socket
                        if (socket && project) {
                          edges.filter(e => 
                            e.source === targetNode.id && e.target === selectedNode.id && e.label?.includes("‒")
                          ).forEach(oldEdge => {
                            socket.emit("diagram-change", {
                              projectId: project.id,
                              action: "DELETE_EDGE",
                              payload: { id: oldEdge.id },
                            });
                          });
                        }
                      }

                      // Obtener estilo unificado según tipo de relación
                      const edgeStyle = getEdgeStyle(relationType);

                      // Crear nuevo edge con el tipo seleccionado
                      const newEdge: Edge = {
                        id: `edge-fk-${Date.now()}`,
                        source: targetNode.id,   // Tabla referenciada (lado PK)
                        target: selectedNode.id, // Tabla con FK
                        label: relationType,
                        animated: edgeStyle.animated,
                        style: { 
                          stroke: edgeStyle.stroke, 
                          strokeWidth: edgeStyle.strokeWidth,
                          strokeDasharray: edgeStyle.strokeDasharray // 🆕 Línea punteada
                        },
                        type: edgeStyle.type,
                        labelStyle: { 
                          fill: edgeStyle.stroke, 
                          fontWeight: 700, 
                          fontSize: 12
                        },
                        labelBgStyle: edgeStyle.labelBgStyle,
                        markerEnd: {
                          type: 'arrowclosed',
                          color: edgeStyle.stroke
                        },
                        data: { relationType } // 🆕 Guardar tipo en data del edge
                      };

                      console.log("✅ [PropertiesPanel] Edge created:", newEdge);

                      // Actualizar estado local
                      if (setEdges) {
                        setEdges((prev: Edge[]) => [...prev, newEdge]);
                      }

                      // Emitir al servidor si hay socket
                      if (socket && project) {
                        socket.emit("diagram-change", {
                          projectId: project.id,
                          action: "ADD_EDGE",
                          payload: newEdge,
                        });
                      }
                    }}
                    style={{
                      width: "100%",
                      background: "#2a2a2a",
                      color: "#fff",
                      border: "1px solid #444",
                      padding: "8px 10px",
                      borderRadius: 4,
                      fontSize: 12,
                      outline: "none",
                      cursor: "pointer"
                    }}
                  >
                    <option value="">-- Selecciona tabla --</option>
                    {availableTables
                      .filter(t => t !== table.name)
                      .map(tableName => (
                        <option key={tableName} value={tableName}>
                          {tableName}
                        </option>
                      ))}
                  </select>

                  {/* 🆕 Mostrar tipo de relación actual */}
                  {f.relationType && (
                    <div style={{ 
                      marginTop: 6, 
                      fontSize: 10, 
                      opacity: 0.7,
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      <span>Tipo:</span>
                      <span style={{ 
                        fontWeight: "bold",
                        color: f.relationType === "1-1" ? "#74b9ff" : 
                               f.relationType === "1-N" ? "#00cec9" : 
                               f.relationType === "N-N" ? "#ff7675" : "#aaa"
                      }}>
                        {f.relationType}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Botones de acción */}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button
                  onClick={() => duplicateField(i)}
                  style={{
                    flex: 1,
                    background: "#333",
                    border: "none",
                    color: "#aaa",
                    padding: "6px",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 10,
                    fontWeight: 600,
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#444";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#333";
                    e.currentTarget.style.color = "#aaa";
                  }}
                  title="Duplicar campo"
                >
                  📋 Duplicar
                </button>

                <button
                  onClick={() => removeField(i)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "1px solid #f66",
                    color: "#f66",
                    padding: "6px",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 10,
                    fontWeight: 600,
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f66";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#f66";
                  }}
                >
                  🗑 Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
