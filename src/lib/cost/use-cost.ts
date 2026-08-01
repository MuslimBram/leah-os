import { useEffect, useState } from "react";
import { listUsage, subscribeUsage, usageSummary } from "./telemetry";
import { getCostPolicy, subscribePolicy } from "./policy";

export function useCost() {
  const [, setV] = useState(0);
  useEffect(() => {
    const bump = () => setV((v) => v + 1);
    const offA = subscribeUsage(bump);
    const offB = subscribePolicy(bump);
    return () => { offA(); offB(); };
  }, []);
  return { usage: listUsage(), summary: usageSummary(), policy: getCostPolicy() };
}