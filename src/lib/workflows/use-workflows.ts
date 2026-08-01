import { useEffect, useState } from "react";
import { listWorkflowRuns, subscribeWorkflowRuns } from "./engine";
import { listWorkflows, subscribeWorkflows } from "./store";

export function useWorkflows() {
  const [, setV] = useState(0);
  useEffect(() => {
    const bump = () => setV((v) => v + 1);
    const offA = subscribeWorkflows(bump);
    const offB = subscribeWorkflowRuns(bump);
    return () => { offA(); offB(); };
  }, []);
  return { workflows: listWorkflows(), runs: listWorkflowRuns() };
}