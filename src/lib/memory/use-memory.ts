import { useEffect, useState } from "react";
import { memoryService, subscribeMemory } from "./memory-service";
import { contextService, subscribeContext } from "./context-service";
import type { MemoryRecord } from "./types";

export function useMemoryRecords() {
  const [records, setRecords] = useState<MemoryRecord[]>([]);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    memoryService.list().then((r) => { if (!cancelled) setRecords(r); });
    const unsub = subscribeMemory(() => {
      memoryService.list().then((r) => { if (!cancelled) setRecords(r); });
      setVersion((v) => v + 1);
    });
    return () => { cancelled = true; unsub(); };
  }, []);
  return { records, version };
}

export function useContextEntries() {
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeContext(() => setVersion((v) => v + 1)), []);
  return { version, entries: contextService.list() };
}