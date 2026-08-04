import { useEffect, useState } from "react";
import { getActiveTeam, listSkills, subscribeSkills } from "./store";

export function useSkills() {
  const [, setVersion] = useState(0);
  useEffect(() => subscribeSkills(() => setVersion((v) => v + 1)), []);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return {
    hydrated,
    skills: hydrated ? listSkills() : [],
    activeTeam: hydrated ? getActiveTeam() : null,
  };
}