import * as Haptics from "expo-haptics";

const safelyTrigger = async (effect: () => Promise<void>): Promise<void> => {
  try {
    await effect();
  } catch {
    // Haptics can be unavailable because of device or system settings.
  }
};

export const hapticSelection = (): Promise<void> =>
  safelyTrigger(() => Haptics.selectionAsync());

export const hapticLightImpact = (): Promise<void> =>
  safelyTrigger(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

export const hapticSuccess = (): Promise<void> =>
  safelyTrigger(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  );
