import { useEffect, useRef, useCallback } from "react";
import NetInfo from "@react-native-community/netinfo";
import { useInterviewStore } from "@/store/interviewStore";
import { useSyncStore } from "@/store/syncStore";
import { saveDraft } from "@/services/api";

const DEBOUNCE_MS   = 3000;
const SYNCED_HIDE_MS = 3000;

function isNetworkError(e: any): boolean {
  const msg = String(e?.message ?? "").toLowerCase();
  return (
    msg.includes("network")       ||
    msg.includes("połączenia")    ||
    msg.includes("timeout")       ||
    msg.includes("econnaborted")  ||
    e?.code === "ECONNABORTED"
  );
}

export function useOfflineSync(): void {
  const debounceTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef     = useRef(false);
  const syncingRef     = useRef(false);
  const prevFormData   = useRef(useInterviewStore.getState().formData);

  const doSync = useCallback(async () => {
    if (syncingRef.current) return;

    const { formData, interviewId } = useInterviewStore.getState();

    // Only PATCH existing interviews. POSTing a new one with partial/empty fields
    // causes Pydantic 422 errors (empty strings on regex-validated Optional fields).
    // The initial creation is an explicit user action (summary "Zapisz" / "Generuj").
    if (!interviewId) return;

    syncingRef.current = true;
    useSyncStore.getState().markSyncing();

    try {
      await saveDraft(formData, interviewId);

      pendingRef.current = false;
      useSyncStore.getState().markSynced();

      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        if (useSyncStore.getState().status === "synced") {
          useSyncStore.getState().markIdle();
        }
      }, SYNCED_HIDE_MS);
    } catch (e: any) {
      pendingRef.current = true;
      useSyncStore.getState()[isNetworkError(e) ? "markOffline" : "markError"]();
    } finally {
      syncingRef.current = false;
    }
  }, []);

  // Watch formData for changes and debounce the save
  useEffect(() => {
    const unsubscribe = useInterviewStore.subscribe((state) => {
      if (state.formData === prevFormData.current) return;
      prevFormData.current = state.formData;

      pendingRef.current = true;
      useSyncStore.getState().markPending();

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(doSync, DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [doSync]);

  // Retry immediately when the device comes back online
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState) => {
      if (netState.isConnected && pendingRef.current && !syncingRef.current) {
        doSync();
      }
    });
    return unsubscribe;
  }, [doSync]);
}
