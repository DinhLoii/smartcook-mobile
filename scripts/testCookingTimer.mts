import { applyCookingVoiceAction, getCookingStepIndex } from "../src/utils/cookingVoiceActions.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import { cookingStepSeconds, cookingTimerReducer as reduce, createCookingTimer } from "../src/utils/cookingTimer.ts";

test("loads actual recipe minutes, including fractional or missing durations", () => {
  assert.equal(cookingStepSeconds(5), 300);
  assert.equal(cookingStepSeconds(0.5), 30);
  for (const value of [undefined, 0, -1, Infinity, NaN]) assert.equal(cookingStepSeconds(value), 0);
  const state = createCookingTimer([300, 180]);
  assert.equal(state.remainingSeconds, 300);
  assert.equal(state.status, "ready");
  assert.equal(reduce(createCookingTimer([0]), { type: "toggle", now: 0 }).remainingSeconds, 0);
});

test("speech or enabling auto mode cannot start a cooking timer or grace delay", () => {
  let state = reduce(createCookingTimer([300, 180]), { type: "auto", enabled: true, now: 0 });
  state = reduce(state, { type: "toggleGrace", now: 0 });
  state = reduce(state, { type: "tick", now: 600_000 });
  assert.equal(state.stepIndex, 0);
  assert.equal(state.status, "ready");
  assert.equal(state.remainingSeconds, 300);
  assert.equal(state.graceDeadlineMs, null);
});

test("expiry is a prompt, never completion or automatic navigation", () => {
  let state = reduce(createCookingTimer([300, 180]), { type: "auto", enabled: true, now: 0 });
  state = reduce(state, { type: "toggle", now: 0 });
  state = reduce(state, { type: "tick", now: 301_000 });
  assert.equal(state.status, "expired");
  assert.equal(state.completedSteps[0], undefined);
  assert.equal(state.graceDeadlineMs, null);
  state = reduce(state, { type: "tick", now: 900_000 });
  assert.equal(state.stepIndex, 0);
});

test("pause preserves remaining time and resume uses its own deadline", () => {
  let state = reduce(createCookingTimer([300]), { type: "toggle", now: 0 });
  state = reduce(state, { type: "toggle", now: 12_000 });
  assert.equal(state.remainingSeconds, 288);
  state = reduce(state, { type: "tick", now: 500_000 });
  assert.equal(state.remainingSeconds, 288);
  state = reduce(state, { type: "toggle", now: 500_000 });
  state = reduce(state, { type: "tick", now: 510_000 });
  assert.equal(state.remainingSeconds, 278);
});

test("after explicit confirmation the selected delay loads exactly the next step duration", () => {
  let state = reduce(createCookingTimer([300, 180, 60]), { type: "auto", enabled: true, now: 0 });
  state = reduce(state, { type: "delay", seconds: 15, now: 0 });
  state = reduce(state, { type: "confirm", now: 10_000 });
  assert.equal(state.completedSteps[0], true);
  assert.equal(state.status, "confirmed");
  assert.equal(state.deadlineMs, null);
  state = reduce(state, { type: "tick", now: 24_000 });
  assert.equal(state.graceSeconds, 1);
  state = reduce(state, { type: "tick", now: 25_000 });
  assert.equal(state.stepIndex, 1);
  assert.equal(state.initialSeconds, 180);
  assert.equal(state.remainingSeconds, 180);
  assert.equal(state.status, "ready");
  assert.equal(state.graceDeadlineMs, null);
  assert.equal(state.completedSteps[1], undefined);
  assert.equal(reduce(state, { type: "tick", now: 900_000 }).stepIndex, 1);
});

test("extension cancels grace, revokes completion, and voice extension resumes cooking", () => {
  let state = reduce(createCookingTimer([60, 120]), { type: "auto", enabled: true, now: 0 });
  state = reduce(state, { type: "toggle", now: 0 });
  state = reduce(state, { type: "tick", now: 60_000 });
  state = reduce(state, { type: "confirm", now: 60_000 });
  state = reduce(state, { type: "adjust", seconds: 120, resume: true, now: 65_000 });
  assert.equal(state.graceDeadlineMs, null);
  assert.equal(state.completedSteps[0], false);
  assert.equal(state.status, "running");
  assert.equal(state.remainingSeconds, 120);
  state = reduce(state, { type: "tick", now: 95_000 });
  assert.equal(state.stepIndex, 0);
  assert.equal(state.remainingSeconds, 90);
});

test("decreasing time never adds time, and zero does not complete a step", () => {
  let state = reduce(createCookingTimer([300]), { type: "toggle", now: 0 });
  state = reduce(state, { type: "adjust", seconds: -60, now: 10_000 });
  assert.equal(state.remainingSeconds, 230);
  assert.equal(state.initialSeconds, 240);
  state = reduce(state, { type: "adjust", seconds: -900, now: 10_000 });
  assert.equal(state.remainingSeconds, 0);
  assert.equal(state.status, "expired");
  assert.equal(state.completedSteps[0], false);
});

test("pause automatic delay for interaction/background, then resume only the saved remainder", () => {
  let state = reduce(createCookingTimer([300, 180]), { type: "auto", enabled: true, now: 0 });
  state = reduce(state, { type: "confirm", now: 0 });
  state = reduce(state, { type: "pauseGrace", now: 8_000 });
  assert.equal(state.graceSeconds, 22);
  state = reduce(state, { type: "tick", now: 300_000 });
  assert.equal(state.stepIndex, 0);
  state = reduce(state, { type: "toggleGrace", now: 300_000 });
  state = reduce(state, { type: "tick", now: 321_000 });
  assert.equal(state.stepIndex, 0);
  state = reduce(state, { type: "tick", now: 322_000 });
  assert.equal(state.stepIndex, 1);
});

