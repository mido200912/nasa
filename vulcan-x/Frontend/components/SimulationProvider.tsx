"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createSimulationStore, type SimulationState } from "@/store/useSimulationStore";

const SimulationContext = createContext<ReturnType<typeof createSimulationStore> | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createSimulationStore);
  useEffect(() => { void store.persist.rehydrate(); }, [store]);
  return <SimulationContext.Provider value={store}>{children}</SimulationContext.Provider>;
}

export function useSimulationStore<T>(selector: (state: SimulationState) => T): T {
  const store = useContext(SimulationContext);
  if (!store) throw new Error("SimulationProvider is required.");
  return useStore(store, selector);
}
