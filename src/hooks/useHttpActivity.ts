// src/hooks/useHttpActivity.ts
import { useSyncExternalStore } from "react";
import { subscribeHttpActivity, getHttpActivitySnapshot } from "@/lib/axios";

/** True while any request is in flight on the shared apiClient (raw calls and react-query alike). */
export function useHttpActivity(): boolean {
  return useSyncExternalStore(subscribeHttpActivity, getHttpActivitySnapshot, () => false);
}
