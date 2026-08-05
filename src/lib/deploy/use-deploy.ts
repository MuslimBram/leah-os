import { useSyncExternalStore } from "react";
import { listDeployments, subscribeDeployments } from "./store";

export function useDeployments() {
  return useSyncExternalStore(
    subscribeDeployments,
    () => listDeployments(),
    () => [],
  );
}