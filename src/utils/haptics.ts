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

export const triggerHaptic = (
  type: "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection" = "light"
): Promise<void> => {
  switch (type) {
    case "selection":
      return hapticSelection();
    case "success":
      return hapticSuccess();
    case "warning":
      return safelyTrigger(() =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      );
    case "error":
      return safelyTrigger(() =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      );
    case "medium":
      return safelyTrigger(() =>
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      );
    case "heavy":
      return safelyTrigger(() =>
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      );
    case "light":
    default:
      return hapticLightImpact();
  }
};
