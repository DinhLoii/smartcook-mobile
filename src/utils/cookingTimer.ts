export type CookingTimerStatus = "ready" | "running" | "paused" | "expired" | "confirmed";

export interface CookingTimerState {
  durations: number[];
  stepIndex: number;
  initialSeconds: number;
  remainingSeconds: number;
  status: CookingTimerStatus;
  deadlineMs: number | null;
  autoEnabled: boolean;
  delaySeconds: number;
  graceSeconds: number;
  graceDeadlineMs: number | null;
  completedSteps: Record<number, boolean>;
}

export type CookingTimerAction =
  | { type: "load"; durations: number[] }
  | { type: "navigate"; index: number; fromIndex: number; completeCurrent?: boolean }
  | { type: "toggle"; now: number }
  | { type: "reset" }
  | { type: "adjust"; seconds: number; now: number; resume?: boolean }
  | { type: "confirm"; now: number }
  | { type: "auto"; enabled: boolean; now: number }
  | { type: "delay"; seconds: number; now: number }
  | { type: "toggleGrace"; now: number }
  | { type: "pauseGrace"; now: number }
  | { type: "tick"; now: number };

export type CookingTimerInput = CookingTimerAction extends infer Action
  ? Action extends { now: number } ? Omit<Action, "now"> : Action : never;

export function cookingStepSeconds(minutes?: number): number {
  return typeof minutes === "number" && Number.isFinite(minutes) && minutes > 0
    ? Math.round(minutes * 60) : 0;
}

export function createCookingTimer(durations: number[]): CookingTimerState {
  return {
    durations, stepIndex: 0, initialSeconds: durations[0] || 0,
    remainingSeconds: durations[0] || 0, status: "ready", deadlineMs: null,
    autoEnabled: false, delaySeconds: 30, graceSeconds: 30,
    graceDeadlineMs: null, completedSteps: {},
  };
}

function selectStep(state: CookingTimerState, index: number, completeCurrent = false): CookingTimerState {
  if (!Number.isInteger(index) || index < 0 || index >= state.durations.length || index === state.stepIndex) return state;
  return {
    ...state, stepIndex: index, initialSeconds: state.durations[index] || 0,
    remainingSeconds: state.durations[index] || 0, status: "ready", deadlineMs: null,
    graceSeconds: state.delaySeconds, graceDeadlineMs: null,
    completedSteps: {
      ...state.completedSteps,
      ...(completeCurrent ? { [state.stepIndex]: true } : {}),
    },
  };
}

function remaining(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

// Both navigation buttons and elapsed automatic delays enter steps through selectStep.
export function cookingTimerReducer(state: CookingTimerState, action: CookingTimerAction): CookingTimerState {
  switch (action.type) {
    case "load": return createCookingTimer(action.durations);
    case "navigate":
      return action.fromIndex === state.stepIndex
        ? selectStep(state, action.index, action.completeCurrent) : state;
    case "toggle": {
      if (state.status === "running" && state.deadlineMs !== null) {
        const seconds = remaining(state.deadlineMs, action.now);
        return { ...state, remainingSeconds: seconds, status: seconds ? "paused" : "expired", deadlineMs: null };
      }
      // A missing duration must be chosen by the cook; never invent one minute.
      if (!state.remainingSeconds || state.status === "confirmed") return state;
      return { ...state, status: "running", deadlineMs: action.now + state.remainingSeconds * 1000 };
    }
    case "reset":
      return {
        ...state, initialSeconds: state.durations[state.stepIndex] || 0,
        remainingSeconds: state.durations[state.stepIndex] || 0, status: "ready", deadlineMs: null,
        graceSeconds: state.delaySeconds, graceDeadlineMs: null,
        completedSteps: { ...state.completedSteps, [state.stepIndex]: false },
      };
    case "adjust": {
      if (!Number.isFinite(action.seconds) || !action.seconds) return state;
      const current = state.deadlineMs !== null ? remaining(state.deadlineMs, action.now) : state.remainingSeconds;
      const seconds = Math.max(0, current + Math.round(action.seconds));
      const running = seconds > 0 && (action.resume || state.status === "running");
      const status = running ? "running" : seconds > 0 ? (state.status === "ready" ? "ready" : "paused")
        : state.status === "ready" ? "ready" : "expired";
      return {
        ...state, remainingSeconds: seconds,
        initialSeconds: Math.max(seconds, state.initialSeconds + Math.round(action.seconds), 0),
        status, deadlineMs: running ? action.now + seconds * 1000 : null,
        graceSeconds: state.delaySeconds, graceDeadlineMs: null,
        completedSteps: { ...state.completedSteps, [state.stepIndex]: false },
      };
    }
    case "confirm":
      // Confirmation is explicit. Expiry and speech callbacks cannot complete a step.
      if (state.status === "confirmed") return state;
      return {
        ...state, status: "confirmed", deadlineMs: null,
        remainingSeconds: state.deadlineMs !== null ? remaining(state.deadlineMs, action.now) : state.remainingSeconds,
        completedSteps: { ...state.completedSteps, [state.stepIndex]: true },
        graceSeconds: state.delaySeconds,
        graceDeadlineMs: state.autoEnabled && state.stepIndex < state.durations.length - 1
          ? action.now + state.delaySeconds * 1000 : null,
      };
    case "auto":
      return {
        ...state, autoEnabled: action.enabled, graceSeconds: state.delaySeconds,
        graceDeadlineMs: action.enabled && state.status === "confirmed" && state.stepIndex < state.durations.length - 1
          ? action.now + state.delaySeconds * 1000 : null,
      };
    case "delay": {
      if (![15, 30, 60, 120].includes(action.seconds)) return state;
      return {
        ...state, delaySeconds: action.seconds, graceSeconds: action.seconds,
        graceDeadlineMs: state.graceDeadlineMs !== null ? action.now + action.seconds * 1000 : null,
      };
    }
    case "toggleGrace":
      if (!state.autoEnabled || state.status !== "confirmed" || state.stepIndex >= state.durations.length - 1) return state;
      return state.graceDeadlineMs !== null
        ? { ...state, graceSeconds: remaining(state.graceDeadlineMs, action.now), graceDeadlineMs: null }
        : { ...state, graceDeadlineMs: action.now + state.graceSeconds * 1000 };
    case "pauseGrace":
      return state.graceDeadlineMs !== null
        ? { ...state, graceSeconds: remaining(state.graceDeadlineMs, action.now), graceDeadlineMs: null } : state;
    case "tick": {
      if (state.status === "running" && state.deadlineMs !== null) {
        const seconds = remaining(state.deadlineMs, action.now);
        if (seconds === state.remainingSeconds && seconds > 0) return state;
        return { ...state, remainingSeconds: seconds, status: seconds ? "running" : "expired", deadlineMs: seconds ? state.deadlineMs : null };
      }
      if (state.autoEnabled && state.status === "confirmed" && state.graceDeadlineMs !== null) {
        const seconds = remaining(state.graceDeadlineMs, action.now);
        if (seconds === state.graceSeconds && seconds > 0) return state;
        return seconds ? { ...state, graceSeconds: seconds } : selectStep(state, state.stepIndex + 1);
      }
      return state;
    }
  }
}
