import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import { useAppStore } from "./store/useAppStore";

export default function App() {
  const { user, setUser } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log("🔍 [App] user:", user);
    console.log("🔍 [App] location:", location.pathname);
  }, [user, location]);

  useEffect(() => {
    // Si el usuario está autenticado y está en /, redirigir a dashboard
    if (user && location.pathname === "/") {
      console.log("🔄 [App] User authenticated, redirecting to dashboard");
      navigate("/dashboard");
    }
  }, [user, location]);

  if (!user) {
    console.log("🔄 [App] Rendering Landing (no user)");
    return <Landing onLogin={setUser} />;
  }

  console.log("✅ [App] Rendering Dashboard");
  return <Dashboard user={user} />;
}
