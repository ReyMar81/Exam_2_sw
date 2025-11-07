import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Obtiene o crea la instancia del socket
 * Solo se conecta si hay un usuario autenticado
 */
export function getSocket(user?: any): Socket | null {
  if (!socket && user) {
    console.log("🔌 [SocketManager] Creating new socket connection for user:", user.id);
    
    socket = io("http://localhost:3001", {
      transports: ["websocket"],
      auth: {
        userId: user.id,
        name: user.name,
      },
    });

    socket.on("connect", () => {
      console.log("✅ [SocketManager] Socket connected:", socket?.id);
    });

    socket.on("disconnect", () => {
      console.log("❌ [SocketManager] Socket disconnected");
    });

    socket.on("error", (error) => {
      console.error("🚨 [SocketManager] Socket error:", error);
    });
  }
  
  return socket;
}

/**
 * Desconecta y limpia la instancia del socket
 * Debe llamarse al hacer logout o salir del editor
 */
export function disconnectSocket() {
  if (socket) {
    console.log("🔌 [SocketManager] Disconnecting socket");
    socket.disconnect();
    socket = null;
  }
}

/**
 * Verifica si el socket está conectado
 */
export function isSocketConnected(): boolean {
  return socket?.connected || false;
}
