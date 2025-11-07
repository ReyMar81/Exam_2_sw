import React, { useState } from "react";
import { api } from "../api";

interface LandingProps {
  onLogin: (user: any) => void;
}

export default function Landing({ onLogin }: LandingProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !name) {
      alert("Por favor, completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/users/login", { email, name });
      onLogin(res.data);
    } catch {
      alert("Error de autenticación");
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
          🧠 Class Diagram Editor
        </h1>
        <p style={{ 
          fontSize: "16px", 
          opacity: 0.8, 
          marginBottom: "32px" 
        }}>
          Diseña, colabora y genera software con IA
        </p>
        
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
              outline: "none"
            }}
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
              outline: "none"
            }}
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
            transition: "all 0.3s"
          }}
        >
          {loading ? "Entrando..." : "Iniciar Sesión / Registrarse"}
        </button>
      </div>
    </div>
  );
}
