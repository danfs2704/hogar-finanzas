import { create } from 'zustand';
import type { ViewMode, User } from '@/types';

interface AppState {
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  setCurrentView: (view) => set({ currentView: view }),
  user: null,
  setUser: (user) => set({ user }),
  refreshKey: 0,
  triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
