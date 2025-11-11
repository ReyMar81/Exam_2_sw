// 🧠 AI Integration - Prompt Bar Component (Compact ChatGPT-style)
import React, { useState, useEffect, useRef } from "react";
import { api } from "../api";

interface AIPromptBarProps {
  projectId: string;
  userId: string;
  onActionsReceived: (actions: any[]) => void;
  disabled?: boolean;
}

// Declaración de tipos para Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
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
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verificar soporte de Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.lang = "es-ES";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log("🎤 [Voice] Transcribed:", transcript);
        setPrompt(transcript);
        setIsRecording(false);
      };

      recognition.onerror = (event: any) => {
        console.error("❌ [Voice] Error:", event.error);
        setError(`Error de reconocimiento de voz: ${event.error}`);
        setIsRecording(false);
        setTimeout(() => setError(null), 3000);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) return;

    if (trimmedPrompt.length > 500) {
      setError("Prompt demasiado largo (máximo 500 caracteres)");
      setTimeout(() => setError(null), 3000);
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
        setTimeout(() => setError(null), 5000);
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

  const handleMicClick = () => {
    if (!speechSupported) {
      setError("Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (isRecording) {
      // Detener grabación
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      // Iniciar grabación
      setError(null);
      setIsRecording(true);
      try {
        recognitionRef.current?.start();
        console.log("🎤 [Voice] Recording started...");
      } catch (err) {
        console.error("❌ [Voice] Failed to start:", err);
        setIsRecording(false);
      }
    }
  };

  /**
   * Función auxiliar para redimensionar y comprimir imagen
   */
  const resizeAndCompressImage = (
    file: File,
    maxSize = 1200,
    quality = 0.8
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      reader.onerror = () => {
        reject(new Error("Error al leer el archivo"));
      };

      img.onload = () => {
        try {
          // Calcular escala manteniendo proporción
          const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
          const canvas = document.createElement("canvas");
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("No se pudo obtener contexto del canvas"));
            return;
          }

          // Dibujar imagen redimensionada
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Convertir a JPEG con calidad 0.8
          const compressed = canvas.toDataURL("image/jpeg", quality);

          // Extraer solo el Base64 (sin el prefijo data:image/jpeg;base64,)
          const base64 = compressed.split(",")[1];

          console.log(
            `📷 [Image] Resized to ${canvas.width}x${canvas.height}, size: ${Math.round(
              base64.length / 1024
            )}KB`
          );

          resolve(base64);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error("Error al cargar la imagen"));
      };

      reader.readAsDataURL(file);
    });
  };

  /**
   * Manejar selección de archivo de imagen
   */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      setError("Por favor selecciona un archivo de imagen válido");
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Validar tamaño (máximo 10MB antes de comprimir)
    if (file.size > 10 * 1024 * 1024) {
      setError("La imagen es muy grande. Tamaño máximo: 10MB");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("📷 [Image] Processing image:", file.name);

      // Redimensionar y comprimir imagen
      const imageBase64 = await resizeAndCompressImage(file, 1200, 0.8);

      console.log("🧠 [AIPromptBar] Sending image to AI...");

      // Enviar imagen al backend
      const response = await api.post("/api/ai/parse-image", {
        imageBase64,
        projectId,
        userId,
      });

      const { actions, metadata } = response.data;

      console.log(
        `✅ [AIPromptBar] Received ${actions.length} action(s) from image analysis:`,
        actions
      );
      console.log("📊 [AIPromptBar] Metadata:", metadata);

      if (actions.length === 0) {
        setError(
          "No se detectaron tablas o relaciones en la imagen. Intenta con otra imagen más clara."
        );
        setTimeout(() => setError(null), 5000);
        return;
      }

      // Enviar acciones al componente padre (DiagramEditor)
      onActionsReceived(actions);

      // Limpiar input de archivo
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      console.error("❌ [AIPromptBar] Image processing error:", err);

      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.details ||
        "Error al analizar la imagen. Intenta con otra imagen.";

      setError(errorMessage);

      // Auto-limpiar error después de 5 segundos
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Abrir selector de archivos
   */
  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      {/* Barra compacta tipo ChatGPT */}
      <div
        style={{
          position: "fixed",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(800px, 92%)",
          maxWidth: 800,
          zIndex: 1000,
        }}
      >
        {/* Mensaje de error discreto encima */}
        {error && (
          <div
            style={{
              marginBottom: 8,
              padding: "8px 16px",
              background: "rgba(220, 38, 38, 0.95)",
              borderRadius: 8,
              color: "#fff",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Barra principal */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "#1c1c1c",
            borderRadius: 24,
            padding: "8px 12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            border: "1px solid #333",
            gap: 8,
          }}
        >
          {/* Input principal */}
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isRecording
                ? "🎤 Escuchando..."
                : 'Ej: "Crea tabla cliente con id, nombre, email..."'
            }
            disabled={loading || disabled || isRecording}
            maxLength={500}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#fff",
              fontSize: 14,
              padding: "8px 12px",
            }}
          />

          {/* Contador de caracteres */}
          <span
            style={{
              fontSize: 11,
              color: prompt.length > 450 ? "#ef4444" : "#666",
              whiteSpace: "nowrap",
            }}
          >
            {prompt.length}/500
          </span>

          {/* Input oculto para archivos de imagen */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: "none" }}
          />

          {/* Botón de cámara/imagen */}
          <button
            type="button"
            onClick={handleCameraClick}
            disabled={loading || disabled}
            style={{
              background: "transparent",
              border: "none",
              cursor: loading || disabled ? "not-allowed" : "pointer",
              fontSize: 20,
              padding: "4px 8px",
              transition: "all 0.2s",
              opacity: loading || disabled ? 0.3 : 1,
            }}
            title="Analizar imagen de diagrama"
          >
            📷
          </button>

          {/* Botón de micrófono (solo si está soportado) */}
          {speechSupported && (
            <button
              type="button"
              onClick={handleMicClick}
              disabled={loading || disabled}
              style={{
                background: "transparent",
                border: "none",
                cursor: loading || disabled ? "not-allowed" : "pointer",
                fontSize: 20,
                padding: "4px 8px",
                transition: "all 0.2s",
                opacity: loading || disabled ? 0.3 : 1,
              }}
              title={isRecording ? "Detener grabación" : "Grabar con voz"}
            >
              {isRecording ? "🔴" : "🎤"}
            </button>
          )}

          {/* Botón de enviar */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || disabled || !prompt.trim() || isRecording}
            style={{
              background:
                loading || disabled || !prompt.trim() || isRecording
                  ? "#333"
                  : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 16,
              padding: "8px 20px",
              cursor:
                loading || disabled || !prompt.trim() || isRecording
                  ? "not-allowed"
                  : "pointer",
              fontSize: 14,
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
            title="Enviar prompt (Enter)"
          >
            {loading ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "spin 0.6s linear infinite",
                  }}
                />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>Generar</span>
              </>
            )}
          </button>
        </div>

        {/* Ayuda rápida (solo cuando está vacío) */}
        {!loading && !error && prompt.length === 0 && !isRecording && (
          <div
            style={{
              marginTop: 8,
              padding: "6px 16px",
              background: "rgba(0,0,0,0.7)",
              borderRadius: 8,
              color: "#aaa",
              fontSize: 11,
              textAlign: "center",
            }}
          >
            💡 Presiona{" "}
            <kbd
              style={{
                background: "#333",
                padding: "2px 6px",
                borderRadius: 4,
                fontFamily: "monospace",
              }}
            >
              Enter
            </kbd>{" "}
            para enviar
            {speechSupported && (
              <>
                {" "}
                o{" "}
                <kbd
                  style={{
                    background: "#333",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  🎤
                </kbd>{" "}
                para dictar
              </>
            )}
          </div>
        )}
      </div>

      {/* Keyframe animation para spinner */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </>
  );
}
