import React from "react";
import { Handle, Position } from "reactflow";
import type { Field, TableData } from "@shared/types";
import { useViewMode } from "../store/ViewModeContext";
import { sqlToUmlType, isForeignKeyField } from "../utils/typeMapping";

interface TableNodeProps {
  id: string;
  data: TableData;
  selected?: boolean;
}

export default function TableNode({ id, data, selected }: TableNodeProps) {
  const tableName = data.name || data.label || "NuevaTabla";
  const fields = data.fields || [];
  const { viewMode } = useViewMode();

  // 🎨 Separar atributos y métodos
  const attributes = fields.filter(f => !f.isMethod);
  const methods = fields.filter(f => f.isMethod);

  // 🎨 Filtrar campos según el modo de vista
  const visibleAttributes = viewMode === "UML" 
    ? attributes.filter(f => !isForeignKeyField(f)) 
    : attributes;

  // 🎨 Los métodos solo se muestran en vista UML
  const visibleMethods = viewMode === "UML" ? methods : [];

  // 🎨 Obtener tipo a mostrar según el modo
  const getDisplayType = (field: Field): string => {
    if (viewMode === "UML") {
      return sqlToUmlType(field.type || "");
    }
    return field.type || "";
  };

  return (
    <div
      style={{
        background: "#1f1f1f",
        color: "white",
        borderRadius: 8,
        border: selected ? "3px solid #00f5ff" : "2px solid #444",
        width: 240,
        fontFamily: "system-ui, -apple-system, sans-serif",
        boxShadow: selected ? "0 0 25px rgba(0,245,255,0.4)" : "0 4px 12px rgba(0,0,0,0.5)",
        transition: "all 0.2s ease",
        cursor: "pointer"
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: "#4CAF50", width: 10, height: 10 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: "#2196F3", width: 10, height: 10 }} />

      <div style={{ background: selected ? "#667eea" : "#333", padding: "10px 12px", fontWeight: "bold", borderRadius: "8px 8px 0 0", fontSize: "14px", textAlign: "center", letterSpacing: "0.3px", transition: "background 0.2s" }}>
        {tableName}
      </div>

      <div style={{ padding: "10px 12px" }}>
        {/* Atributos */}
        {visibleAttributes.length === 0 ? (
          <div style={{ color: "#777", fontSize: 11, textAlign: "center", fontStyle: "italic", padding: "8px 0" }}>
            (sin atributos)
          </div>
        ) : (
          visibleAttributes.map((f: Field) => (
            <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, margin: "4px 0", padding: "4px 6px", background: "#2a2a2a", borderRadius: 4, borderLeft: f.isPrimary ? "3px solid #FFD700" : f.isForeign ? "3px solid #667eea" : "3px solid transparent" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
                {f.isPrimary && <span title="Primary Key">🔑</span>}
                {f.isForeign && <span title="Foreign Key">🔗</span>}
                <span style={{ fontWeight: f.isPrimary ? 700 : 400 }}>{f.name}</span>
              </span>
              <span style={{ color: "#999", fontSize: 10, fontFamily: "monospace" }}>{getDisplayType(f)}</span>
            </div>
          ))
        )}

        {/* Línea divisoria si hay métodos */}
        {visibleMethods.length > 0 && (
          <div style={{ 
            height: "2px", 
            background: "#444", 
            margin: "12px 0", 
            borderRadius: "1px" 
          }} />
        )}

        {/* Métodos (solo en UML) */}
        {visibleMethods.length > 0 && (
          <>
            {visibleMethods.map((f: Field) => (
              <div key={f.id} style={{ 
                fontSize: 11, 
                margin: "4px 0", 
                padding: "4px 6px", 
                background: "#2d2416", 
                borderRadius: 4, 
                borderLeft: "3px solid #f39c12",
                color: "#f1c40f",
                fontFamily: "monospace"
              }}>
                {f.name}
              </div>
            ))}
          </>
        )}
      </div>

      {selected && (
        <div style={{ padding: "6px", background: "#667eea", color: "#fff", fontSize: 10, textAlign: "center", borderRadius: "0 0 8px 8px", fontWeight: 600 }}>
           Edita en el panel derecho
        </div>
      )}
    </div>
  );
}
