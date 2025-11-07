import { create } from "zustand";

interface User {
  id: string;
  userId: string;
  diagramId: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

interface Lock {
  id: string;
  diagramId: string;
  resourceId: string;
  userId: string;
  acquiredAt: string;
  expiresAt: string;
}

interface DiagramStore {
  nodes: any[];
  edges: any[];
  users: User[];
  locks: Lock[];
  setNodes: (nodes: any[]) => void;
  setEdges: (edges: any[]) => void;
  setUsers: (users: User[]) => void;
  setLocks: (locks: Lock[] | ((prev: Lock[]) => Lock[])) => void;
}

export const useDiagramStore = create<DiagramStore>((set) => ({
  nodes: [],
  edges: [],
  users: [],
  locks: [],
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setUsers: (users) => set({ users }),
  setLocks: (locks) => 
    set((state) => ({
      locks: typeof locks === 'function' ? locks(state.locks) : locks
    })),
}));