test("manual, voice and automatic navigation use the same reset, and jumps do not complete skipped steps", () => {
  let state = reduce(createCookingTimer([300, 180, 60]), { type: "toggle", now: 0 });
  state = reduce(state, { type: "navigate", index: 2, fromIndex: 0 });
  assert.equal(state.remainingSeconds, 60);
  assert.equal(state.completedSteps[0], undefined);
  assert.equal(state.completedSteps[1], undefined);
  assert.equal(state.status, "ready");
  assert.equal(state.deadlineMs, null);
  // An old request cannot navigate a screen that has already moved.
  assert.equal(reduce(state, { type: "navigate", index: 1, fromIndex: 0 }), state);
  state = reduce(state, { type: "navigate", index: 1, fromIndex: 2 });
  assert.equal(state.remainingSeconds, 180);
  state = reduce(state, { type: "navigate", index: 2, fromIndex: 1, completeCurrent: true });
  assert.equal(state.completedSteps[1], true);
});

test("reset restores the current recipe duration and cancels confirmation and grace", () => {
  let state = reduce(createCookingTimer([300, 180]), { type: "auto", enabled: true, now: 0 });
  state = reduce(state, { type: "confirm", now: 0 });
  state = reduce(state, { type: "adjust", seconds: 300, now: 1_000 });
  state = reduce(state, { type: "reset" });
  assert.equal(state.remainingSeconds, 300);
  assert.equal(state.initialSeconds, 300);
  assert.equal(state.status, "ready");
  assert.equal(state.graceDeadlineMs, null);
  assert.equal(state.completedSteps[0], false);
});

test("all grace delays, changed delay and disabling auto obey confirmation", () => {
  for (const seconds of [15, 30, 60, 120]) {
    let state = reduce(createCookingTimer([60, 90]), { type: "auto", enabled: true, now: 0 });
    state = reduce(state, { type: "delay", seconds, now: 0 });
    state = reduce(state, { type: "confirm", now: 0 });
    assert.equal(state.graceDeadlineMs, seconds * 1000);
    state = reduce(state, { type: "auto", enabled: false, now: 1_000 });
    assert.equal(state.graceDeadlineMs, null);
    assert.equal(reduce(state, { type: "tick", now: 300_000 }).stepIndex, 0);
  }
  let state = reduce(createCookingTimer([60, 90]), { type: "auto", enabled: true, now: 0 });
  state = reduce(state, { type: "confirm", now: 0 });
  state = reduce(state, { type: "delay", seconds: 120, now: 10_000 });
  assert.equal(state.graceDeadlineMs, 130_000);
});

test("last step never automatically completes recipe; recipe reload removes old timer state", () => {
  let state = reduce(createCookingTimer([60]), { type: "auto", enabled: true, now: 0 });
  state = reduce(state, { type: "toggle", now: 0 });
  state = reduce(state, { type: "tick", now: 60_000 });
  assert.equal(state.completedSteps[0], undefined);
  state = reduce(state, { type: "confirm", now: 61_000 });
  assert.equal(state.graceDeadlineMs, null);
  assert.equal(reduce(state, { type: "tick", now: 900_000 }).stepIndex, 0);
  state = reduce(state, { type: "load", durations: [420, 600] });
  assert.equal(state.remainingSeconds, 420);
  assert.deepEqual(state.completedSteps, {});
  assert.equal(state.autoEnabled, false);
});


test("real voice action handlers map target steps and timer adjustments to recipe state", () => {
  const steps = [{ stepNumber: 1 }, { stepNumber: 2 }, { stepNumber: 3 }];
  let state = createCookingTimer([300, 180, 60]);
  const handlers = {
    onGoToStep: (number: number) => { state = reduce(state, { type: "navigate", index: getCookingStepIndex(steps, number), fromIndex: state.stepIndex }); },
    onNextStep: () => { state = reduce(state, { type: "navigate", index: state.stepIndex + 1, fromIndex: state.stepIndex, completeCurrent: true }); },
    onPrevStep: () => { state = reduce(state, { type: "navigate", index: state.stepIndex - 1, fromIndex: state.stepIndex }); },
    onExtendTimer: (seconds: number) => { state = reduce(state, { type: "adjust", seconds, resume: true, now: 0 }); },
    onReduceTimer: (seconds: number) => { state = reduce(state, { type: "adjust", seconds: -seconds, now: 0 }); },
  };
  applyCookingVoiceAction({ action: "GO_TO_STEP", actionPayload: { targetStep: 2 }, speechReply: "" }, handlers);
  assert.equal(state.stepIndex, 1);
  assert.equal(state.remainingSeconds, 180);
  applyCookingVoiceAction({ action: "REDUCE_TIMER", actionPayload: { reduceSeconds: 60 }, speechReply: "" }, handlers);
  assert.equal(state.remainingSeconds, 120);
  applyCookingVoiceAction({ action: "EXTEND_TIMER", actionPayload: { extendSeconds: 30 }, speechReply: "" }, handlers);
  assert.equal(state.remainingSeconds, 150);
  assert.equal(state.status, "running");
  applyCookingVoiceAction({ action: "PREV_STEP", speechReply: "" }, handlers);
  assert.equal(state.stepIndex, 0);
  assert.equal(state.remainingSeconds, 300);
  assert.equal(state.status, "ready");
  applyCookingVoiceAction({ action: "NEXT_STEP", speechReply: "" }, handlers);
  assert.equal(state.remainingSeconds, 180);
  assert.equal(state.completedSteps[0], true);
});
