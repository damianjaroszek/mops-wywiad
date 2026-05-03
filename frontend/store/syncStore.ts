import { create } from "zustand";

export type SyncStatus = "idle" | "pending" | "syncing" | "synced" | "offline" | "error";

interface SyncState {
  status: SyncStatus;
  markIdle:    () => void;
  markPending: () => void;
  markSyncing: () => void;
  markSynced:  () => void;
  markOffline: () => void;
  markError:   () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status:      "idle",
  markIdle:    () => set({ status: "idle" }),
  markPending: () => set({ status: "pending" }),
  markSyncing: () => set({ status: "syncing" }),
  markSynced:  () => set({ status: "synced" }),
  markOffline: () => set({ status: "offline" }),
  markError:   () => set({ status: "error" }),
}));
