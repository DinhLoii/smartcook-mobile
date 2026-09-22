import {
  CUISINE_OPTIONS,
  PORTION_OPTIONS,
  PreferenceService,
  RESTRICTION_OPTIONS,
  UserPreferences,
} from "@/services/preferenceService";
import { ProfileViewProps } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { EditProfileModal } from "./EditProfileModal";

export default function ProfileView({ insetsTop }: ProfileViewProps) {
  const router = useRouter();
  const { user, logout, updateProfile } = useAuth();
  const [isEditProfileVisible, setIsEditProfileVisible] = useState(false);

  // Local preferences state fallback when user has not synced preferences from server
  const [localPreferences, setLocalPreferences] = useState<UserPreferences>(() =>
    PreferenceService.getPreferences()
  );

  // Derived preferences: uses user.preferences from AuthContext as source of truth.
  // Plain derivation allows React Compiler to auto-memoize with precise granular dependencies.
  const preferences: UserPreferences = user?.preferences
    ? {
        hasCompletedSurvey: user.preferences.hasCompletedSurvey ?? true,
        portion: (user.preferences.portion as any) || "3-4",
        cuisines: user.preferences.cuisines || [],
        healthGoal: (user.preferences.healthGoal as any) || "healthy",
        restrictions: user.preferences.restrictions || [],
        tasteProfile: user.preferences.tasteProfile || [],
        cookingTime: (user.preferences.cookingTime as any) || "medium",
        updatedAt: user.preferences.updatedAt || new Date().toISOString(),
      }
    : localPreferences;

  // Subscribe to PreferenceService external updates only when user is not logged in
  useEffect(() => {
    if (!user?.preferences) {
      const unsub = PreferenceService.subscribe((prefs) => {
        setLocalPreferences(prefs);
      });
      return () => {
        unsub();
      };
    }
  }, [user?.preferences]);

  // Safe Logout with Confirmation Dialog (Works on Web, iOS & Android)
  const handleConfirmLogout = () => {
    if (Platform.OS === "web") {
      const confirmed =
        typeof window !== "undefined"
          ? window.confirm("Bạn có chắc chắn muốn đăng xuất khỏi tài khoản SmartCook không?")
          : true;
      if (confirmed) {
        logout().then(() => {
          router.replace("/login");
        });
      }
      return;
    }

    Alert.alert(
      "Xác nhận đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất khỏi tài khoản SmartCook không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đăng xuất",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/login");
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleMenuClick = (title: string) => {
    if (Platform.OS === "web") {
      alert(`Bạn đã chọn "${title}".`);
      return;
    }
    Alert.alert(title, `Bạn đã chọn "${title}".`);
  };

  // Formatters for preferences display
  const portionText =
    PORTION_OPTIONS.find((p) => p.id === preferences.portion)?.title ||
    `${preferences.portion} người`;

  const cuisinesText =
    (preferences.cuisines?.length ?? 0) > 0
      ? preferences.cuisines
          .map((id) => CUISINE_OPTIONS.find((c) => c.id === id)?.label)
          .filter(Boolean)
          .join(", ")
      : "Chưa thiết lập";

  const goalText =
    preferences.healthGoal === "loss"
      ? "Giảm cân & Đốt mỡ"
      : preferences.healthGoal === "muscle"
      ? "Tăng cơ & Giàu đạm"
      : preferences.healthGoal === "budget"
      ? "Tiết kiệm chi tiêu"
      : "Ăn Healthy & Cân bằng";

  const restrictionsText =
    (preferences.restrictions?.length ?? 0) > 0
      ? preferences.restrictions
          .map((id) => RESTRICTION_OPTIONS.find((r) => r.id === id)?.label)
          .filter(Boolean)
          .join(", ")
      : "Không có dị ứng";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insetsTop + 12, paddingBottom: 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. COMPACT USER INFO CARD */}
      <View style={styles.card}>
        <View style={styles.userRow}>
          <Image
            source={
              user?.avatar
                ? { uri: user.avatar }
                : require("@/assets/images/smartcook-auth-bg.jpg")
            }
            style={styles.avatar}
            resizeMode="cover"
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user?.fullName ||
                `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
                "Đầu bếp SmartCook"}
            </Text>
            <Text style={styles.userEmail}>
              {user?.email || "smartcook.user@gmail.com"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
              <View style={styles.tierBadge}>
                <Text style={styles.tierText}>{user?.level || "Tập sự"}</Text>
              </View>
              <View style={[styles.tierBadge, { backgroundColor: "#FFF7ED", borderColor: "#FFEDD5" }]}>
                <Text style={[styles.tierText, { color: "#EA580C" }]}>⚡ {user?.chefExp ?? 0} XP</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => setIsEditProfileVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil" size={13} color="#EA580C" />
            <Text style={styles.editProfileBtnText}>Sửa</Text>
          </TouchableOpacity>
        </View>

        {/* Chef Rank Progress Bar */}
        {(() => {
          const chefExp = user?.chefExp ?? 0;
          const nextMilestone =
            chefExp >= 801 ? 801 : chefExp >= 401 ? 801 : chefExp >= 151 ? 401 : 151;
          const currentBase =
            chefExp >= 801 ? 801 : chefExp >= 401 ? 401 : chefExp >= 151 ? 151 : 0;
          const progressPercent =
            chefExp >= 801
              ? 100
              : Math.min(
                  100,
                  Math.max(
                    6,
                    Math.round(
                      ((chefExp - currentBase) / (nextMilestone - currentBase)) * 100
                    )
                  )
                );

          return (
            <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748B" }}>
                  Tiến trình thăng cấp
                </Text>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#EA580C" }}>
                  {chefExp >= 801
                    ? "Đỉnh cao Bếp trưởng 👑"
                    : `${chefExp} / ${nextMilestone} XP`}
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: "#E2E8F0", borderRadius: 3, overflow: "hidden" }}>
                <View
                  style={{
                    height: "100%",
                    width: `${progressPercent}%`,
                    backgroundColor: "#EA580C",
                    borderRadius: 3,
                  }}
                />
              </View>
            </View>
          );
        })()}
      </View>

      {/* 2. TASTE & DIETARY SURVEY PREFERENCES CARD */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Hồ sơ khẩu vị & Khẩu phần</Text>
          <TouchableOpacity
            onPress={() => router.push("/onboarding-survey")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.editLink}>Chỉnh sửa</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.prefList}>
          <View style={styles.prefRow}>
            <Text style={styles.prefLabel}>Khẩu phần:</Text>
            <Text style={styles.prefValue}>{portionText}</Text>
          </View>
          <View style={styles.prefDivider} />

          <View style={styles.prefRow}>
            <Text style={styles.prefLabel}>Món ưa thích:</Text>
            <Text style={styles.prefValue} numberOfLines={1}>
              {cuisinesText}
            </Text>
          </View>
          <View style={styles.prefDivider} />

          <View style={styles.prefRow}>
            <Text style={styles.prefLabel}>Mục tiêu:</Text>
            <Text style={styles.prefValue}>{goalText}</Text>
          </View>
          <View style={styles.prefDivider} />

          <View style={styles.prefRow}>
            <Text style={styles.prefLabel}>Dị ứng / Kiêng:</Text>
            <Text style={styles.prefValue} numberOfLines={1}>
              {restrictionsText}
            </Text>
          </View>
        </View>
      </View>

      {/* 4. SETTINGS & UTILITIES (Clean rows with chevrons) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cài đặt & Tiện ích</Text>

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => handleMenuClick("Bộ sưu tập món đã lưu")}
          activeOpacity={0.7}
        >
          <Text style={styles.settingText}>Bộ sưu tập công thức đã lưu</Text>
          <Ionicons name="chevron-forward" size={15} color="#CBD5E1" />
        </TouchableOpacity>
        <View style={styles.prefDivider} />

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => handleMenuClick("Thông báo & Giờ nấu ăn")}
          activeOpacity={0.7}
        >
          <Text style={styles.settingText}>Thông báo & Giờ nấu ăn</Text>
          <Ionicons name="chevron-forward" size={15} color="#CBD5E1" />
        </TouchableOpacity>
        <View style={styles.prefDivider} />

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => handleMenuClick("Ngôn ngữ hiển thị")}
          activeOpacity={0.7}
        >
          <Text style={styles.settingText}>Ngôn ngữ hiển thị (Tiếng Việt)</Text>
          <Ionicons name="chevron-forward" size={15} color="#CBD5E1" />
        </TouchableOpacity>
        <View style={styles.prefDivider} />

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => handleMenuClick("Trung tâm trợ giúp & Phản hồi")}
          activeOpacity={0.7}
        >
          <Text style={styles.settingText}>Trung tâm trợ giúp & Phản hồi</Text>
          <Ionicons name="chevron-forward" size={15} color="#CBD5E1" />
        </TouchableOpacity>
      </View>

      {/* 5. LOGOUT BUTTON */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleConfirmLogout}
        activeOpacity={0.75}
      >
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>

      {/* 6. VERSION FOOTER */}
      <Text style={styles.versionText}>SmartCook • v2.4.0</Text>

      {/* 7. EDIT PROFILE MODAL */}
      <EditProfileModal
        visible={isEditProfileVisible}
        onClose={() => setIsEditProfileVisible(false)}
        currentUser={user}
        onSave={async (payload) => {
          await updateProfile(payload);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    paddingHorizontal: 16,
    gap: 10,
  },

  /* Base Card */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },

  /* User Info */
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  tierBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  tierText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },

  /* Card Header */
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  editLink: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#EA580C",
  },

  /* Preference rows */
  prefList: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 7,
  },
  prefLabel: {
    fontSize: 12.5,
    color: "#64748B",
  },
  prefValue: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#0F172A",
    maxWidth: "60%",
    textAlign: "right",
  },
  prefDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },

  /* Retake Survey Button */
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
    gap: 4,
  },
  retakeBtnText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#EA580C",
  },

  /* Settings rows */
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  settingText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
  },

  /* Logout */
  logoutBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EF4444",
  },

  /* Version */
  versionText: {
    textAlign: "center",
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 6,
  },

  /* Edit Profile Button in Card */
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFEDD5",
    gap: 4,
    alignSelf: "flex-start",
  },
  editProfileBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EA580C",
  },
});
