import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAppStore } from "../store/useAppStore";

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, setUser, setProject } = useAppStore();
  const [status, setStatus] = useState("🔍 Validando invitación...");
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    const loadInvite = async () => {
      try {
        console.log("🎟️ [AcceptInvite] Loading invitation:", token);
        
        const res = await api.get(`/api/invitations/${token}`);
        const invitation = res.data;
        
        console.log("✅ [AcceptInvite] Invitation found:", invitation);
        setProjectName(invitation.project.name);

        if (!user) {
          // Crear usuario temporal VIEWER y mostrar proyecto
          console.log("�️ [AcceptInvite] No user, entering as guest VIEWER");
          setStatus(`�️ Accediendo al proyecto "${invitation.project.name}" como invitado...`);
          
          const guestUser = {
            id: `guest_${Date.now()}`,
            name: "Invitado",
            email: "guest@temp.com",
          };
          
          setUser(guestUser);
          setProject(invitation.project);
          
          setTimeout(() => {
            navigate(`/project/${invitation.project.id}?fromInvite=${token}`);
          }, 1500);
        } else {
          // Usuario ya autenticado: vincular al proyecto
          console.log("✅ [AcceptInvite] User logged in, accepting invitation");
          setStatus(`📋 Uniéndote al proyecto "${invitation.project.name}"...`);
          
          await api.post("/api/invitations/accept", { 
            token, 
            userId: user.id 
          });
          
          setProject(invitation.project);
          
          setTimeout(() => {
            navigate(`/project/${invitation.project.id}`);
          }, 1500);
        }
      } catch (err: any) {
        console.error("❌ [AcceptInvite] Error:", err);
        if (err.response?.status === 404) {
          setStatus("❌ Invitación no encontrada");
        } else {
          setStatus("❌ Error al procesar la invitación");
        }
      }
    };

    if (token) {
      loadInvite();
    }
  }, [token, user]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1e1e2f, #27293d)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px",
          padding: "40px",
          maxWidth: "500px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "32px", marginBottom: "24px" }}>
          🎟️ Invitación de Proyecto
        </h1>
        
        <div style={{
          fontSize: "18px",
          lineHeight: "1.6",
          opacity: 0.9
        }}>
          {status}
        </div>

        {projectName && (
          <div style={{
            marginTop: "24px",
            padding: "16px",
            background: "rgba(102, 126, 234, 0.1)",
            border: "1px solid rgba(102, 126, 234, 0.3)",
            borderRadius: "8px",
            fontSize: "16px"
          }}>
            <strong>📂 {projectName}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
