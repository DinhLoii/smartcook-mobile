import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { CartService } from "@/services/cartService";

interface ShoppingReminderBannerProps {
  onPress: () => void;
  style?: any;
}

export default function ShoppingReminderBanner({
  onPress,
  style,
}: ShoppingReminderBannerProps) {
  const [unboughtCount, setUnboughtCount] = useState<number>(
    CartService.getUnboughtCount()
  );

  useEffect(() => {
    const unsubscribe = CartService.subscribe(() => {
      setUnboughtCount(CartService.getUnboughtCount());
    });
    return unsubscribe;
  }, []);

  if (unboughtCount === 0) {
    return null;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.bannerContainer, style]}
    >
      <LinearGradient
        colors={["#FFF7ED", "#FFEDD5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bannerGradient}
      >
        <View style={styles.bannerIconBox}>
          <Ionicons name="cart" size={17} color="#EA580C" />
        </View>

        <View style={styles.bannerTextCol}>
          <View style={styles.bannerTitleRow}>
            <Text style={styles.bannerTitle}>Giỏ hàng đi chợ</Text>
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>{unboughtCount} món cần mua</Text>
            </View>
          </View>
          <Text style={styles.bannerSubText} numberOfLines={1}>
            Nhắc nhở: Chưa mua xong đồ. Bấm để xem giỏ hàng!
          </Text>
        </View>

        <View style={styles.bannerActionBtn}>
          <Text style={styles.bannerActionText}>Xem giỏ</Text>
          <Ionicons name="chevron-forward" size={13} color="#EA580C" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 10, // bo tròn nhẹ
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FDBA74",
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bannerGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 10,
  },
  bannerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bannerTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#9A3412",
  },
  bannerBadge: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  bannerBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bannerSubText: {
    fontSize: 11,
    color: "#C2410C",
    marginTop: 1,
    fontWeight: "500",
  },
  bannerActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 2,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  bannerActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EA580C",
  },
});
