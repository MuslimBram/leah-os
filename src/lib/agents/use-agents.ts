import { useEffect, useState } from "react";
import { listAgentMessages, subscribeAgentBus } from "./bus";
import { listAgents, subscribeAgents } from "./registry";
import { agentLoad, listSubtasks, subscribeSwarm } from "./swarm";

function useTicker(subscribe: (fn: () => void) => () => void) {
  const [version, setVersion] = useState(0);
  useEffect(() => subscribe(() => setVersion((v) => v + 1)), [subscribe]);
  return version;
}

export function useAgents() {
  const v1 = useTicker(subscribeAgents);
  const v2 = useTicker(subscribeSwarm);
  return {
    version: v1 + v2,
    agents: listAgents(),
    load: (id: string) => agentLoad(id),
    subtasks: listSubtasks(),
  };
}

export function useAgentMessages(executionId?: string) {
  const version = useTicker(subscribeAgentBus);
  return { version, messages: listAgentMessages(executionId) };
}