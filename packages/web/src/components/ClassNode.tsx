import React, { useState, useEffect } from "react";
import { Handle, Position } from "reactflow";

interface Attribute {
  id: number;
  name: string;
  type: string;
}

interface Method {
  id: number;
  name: string;
}

interface ClassNodeProps {
  id: string;
  data: {
    name?: string;
    attributes?: Attribute[];
    methods?: Method[];
    onChange?: (data: any) => void;
  };
  selected?: boolean;
}

export default function ClassNode({ id, data, selected }: ClassNodeProps) {
  const [className, setClassName] = useState(data.name || "NuevaClase");
  const [attributes, setAttributes] = useState<Attribute[]>(data.attributes || []);
  const [methods, setMethods] = useState<Method[]>(data.methods || []);

  useEffect(() => {
    if (data.onChange) {
      data.onChange({ id, name: className, attributes, methods });
    }
  }, [className, attributes, methods]);

  const handleAttributeChange = (index: number, key: 'name' | 'type', value: string) => {
    const updated = [...attributes];
    updated[index][key] = value;
    setAttributes(updated);
  };

  const handleMethodChange = (index: number, value: string) => {
    const updated = [...methods];
    updated[index].name = value;
    setMethods(updated);
  };

  const addAttribute = () => {
    const newAttr: Attribute = { 
      id: Date.now(), 
      name: `atributo${attributes.length + 1}`, 
      type: "VARCHAR(255)" 
    };
    setAttributes([...attributes, newAttr]);
  };

  const addMethod = () => {
    const newMethod: Method = { 
      id: Date.now(), 
      name: `metodo${methods.length + 1}()` 
    };
    setMethods([...methods, newMethod]);
  };

  const removeAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const removeMethod = (index: number) => {
    setMethods(methods.filter((_, i) => i !== index));
  };

  return (
    <div 
      className={`uml-node ${selected ? 'selected' : ''}`}
      style={{ 
        background: "#1f1f1f", 
        color: "white", 
        width: 260, 
        borderRadius: 8, 
        border: selected ? "2px solid #667eea" : "2px solid #333",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}
    >
      {/* Handles de conexión */}
      <Handle type="target" position={Position.Top} style={{ background: "#667eea" }} />
      <Handle type="source" position={Position.Bottom} style={{ background: "#667eea" }} />
      
      {/* Nombre de la clase */}
      <input
        value={className}
        onChange={(e) => setClassName(e.target.value)}
        style={{
          width: "100%",
          background: "#2c2c2c",
          border: "none",
          color: "#fff",
          fontWeight: "bold",
          padding: "10px",
          borderRadius: "8px 8px 0 0",
          textAlign: "center",
          fontSize: "15px",
          outline: "none"
        }}
        placeholder="NombreClase"
      />
      
      {/* Sección de atributos */}
      <div style={{ borderTop: "1px solid #444", borderBottom: "1px solid #444", padding: 10 }}>
        <div style={{ fontSize: "10px", opacity: 0.6, marginBottom: 6, fontWeight: "bold", letterSpacing: "0.5px" }}>
          ATRIBUTOS
        </div>
        {attributes.map((attr, i) => (
          <div key={attr.id} style={{ display: "flex", gap: 4, marginBottom: 5 }}>
            <input
              value={attr.name}
              onChange={(e) => handleAttributeChange(i, 'name', e.target.value)}
              style={{ 
                flex: 1, 
                background: "#2a2a2a", 
                border: "1px solid #3a3a3a", 
                color: "#fff", 
                padding: "5px 7px",
                borderRadius: 4,
                fontSize: "12px",
                outline: "none"
              }}
              placeholder="nombre"
            />
            <input
              value={attr.type}
              onChange={(e) => handleAttributeChange(i, 'type', e.target.value)}
              style={{ 
                width: "90px", 
                background: "#2a2a2a", 
                border: "1px solid #3a3a3a", 
                color: "#aaa", 
                padding: "5px 7px",
                borderRadius: 4,
                fontSize: "11px",
                outline: "none"
              }}
              placeholder="tipo"
            />
            <button 
              onClick={() => removeAttribute(i)} 
              style={{ 
                color: "#f66", 
                background: "transparent", 
                border: "none", 
                cursor: "pointer",
                fontSize: "16px",
                padding: "0 4px"
              }}
            >
              ✕
            </button>
          </div>
        ))}
        <button 
          onClick={addAttribute} 
          style={{ 
            width: "100%", 
            background: "#333", 
            border: "1px solid #444", 
            color: "#aaa", 
            padding: "6px",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: "11px",
            marginTop: 6,
            fontWeight: "600"
          }}
        >
          ➕ Atributo
        </button>
      </div>
      
      {/* Sección de métodos */}
      <div style={{ padding: 10 }}>
        <div style={{ fontSize: "10px", opacity: 0.6, marginBottom: 6, fontWeight: "bold", letterSpacing: "0.5px" }}>
          MÉTODOS
        </div>
        {methods.map((method, i) => (
          <div key={method.id} style={{ display: "flex", gap: 4, marginBottom: 5 }}>
            <input
              value={method.name}
              onChange={(e) => handleMethodChange(i, e.target.value)}
              style={{ 
                flex: 1, 
                background: "#2a2a2a", 
                border: "1px solid #3a3a3a", 
                color: "#fff", 
                padding: "5px 7px",
                borderRadius: 4,
                fontSize: "12px",
                outline: "none"
              }}
              placeholder="metodo()"
            />
            <button 
              onClick={() => removeMethod(i)} 
              style={{ 
                color: "#f66", 
                background: "transparent", 
                border: "none", 
                cursor: "pointer",
                fontSize: "16px",
                padding: "0 4px"
              }}
            >
              ✕
            </button>
          </div>
        ))}
        <button 
          onClick={addMethod} 
          style={{ 
            width: "100%", 
            background: "#333", 
            border: "1px solid #444", 
            color: "#aaa", 
            padding: "6px",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: "11px",
            marginTop: 6,
            fontWeight: "600"
          }}
        >
          ➕ Método
        </button>
      </div>
    </div>
  );
}
