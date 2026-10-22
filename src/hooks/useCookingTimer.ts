import { useCallback, useEffect, useReducer } from "react";
import { AppState } from "react-native";
import { cookingTimerReducer, createCookingTimer } from "@/utils/cookingTimer";
import type { CookingTimerAction, CookingTimerInput } from "@/utils/cookingTimer";

export function useCookingTimer(durations: number[], recipeKey: string) {
  const [state, dispatch] = useReducer(cookingTimerReducer, durations, createCookingTimer);
  const durationsKey = JSON.stringify(durations);

  useEffect(() => {
    dispatch({ type: "load", durations: JSON.parse(durationsKey) as number[] });
  }, [durationsKey, recipeKey]);

  const ticking = state.deadlineMs !== null || state.graceDeadlineMs !== null;
  useEffect(() => {
    if (!ticking) return;
    const interval = setInterval(() => {
      if (AppState.currentState !== "background" && AppState.currentState !== "inactive") {
        dispatch({ type: "tick", now: Date.now() });
      }
    }, 250);
    return () => clearInterval(interval);
  }, [ticking]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      // Cooking time keeps elapsing in the background; navigation waits for the cook.
      dispatch({ type: next === "active" ? "tick" : "pauseGrace", now: Date.now() });
    });
    return () => subscription.remove();
  }, []);

  const send = useCallback((action: CookingTimerInput) => {
    dispatch({ ...action, now: Date.now() } as CookingTimerAction);
  }, []);

  return { state, dispatch: send };
}
