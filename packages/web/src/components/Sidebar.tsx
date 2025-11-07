import React from "react";
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

interface SidebarProps {
  nodes: Node[];
  edges: Edge[];
  selectedNode: string | null;
  onAddNode: () => void;
  onExportSQL: () => void;
  onDeleteNode?: (nodeId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  nodes, 
  edges, 
  selectedNode, 
  onAddNode, 
  onExportSQL,
  onDeleteNode
}) => {
  const tableNodes = nodes.filter(n => n.type === 'table' || n.type === 'class');
  const selectedNodeData = tableNodes.find(n => n.id === selectedNode);
  
  return (
    <div style={{
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 280,
      background: "#1a1a1a",
      borderRight: "1px solid #333",
      display: "flex",
      flexDirection: "column",
      zIndex: 10,
      color: "#fff",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      {/* Header */}
      <div style={{
        padding: "16px",
        borderBottom: "1px solid #333",
        background: "#222"
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: "16px", 
          fontWeight: "600",
          letterSpacing: "0.3px"
        }}>
          �️ Diagrama ER
        </h3>
      </div>

      {/* Stats */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid #2a2a2a",
        display: "flex",
        gap: 16,
        fontSize: "13px"
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ opacity: 0.6, fontSize: "11px", marginBottom: 4 }}>Tablas</div>
          <div style={{ fontSize: "20px", fontWeight: "bold", color: "#667eea" }}>
            {tableNodes.length}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ opacity: 0.6, fontSize: "11px", marginBottom: 4 }}>Relaciones</div>
          <div style={{ fontSize: "20px", fontWeight: "bold", color: "#764ba2" }}>
            {edges.length}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #2a2a2a" }}>
        <button 
          onClick={onAddNode}
          style={{
            width: "100%",
            padding: "10px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            border: "none",
            borderRadius: 6,
            color: "#fff",
            fontWeight: "600",
            cursor: "pointer",
            fontSize: "13px",
            marginBottom: 8,
            transition: "transform 0.1s"
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
          onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
          ➕ Nueva Tabla
        </button>
        
        <button 
          onClick={onExportSQL}
          style={{
            width: "100%",
            padding: "10px",
            background: "#2c2c2c",
            border: "1px solid #444",
            borderRadius: 6,
            color: "#aaa",
            fontWeight: "600",
            cursor: "pointer",
            fontSize: "13px",
            transition: "all 0.1s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#333";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#2c2c2c";
            e.currentTarget.style.color = "#aaa";
          }}
        >
          💾 Exportar SQL
        </button>
      </div>

      {/* Lista de tablas */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "8px"
      }}>
        <div style={{
          fontSize: "11px",
          fontWeight: "600",
          opacity: 0.6,
          padding: "8px 8px 4px",
          letterSpacing: "0.5px"
        }}>
          TABLAS ({tableNodes.length})
        </div>
        
        {tableNodes.length === 0 ? (
          <div style={{
            padding: "16px",
            textAlign: "center",
            opacity: 0.5,
            fontSize: "12px"
          }}>
            No hay tablas aún.
            <br />
            Crea una para empezar.
          </div>
        ) : (
          tableNodes.map(node => {
            const data = node.data || {};
            const tableName = data.name || data.label || "Sin nombre";
            const fieldCount = (data.fields || []).length;
            const pkCount = (data.fields || []).filter((f: Field) => f.isPrimary).length;
            const fkCount = (data.fields || []).filter((f: Field) => f.isForeign).length;
            const isSelected = node.id === selectedNode;
            
            return (
              <div 
                key={node.id}
                style={{
                  margin: "4px 8px",
                  padding: "10px",
                  background: isSelected ? "#2c2c2c" : "#252525",
                  border: isSelected ? "2px solid #667eea" : "1px solid #333",
                  borderRadius: 6,
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative"
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "#2c2c2c";
                    e.currentTarget.style.borderColor = "#667eea";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "#252525";
                    e.currentTarget.style.borderColor = "#333";
                  }
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontWeight: "600", color: isSelected ? "#667eea" : "#fff", flex: 1 }}>
                    📦 {tableName}
                  </div>
                  {onDeleteNode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const confirm = window.confirm(`¿Eliminar tabla "${tableName}"?`);
                        if (confirm) {
                          onDeleteNode(node.id);
                        }
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#f66",
                        fontSize: "16px",
                        cursor: "pointer",
                        padding: "2px 6px",
                        borderRadius: 4,
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
                      title="Eliminar tabla"
                    >
                      🗑️
                    </button>
                  )}
                </div>
                <div style={{ 
                  fontSize: "11px", 
                  opacity: 0.7,
                  display: "flex",
                  gap: 10
                }}>
                  <span>📋 {fieldCount} campos</span>
                  {pkCount > 0 && <span>🔑 {pkCount}</span>}
                  {fkCount > 0 && <span>🔗 {fkCount}</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer info */}
      <div style={{
        padding: "12px 16px",
        borderTop: "1px solid #2a2a2a",
        fontSize: "11px",
        opacity: 0.5,
        textAlign: "center"
      }}>
        Diagrama ER Colaborativo
      </div>
    </div>
  );
};
