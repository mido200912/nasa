import { createStore } from "zustand/vanilla";
import { createJSONStorage, persist } from "zustand/middleware";
import { isEnvironment, isMaterial, normalizeParameters, presets, type EnvironmentId, type MaterialId, type Parameters } from "@/lib/simulation";
import { parseStressTestResult, type StressTestResult } from "@/lib/stress-test";

export interface SimulationState extends Parameters {
  environment: EnvironmentId;
  selectedMaterial: MaterialId;
  earthImpactMode: boolean;
  custom: boolean;
  focusedPlanet: string;
  isSuppressing: boolean;
  flameExtinguished: boolean;
  isLoadingStressTest: boolean;
  stressTestResult: StressTestResult | null;
  stressTestError: string | null;
  suppressionStartedAt: number | null;
  suppressionDurationSeconds: number;
  triggerSuppression: () => void;
  resetIgnition: () => void;
  runStressTest: () => Promise<void>;
  cancelStressTest: () => void;
  setEnvironment: (environment: EnvironmentId) => void;
  setParameter: (key: keyof Parameters, value: number) => void;
  setMaterial: (material: MaterialId) => void;
  setEarthImpactMode: (enabled: boolean) => void;
  inspectPlanet: (id: string) => void;
  reset: () => void;
}

const defaults = { ...presets.lunar, environment: "lunar" as const, selectedMaterial: "cable_insulation" as const, earthImpactMode: false, custom: false, focusedPlanet: "earth" };
const planetIds = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"];

export function createSimulationStore() {
  let suppressionTimer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | null = null;
  let requestVersion = 0;
  const cancelWork = () => { clearTimeout(suppressionTimer); controller?.abort(); controller = null; requestVersion++; };
  const transient = { isSuppressing: false, flameExtinguished: false, isLoadingStressTest: false, stressTestResult: null, stressTestError: null, suppressionStartedAt: null, suppressionDurationSeconds: 4 };
  return createStore<SimulationState>()(persist((set, get) => ({
    ...defaults,
    ...transient,
    triggerSuppression: () => {
      const state = get();
      if (state.isSuppressing || state.flameExtinguished) return;
      const seconds = state.stressTestResult?.suppressionSpec.extinguishTimeSeconds ?? 4;
      set({ isSuppressing: true, suppressionStartedAt: Date.now(), suppressionDurationSeconds: seconds });
      suppressionTimer = setTimeout(() => set({ isSuppressing: false, flameExtinguished: true, suppressionStartedAt: null }), seconds * 1000);
    },
    resetIgnition: () => { clearTimeout(suppressionTimer); set({ isSuppressing: false, flameExtinguished: false, suppressionStartedAt: null }); },
    cancelStressTest: () => { controller?.abort(); controller = null; requestVersion++; set({ isLoadingStressTest: false }); },
    runStressTest: async () => {
      controller?.abort();
      const current = ++requestVersion;
      const pending = new AbortController();
      controller = pending;
      const state = get();
      const payload = { environment: state.environment, oxygenLevel: state.oxygenLevel, pressurePsi: state.pressurePsi, gravityG: state.gravityG, materialId: state.selectedMaterial };
      set({ isLoadingStressTest: true, stressTestError: null });
      const timeout = setTimeout(() => pending.abort(), 10000);
      try {
        const response = await fetch("/api/v1/simulator/stress-test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: pending.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Stress-test unavailable");
        const result = parseStressTestResult(await response.json());
        if (!result) throw new Error("Invalid stress-test output");
        if (current === requestVersion) set({ stressTestResult: result, isLoadingStressTest: false });
      } catch {
        if (current === requestVersion) set({ stressTestResult: null, isLoadingStressTest: false, stressTestError: "Stress-test API unavailable. Local illustration remains active." });
      } finally { clearTimeout(timeout); if (current === requestVersion) controller = null; }
    },
    setEnvironment: (environment) => {
      if (isEnvironment(environment)) { cancelWork(); set({ ...transient, environment, ...presets[environment], custom: false, focusedPlanet: environment === "mars" ? "mars" : "earth" }); }
    },
    setParameter: (key, value) => { cancelWork(); set((state) => ({ ...transient, ...normalizeParameters({ ...state, [key]: value }), custom: true })); },
    setMaterial: (selectedMaterial) => { if (isMaterial(selectedMaterial)) { cancelWork(); set({ ...transient, selectedMaterial }); } },
    setEarthImpactMode: (earthImpactMode) => set({ earthImpactMode: Boolean(earthImpactMode) }),
    inspectPlanet: (focusedPlanet) => {
      if (!planetIds.includes(focusedPlanet)) return;
      if (focusedPlanet === "mars" || focusedPlanet === "earth") cancelWork();
      set(focusedPlanet === "mars" ? { ...transient, focusedPlanet, environment: "mars", ...presets.mars, custom: false } : focusedPlanet === "earth" ? { ...transient, focusedPlanet, environment: "earth", ...presets.earth, custom: false } : { focusedPlanet });
    },
    reset: () => { cancelWork(); set({ ...defaults, ...transient }); },
  }), {
    name: "vulcan-x-scenario-v1",
    storage: createJSONStorage(() => ({
      getItem: (name) => { try { return typeof sessionStorage === "undefined" ? null : sessionStorage.getItem(name); } catch { return null; } },
      setItem: (name, value) => { try { if (typeof sessionStorage !== "undefined") sessionStorage.setItem(name, value); } catch { /* Persistence is optional in private/restricted browsers. */ } },
      removeItem: (name) => { try { if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(name); } catch { /* Keep the in-memory scenario usable. */ } },
    })),
    skipHydration: true,
    partialize: ({ environment, oxygenLevel, pressurePsi, gravityG, selectedMaterial, earthImpactMode, custom, focusedPlanet }) => ({ environment, oxygenLevel, pressurePsi, gravityG, selectedMaterial, earthImpactMode, custom, focusedPlanet }),
    merge: (persisted, current) => {
      if (!persisted || typeof persisted !== "object") return current;
      const saved = persisted as Partial<SimulationState>;
      return {
        ...current,
        ...normalizeParameters({ oxygenLevel: typeof saved.oxygenLevel === "number" ? saved.oxygenLevel : current.oxygenLevel, pressurePsi: typeof saved.pressurePsi === "number" ? saved.pressurePsi : current.pressurePsi, gravityG: typeof saved.gravityG === "number" ? saved.gravityG : current.gravityG }),
        environment: isEnvironment(saved.environment) ? saved.environment : current.environment,
        selectedMaterial: isMaterial(saved.selectedMaterial) ? saved.selectedMaterial : current.selectedMaterial,
        earthImpactMode: saved.earthImpactMode === true,
        custom: saved.custom === true,
        focusedPlanet: typeof saved.focusedPlanet === "string" && planetIds.includes(saved.focusedPlanet) ? saved.focusedPlanet : current.focusedPlanet,
      };
    },
  }));
}
