import { BrandColors } from "@/constants/brandColors";
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
        colors={["#F6F6F6", "#EAEAEA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bannerGradient}
      >
        <View style={styles.bannerIconBox}>
          <Ionicons name="cart" size={17} color={BrandColors.textDark} />
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
          <Ionicons name="chevron-forward" size={13} color={BrandColors.textDark} />
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
    borderColor: "#C2C2C2",
    shadowColor: "#171717",
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
    backgroundColor: BrandColors.surfaceCard,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
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
    color: "#292929",
  },
  bannerBadge: {
    backgroundColor: "#171717",
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
    color: "#282828",
    marginTop: 1,
    fontWeight: "500",
  },
  bannerActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.surfaceCard,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 2,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  bannerActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
});
