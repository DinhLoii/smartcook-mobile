import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BrandColors } from "@/constants/brandColors";
import { AppNotification } from "@/types";
import { notificationService } from "@/services/notificationService";
import { triggerHaptic } from "@/utils/haptics";

interface InAppNotificationBannerProps {
  onPressNotification?: (notif: AppNotification) => void;
}

export const InAppNotificationBanner: React.FC<InAppNotificationBannerProps> = ({
  onPressNotification,
}) => {
  const insets = useSafeAreaInsets();
  const [currentNotif, setCurrentNotif] = useState<AppNotification | null>(null);
  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<any>(null);

  const hideBanner = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -150,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentNotif(null);
    });
  };

  const showBanner = (notif: AppNotification) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCurrentNotif(notif);
    triggerHaptic("medium");

    // Animate slide down from top
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss after 4.5 seconds
    timeoutRef.current = setTimeout(() => {
      hideBanner();
    }, 4500);
  };

  useEffect(() => {
    const unsub = notificationService.subscribeNewNotification((notif) => {
      showBanner(notif);
    });

    return () => {
      unsub();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!currentNotif) return null;

  const topOffset =
    Platform.OS === "android"
      ? (StatusBar.currentHeight || insets.top || 24) + 8
      : insets.top + 8;

  const getIconInfo = () => {
    switch (currentNotif.type) {
      case "community":
        return { name: "chatbubble-ellipses" as const, color: BrandColors.primary, bg: "#FFF1EC" };
      case "reward":
        return { name: "gift" as const, color: "#8B5CF6", bg: "#F3E8FF" };
      case "fridge_expiry":
        return { name: "snow" as const, color: "#0284C7", bg: "#E0F2FE" };
      default:
        return { name: "notifications" as const, color: "#10B981", bg: "#ECFDF5" };
    }
  };

  const iconInfo = getIconInfo();

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          top: topOffset,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => {
          hideBanner();
          onPressNotification?.(currentNotif);
        }}
      >
        <View style={[styles.iconWrap, { backgroundColor: iconInfo.bg }]}>
          <Ionicons name={iconInfo.name} size={20} color={iconInfo.color} />
        </View>

        <View style={styles.contentWrap}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>
              {currentNotif.title}
            </Text>
            <Text style={styles.timeText}>Vừa xong</Text>
          </View>
          <Text style={styles.body} numberOfLines={2}>
            {currentNotif.body}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={hideBanner}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={16} color="#94A3B8" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 99999,
    elevation: 99999,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  contentWrap: {
    flex: 1,
    marginRight: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
    marginRight: 6,
  },
  timeText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  body: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 2,
  },
});
