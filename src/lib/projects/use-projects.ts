import { useEffect, useState } from "react";
import { listArtifacts, listProjects, subscribeProjects } from "./store";

export function useProjects() {
  const [, setVersion] = useState(0);
  useEffect(() => subscribeProjects(() => setVersion((v) => v + 1)), []);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return {
    hydrated,
    projects: hydrated ? listProjects() : [],
    artifacts: (projectId?: string) => (hydrated ? listArtifacts(projectId) : []),
  };
}