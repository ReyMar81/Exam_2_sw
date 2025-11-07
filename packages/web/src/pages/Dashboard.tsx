import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAppStore } from "../store/useAppStore";
import { disconnectSocket } from "../socketManager";

interface DashboardProps {
  user: any;
}

export default function Dashboard({ user }: DashboardProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteProject, setInviteProject] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState("");
  const [joinLink, setJoinLink] = useState("");
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const { setProject, logout } = useAppStore();

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
      alert("Ingresa un nombre para el proyecto");
      return;
    }

    try {
      const res = await api.post("/api/projects", { name, userId: user.id });
      setProjects([...projects, res.data]);
      setName("");
    } catch (err) {
      console.error("Failed to create project:", err);
      alert("Error al crear proyecto");
    }
  };

  const createInvitation = async (projectId: string) => {
    try {
      const res = await api.post("/api/invitations/create", {
        projectId,
        role: "EDITOR",
      });
      setInviteLink(res.data.url);
      setInviteProject(projectId);
      console.log("✉️ [Dashboard] Universal invitation created:", res.data.url);
    } catch (err: any) {
      console.error("Failed to create invitation:", err);
      const errorMsg = err.response?.data?.error || "Error al crear invitación";
      alert(errorMsg);
    }
  };

  const openProject = (p: any) => {
    console.log("📂 [Dashboard] Opening project:", p.name);
    setProject(p);
    navigate(`/project/${p.id}`);
  };

  const joinByLink = () => {
    if (!joinLink) {
      alert("Ingresa un enlace de invitación");
      return;
    }

    // Extract token from link
    const tokenMatch = joinLink.match(/\/invite\/([a-f0-9]+)/);
    if (!tokenMatch) {
      alert("Enlace inválido. Debe ser: http://localhost:3001/invite/TOKEN");
      return;
    }

    const token = tokenMatch[1];
    console.log("🔗 [Dashboard] Navigating to invitation:", token);
    navigate(`/invite/${token}`);
  };

  const handleLogout = () => {
    console.log("🔒 [Dashboard] Logging out");
    disconnectSocket();
    logout();
    navigate("/");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1e1e2f, #27293d)",
      color: "#fff",
      padding: "40px"
    }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "32px", marginBottom: "8px" }}>
              👋 Bienvenido, {user.name}
            </h1>
            <p style={{ opacity: 0.7 }}>{user.email}</p>
          </div>
          
          <button
            onClick={handleLogout}
            style={{
              padding: "10px 20px",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "600",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "#c82333"}
            onMouseOut={(e) => e.currentTarget.style.background = "#dc3545"}
          >
            🔒 Cerrar sesión
          </button>
        </div>

        {loading ? (
          <p>Cargando proyectos...</p>
        ) : (
          <>
            <div style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>
                📂 Mis Proyectos
              </h2>
              
              {projects.length === 0 ? (
                <div style={{
                  padding: "60px",
                  textAlign: "center",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "12px",
                  border: "2px dashed rgba(255,255,255,0.2)"
                }}>
                  <p style={{ fontSize: "18px", opacity: 0.7 }}>
                    No tienes proyectos aún. Crea uno para comenzar.
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "16px" }}>
                  {projects.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        padding: "20px",
                        borderRadius: "12px",
                        transition: "all 0.2s"
                      }}
                    >
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "12px"
                      }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ fontSize: "20px", marginBottom: "4px" }}>
                            {p.name}
                          </h3>
                          <p style={{ fontSize: "14px", opacity: 0.6 }}>
                            {p.users?.length || 0} miembro(s) · {p.diagrams?.length || 0} diagrama(s)
                          </p>
                        </div>
                        
                        <button
                          onClick={() => openProject(p)}
                          style={{
                            padding: "10px 24px",
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: "600"
                          }}
                        >
                          Abrir →
                        </button>
                      </div>

                      {/* Invite section */}
                      <div style={{
                        marginTop: "16px",
                        paddingTop: "16px",
                        borderTop: "1px solid rgba(255,255,255,0.1)"
                      }}>
                        <button
                          onClick={() => createInvitation(p.id)}
                          style={{
                            width: "100%",
                            padding: "10px 16px",
                            background: "rgba(102, 126, 234, 0.3)",
                            border: "1px solid rgba(102, 126, 234, 0.5)",
                            color: "#fff",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: "600"
                          }}
                        >
                          🔗 Generar Link de Invitación
                        </button>
                        
                        {inviteProject === p.id && inviteLink && (
                          <div style={{
                            marginTop: "12px",
                            padding: "12px",
                            background: "rgba(76, 175, 80, 0.1)",
                            border: "1px solid rgba(76, 175, 80, 0.3)",
                            borderRadius: "6px",
                            fontSize: "13px"
                          }}>
                            <div style={{ marginBottom: "8px", opacity: 0.8, fontWeight: "bold" }}>
                              ✅ Link universal generado:
                            </div>
                            <code style={{
                              display: "block",
                              padding: "8px",
                              background: "rgba(0,0,0,0.3)",
                              borderRadius: "4px",
                              wordBreak: "break-all",
                              color: "#4CAF50"
                            }}>
                              {inviteLink}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create new project */}
            <div style={{
              padding: "24px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)"
            }}>
              <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>
                ➕ Crear Nuevo Proyecto
              </h3>
              <div style={{ display: "flex", gap: "12px" }}>
                <input
                  type="text"
                  placeholder="Nombre del proyecto"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && createProject()}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "rgba(255,255,255,0.05)",
                    color: "#fff",
                    fontSize: "15px"
                  }}
                />
                <button
                  onClick={createProject}
                  style={{
                    padding: "12px 32px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "15px",
                    fontWeight: "600"
                  }}
                >
                  Crear
                </button>
              </div>
            </div>

            {/* Join by invitation link */}
            <div style={{
              padding: "24px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
              marginTop: "16px"
            }}>
              <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>
                🔗 Unirse con Enlace de Invitación
              </h3>
              <div style={{ display: "flex", gap: "12px" }}>
                <input
                  type="text"
                  placeholder="http://localhost:3001/invite/XXXXXXXXXX"
                  value={joinLink}
                  onChange={(e) => setJoinLink(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && joinByLink()}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "rgba(255,255,255,0.05)",
                    color: "#fff",
                    fontSize: "15px"
                  }}
                />
                <button
                  onClick={joinByLink}
                  style={{
                    padding: "12px 32px",
                    background: "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "15px",
                    fontWeight: "600"
                  }}
                >
                  Unirme
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
