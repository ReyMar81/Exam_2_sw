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
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      background: "linear-gradient(135deg, #1e1e2f, #27293d)",
      color: "#fff",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <div style={{
        textAlign: "center",
        maxWidth: "400px",
        padding: "40px",
        background: "rgba(255,255,255,0.05)",
        borderRadius: "16px",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.1)"
      }}>
        <h1 style={{ 
          fontSize: "42px", 
          marginBottom: "8px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          🧠 Diagramador ER Colaborativo
        </h1>
        <p style={{ 
          fontSize: "16px", 
          opacity: 0.8, 
          marginBottom: "32px" 
        }}>
          Diseña, colabora y genera SQL con IA
        </p>
        
        {error && (
          <div style={{
            background: "rgba(244, 67, 54, 0.15)",
            border: "1px solid rgba(244, 67, 54, 0.4)",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "20px",
            fontSize: "14px",
            color: "#ff6b6b",
            textAlign: "left"
          }}>
            ⚠️ {error}
          </div>
        )}
        
        <div style={{ marginBottom: "16px" }}>
          <input 
            type="email"
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              color: "#fff",
              fontSize: "15px",
              outline: "none",
              transition: "all 0.3s"
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.6)"}
            onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"}
          />
        </div>
        
        <div style={{ marginBottom: "24px" }}>
          <input 
            type="text"
            placeholder="Nombre completo" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              color: "#fff",
              fontSize: "15px",
              outline: "none",
              transition: "all 0.3s"
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.6)"}
            onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"}
          />
        </div>
        
        <button 
          onClick={handleLogin} 
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            background: loading ? "#555" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.3s",
            opacity: loading ? 0.6 : 1
          }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = "translateY(0)")}
        >
          {loading ? "Entrando..." : "Iniciar Sesión / Registrarse"}
        </button>
      </div>
    </div>
  );
}
