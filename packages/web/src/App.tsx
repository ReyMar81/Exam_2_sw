import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import { useAppStore } from "./store/useAppStore";

export default function App() {
  const { user } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log("🔍 [App] user:", user);
    console.log("🔍 [App] location:", location.pathname);
  }, [user, location]);

  useEffect(() => {
    // Si no hay usuario autenticado, redirigir a login
    if (!user && location.pathname !== "/login" && !location.pathname.startsWith("/invite/")) {
      console.log("🔄 [App] No user, redirecting to login");
      navigate("/login");
      return;
    }
    
    // Si el usuario está autenticado y está en /, redirigir a dashboard
    if (user && location.pathname === "/") {
      console.log("🔄 [App] User authenticated, redirecting to dashboard");
      navigate("/dashboard");
    }
  }, [user, location, navigate]);

  if (!user) {
    console.log("⏳ [App] Waiting for authentication...");
    return null; // Evitar render mientras redirige
  }

  console.log("✅ [App] Rendering Dashboard");
  return <Dashboard user={user} />;
}
