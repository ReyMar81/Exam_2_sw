import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  user: any;
  project: any;
  setUser: (user: any) => void;
  setProject: (project: any) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      project: null,
      setUser: (user) => {
        console.log("🔐 [Store] Setting user:", user);
        set({ user });
      },
      setProject: (project) => {
        console.log("📁 [Store] Setting project:", project);
        set({ project });
      },
      logout: () => {
        console.log("👋 [Store] Logging out");
        set({ user: null, project: null });
      },
    }),
    { name: "app-storage" } // Persiste en localStorage
  )
);
