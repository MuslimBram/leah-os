import { useEffect, useState } from "react";
import { listAudit, subscribeAudit } from "./audit";
import { currentPrincipal, subscribePrincipal } from "./rbac";
import { listSecrets, subscribeVault } from "./vault";
import { getRateLimit } from "./guard";

export function useSecurity() {
  const [, setV] = useState(0);
  useEffect(() => {
    const bump = () => setV((v) => v + 1);
    const offA = subscribeAudit(bump);
    const offB = subscribeVault(bump);
    const offC = subscribePrincipal(bump);
    return () => { offA(); offB(); offC(); };
  }, []);
  return {
    principal: currentPrincipal(),
    secrets: listSecrets(),
    entries: listAudit(),
    rateLimit: getRateLimit(),
  };
}