import React, { useEffect, useState } from "react";
import { api } from "../api";

interface ProjectSelectorProps {
  user: any;
  onSelect: (project: any) => void;
}

export default function ProjectSelector({ user, onSelect }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [user]);

  const loadProjects = async () => {
    try {
      const res = await api.get(`/api/projects/${user.id}`);
      setProjects(res.data);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!name) {
      alert("Por favor, ingresa un nombre para el proyecto");
      return;
    }

    setCreating(true);
    try {
      const res = await api.post("/api/projects", { name, userId: user.id });
      setProjects([...projects, res.data]);
      setName("");
    } catch (err) {
      console.error("Failed to create project:", err);
      alert("Error al crear proyecto");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      background: "#1a1a1a"
    }}>
      <div style={{
        background: "#2a2a2a",
        padding: "40px",
        borderRadius: "8px",
        width: "600px",
        color: "white"
      }}>
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ margin: 0 }}>📂 Selecciona un proyecto</h2>
          <p style={{ margin: "8px 0 0 0", opacity: 0.7 }}>
            Hola, <strong>{user.name}</strong> ({user.email})
          </p>
        </div>

        {loading ? (
          <p>Cargando proyectos...</p>
        ) : (
          <>
            {projects.length === 0 ? (
              <div style={{
                padding: "40px",
                textAlign: "center",
                background: "#333",
                borderRadius: "4px",
                marginBottom: "24px",
                opacity: 0.7
              }}>
                No tienes proyectos. Crea uno para comenzar.
              </div>
            ) : (
              <div style={{ marginBottom: "24px" }}>
                {projects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => onSelect(p)}
                    style={{
                      padding: "16px",
                      background: "#333",
                      borderRadius: "4px",
                      marginBottom: "8px",
                      cursor: "pointer",
                      border: "1px solid #444",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#3a3a3a";
                      e.currentTarget.style.borderColor = "#4CAF50";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#333";
                      e.currentTarget.style.borderColor = "#444";
                    }}
                  >
                    <div style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "4px" }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: "12px", opacity: 0.6 }}>
                      {p.users?.length || 0} miembro(s) · {p.diagrams?.length || 0} diagrama(s)
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ 
              borderTop: "1px solid #444", 
              paddingTop: "24px",
              marginTop: "24px"
            }}>
              <h3 style={{ marginBottom: "16px", fontSize: "16px" }}>
                ➕ Crear nuevo proyecto
              </h3>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  placeholder="Nombre del proyecto"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && createProject()}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "4px",
                    border: "1px solid #444",
                    background: "#333",
                    color: "white",
                    fontSize: "14px"
                  }}
                />
                <button
                  onClick={createProject}
                  disabled={creating}
                  style={{
                    padding: "12px 24px",
                    background: "#4CAF50",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: creating ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "bold",
                    opacity: creating ? 0.6 : 1
                  }}
                >
                  {creating ? "..." : "Crear"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
