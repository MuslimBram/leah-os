// React hook that subscribes to the global orchestrator singleton.
import { useEffect, useState } from "react";
import { orchestrator } from "./orchestrator";

export function useOrchestrator() {
  const [version, setVersion] = useState(0);
  useEffect(() => orchestrator.subscribe(() => setVersion((v) => v + 1)), []);
  return {
    version,
    executions: orchestrator.listExecutions(),
    getExecution: (id: string) => orchestrator.getExecution(id),
    getTasks: (id: string) => orchestrator.getTasks(id),
  };
}