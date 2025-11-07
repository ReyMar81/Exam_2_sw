import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAppStore } from "../store/useAppStore";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, setProject } = useAppStore();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    
    if (!email || !name) {
      setError("Por favor, completa todos los campos");
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Por favor, ingresa un email válido");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/users/login", { email, name });
      const loggedUser = res.data;
      setUser(loggedUser);
      
      // Verificar si viene de una invitación (parámetro fromInvite en URL)
      const inviteToken = searchParams.get("fromInvite");
      if (inviteToken) {
        console.log("🎟️ [Login] Vinculando usuario a proyecto desde invitación:", inviteToken);
        
        try {
          // Vincular usuario al proyecto
          await api.post("/api/invitations/accept", { 
            token: inviteToken, 
            userId: loggedUser.id 
          });
          
          // Obtener datos del proyecto
          const inviteRes = await api.get(`/api/invitations/${inviteToken}`);
          const project = inviteRes.data.project;
          
          setProject(project);
          navigate(`/project/${project.id}`);
          return;
        } catch (err) {
          console.error("❌ [Login] Error vinculando invitación:", err);
          setError("Error al vincular con el proyecto");
          setLoading(false);
          return;
        }
      }
      
      // Verificar si hay una URL de retorno guardada
      const returnUrl = sessionStorage.getItem("returnUrl");
      if (returnUrl) {
        sessionStorage.removeItem("returnUrl");
        navigate(returnUrl);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError("Error al iniciar sesión. Por favor, intenta de nuevo.");
    } finally {
      setLoading(false);
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
        width: "400px",
        color: "white"
      }}>
        <h2 style={{ marginBottom: "24px" }}>🔐 Iniciar sesión</h2>
        
        {error && (
          <div style={{
            background: "rgba(244, 67, 54, 0.1)",
            border: "1px solid rgba(244, 67, 54, 0.3)",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "16px",
            fontSize: "14px",
            color: "#ff6b6b"
          }}>
            ⚠️ {error}
          </div>
        )}
        
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px", opacity: 0.8 }}>
            Email
          </label>
          <input 
            type="email"
            placeholder="tu@email.com" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "4px",
              border: "1px solid #444",
              background: "#333",
              color: "white",
              fontSize: "14px"
            }}
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", opacity: 0.8 }}>
            Nombre
          </label>
          <input 
            type="text"
            placeholder="Tu nombre" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "4px",
              border: "1px solid #444",
              background: "#333",
              color: "white",
              fontSize: "14px"
            }}
          />
        </div>

        <button 
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "16px",
            fontWeight: "bold",
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? "Ingresando..." : "Entrar"}
        </button>
      </div>
    </div>
  );
}
