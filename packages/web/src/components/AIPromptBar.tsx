// 🧠 AI Integration - Prompt Bar Component
import React, { useState } from "react";
import { api } from "../api";

interface AIPromptBarProps {
  projectId: string;
  userId: string;
  onActionsReceived: (actions: any[]) => void;
  disabled?: boolean;
}

export function AIPromptBar({
  projectId,
  userId,
  onActionsReceived,
  disabled = false,
}: AIPromptBarProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) return;

    if (trimmedPrompt.length > 500) {
      setError("Prompt demasiado largo (máximo 500 caracteres)");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("🧠 [AIPromptBar] Sending prompt to AI:", trimmedPrompt);

      const response = await api.post("/api/ai/parse-intent", {
        prompt: trimmedPrompt,
        projectId,
        userId,
      });

      const { actions, metadata } = response.data;

      console.log(
        `✅ [AIPromptBar] Received ${actions.length} action(s) from AI:`,
        actions
      );
      console.log("📊 [AIPromptBar] Metadata:", metadata);

      if (actions.length === 0) {
        setError("La IA no generó acciones válidas. Intenta reformular el prompt.");
        return;
      }

      // Enviar acciones al componente padre (DiagramEditor)
      onActionsReceived(actions);

      // Limpiar input después de éxito
      setPrompt("");
    } catch (err: any) {
      console.error("❌ [AIPromptBar] Error:", err);

      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.details ||
        "Error al procesar el prompt. Intenta de nuevo.";

      setError(errorMessage);

      // Auto-limpiar error después de 5 segundos
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enviar con Enter (sin Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(700px, 90%)",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderRadius: 16,
        padding: "16px 20px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        zIndex: 1000,
        backdropFilter: "blur(10px)",
      }}
    >
      {/* Header con icono */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          color: "#fff",
        }}
      >
        <span style={{ fontSize: 20 }}>🤖</span>
        <span style={{ fontWeight: "bold", fontSize: 14 }}>
          Asistente de IA
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            opacity: 0.7,
            fontStyle: "italic",
          }}
        >
          GPT-4o-mini
        </span>
      </div>

      {/* Form de input */}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10 }}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Ej: "Crea tabla cliente con id, nombre, email y relación 1 a muchos con pedido"'
          disabled={loading || disabled}
          maxLength={500}
          style={{
            flex: 1,
            padding: "12px 16px",
            border: "none",
            borderRadius: 10,
            fontSize: 14,
            outline: "none",
            background: "rgba(255,255,255,0.95)",
            color: "#333",
            transition: "all 0.2s",
          }}
        />
        <button
          type="submit"
          disabled={loading || disabled || !prompt.trim()}
          style={{
            padding: "12px 24px",
            background: loading || disabled
              ? "rgba(255,255,255,0.3)"
              : "#fff",
            color: loading || disabled ? "#aaa" : "#667eea",
            border: "none",
            borderRadius: 10,
            fontWeight: "bold",
            cursor:
              loading || disabled || !prompt.trim()
                ? "not-allowed"
                : "pointer",
            fontSize: 14,
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {loading ? (
            <>
              <span
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 12,
                  border: "2px solid #aaa",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              Procesando...
            </>
          ) : (
            <>
              <span>✨</span> Generar
            </>
          )}
        </button>
      </form>

      {/* Contador de caracteres */}
      <div
        style={{
          marginTop: 8,
          fontSize: 11,
          color: "rgba(255,255,255,0.7)",
          textAlign: "right",
        }}
      >
        {prompt.length}/500 caracteres
      </div>

      {/* Mensaje de error */}
      {error && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            background: "rgba(255, 59, 48, 0.2)",
            borderRadius: 8,
            color: "#fff",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid rgba(255, 59, 48, 0.4)",
          }}
        >
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Sugerencias */}
      {!loading && !error && prompt.length === 0 && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            background: "rgba(255,255,255,0.1)",
            borderRadius: 8,
            color: "rgba(255,255,255,0.8)",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: 4 }}>
            💡 Ejemplos de prompts:
          </div>
          <div style={{ opacity: 0.9 }}>
            • "Crea tabla usuario con id, email, nombre"
            <br />
            • "Relación 1 a muchos entre cliente y pedido"
            <br />
            • "Producto y categoría muchos a muchos"
            <br />• "Agrega campo telefono VARCHAR(20) a tabla usuario"
          </div>
        </div>
      )}

      {/* Keyframe animation para spinner */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
