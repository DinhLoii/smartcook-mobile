import type { CookingVoiceCopilotResponseDTO } from "../services/aiService";

export interface CookingVoiceActionHandlers {
  onGoToStep?: (stepNumber: number) => void;
  onNextStep?: () => void;
  onPrevStep?: () => void;
  onExtendTimer?: (seconds: number) => void;
  onReduceTimer?: (seconds: number) => void;
}

export function getCookingStepIndex(steps: { stepNumber: number }[], stepNumber: number): number {
  return Number.isInteger(stepNumber) ? steps.findIndex((step) => step.stepNumber === stepNumber) : -1;
}

/** Apply the validated action before starting speech, which can be interrupted or unavailable. */
export function applyCookingVoiceAction(response: CookingVoiceCopilotResponseDTO, handlers: CookingVoiceActionHandlers): void {
  const payload = response.actionPayload;
  if (response.action === "GO_TO_STEP" && payload?.targetStep && Number.isInteger(payload.targetStep) && payload.targetStep > 0) {
    handlers.onGoToStep?.(payload.targetStep);
  } else if (response.action === "NEXT_STEP") {
    handlers.onNextStep?.();
  } else if (response.action === "PREV_STEP") {
    handlers.onPrevStep?.();
  } else if (response.action === "EXTEND_TIMER" && payload?.extendSeconds && Number.isFinite(payload.extendSeconds) && payload.extendSeconds > 0) {
    handlers.onExtendTimer?.(payload.extendSeconds);
  } else if (response.action === "REDUCE_TIMER" && payload?.reduceSeconds && Number.isFinite(payload.reduceSeconds) && payload.reduceSeconds > 0) {
    handlers.onReduceTimer?.(payload.reduceSeconds);
  }
}
