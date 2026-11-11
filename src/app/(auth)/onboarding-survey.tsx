import { BrandColors } from "@/constants/brandColors";
import {
  CUISINE_OPTIONS,
  GOAL_OPTIONS,
  PORTION_OPTIONS,
  PreferenceService,
  RESTRICTION_OPTIONS,
  UserPreferences,
} from "@/services/preferenceService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";

// Enable LayoutAnimation for Android on Old Architecture
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental &&
  !(globalThis as any).nativeFabricUIManager
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ---------------------------------------------------------------------------
// Survey Questions Data Definition
// ---------------------------------------------------------------------------

const TASTE_OPTIONS = [
  { id: "dam-da", label: "Đậm đà", emoji: "🍲" },
  { id: "thanh-dam", label: "Thanh đạm", emoji: "🥗" },
  { id: "cay-nong", label: "Cay nồng", emoji: "🌶️" },
  { id: "ngot-thanh", label: "Ngọt thanh", emoji: "🍯" },
  { id: "chua-cay", label: "Chua cay", emoji: "🍋" },
  { id: "beo-ngay", label: "Béo ngậy", emoji: "🧈" },
];

const TIME_OPTIONS = [
  { id: "quick", label: "< 15 phút", emoji: "⚡" },
  { id: "medium", label: "15 - 30 phút", emoji: "⏱️" },
  { id: "standard", label: "30 - 45 phút", emoji: "🍳" },
  { id: "slow", label: "> 45 phút", emoji: "🍲" },
];

export default function OnboardingSurveyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { updateSurvey } = useAuth();

  // State for all 6 questions
  const [cuisines, setCuisines] = useState<string[]>(["vietnamese"]);
  const [tastes, setTastes] = useState<string[]>(["dam-da"]);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [portion, setPortion] = useState<UserPreferences["portion"]>("3-4");
  const [cookingTime, setCookingTime] = useState<string>("medium");
  const [goal, setGoal] = useState<UserPreferences["healthGoal"]>("healthy");
  const [isSaving, setIsSaving] = useState(false);

  // Which question card is currently expanded inline (null if all collapsed, or number 1..6)
  const [expandedCard, setExpandedCard] = useState<number | null>(1);

  // Toggle card expansion with smooth animation
  const handleToggleCard = (num: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCard((prev) => (prev === num ? null : num));
  };

  // Helper getters for display subtitles
  const getCuisineSubtitle = () => {
    if (cuisines.length === 0) return "Chọn loại món ăn";
    return cuisines
      .map((id) => CUISINE_OPTIONS.find((c) => c.id === id)?.label)
      .filter(Boolean)
      .join(", ");
  };

  const getTasteSubtitle = () => {
    if (tastes.length === 0) return "Chọn khẩu vị";
    return tastes
      .map((id) => TASTE_OPTIONS.find((t) => t.id === id)?.label)
      .filter(Boolean)
      .join(", ");
  };

  const getRestrictionSubtitle = () => {
    if (restrictions.length === 0) return "Không có dị ứng (Ăn được tất cả)";
    return restrictions
      .map((id) => RESTRICTION_OPTIONS.find((r) => r.id === id)?.label)
      .filter(Boolean)
      .join(", ");
  };

  const getPortionSubtitle = () => {
    return PORTION_OPTIONS.find((p) => p.id === portion)?.title || "Chọn khẩu phần";
  };

  const getTimeSubtitle = () => {
    return TIME_OPTIONS.find((t) => t.id === cookingTime)?.label || "Chọn thời gian";
  };

  const getGoalSubtitle = () => {
    return GOAL_OPTIONS.find((g) => g.id === goal)?.label || "Chọn mục tiêu";
  };

  // Multi-select toggle helper
  const toggleMulti = (
    list: string[],
    setList: (val: string[]) => void,
    id: string
  ) => {
    if (list.includes(id)) {
      setList(list.filter((x) => x !== id));
    } else {
      setList([...list, id]);
    }
  };

  // Single-select helper with auto collapse/next (optional)
  const selectSingle = <T,>(setter: (val: T) => void, val: T) => {
    setter(val);
  };

  // Handle Complete & Save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Lưu local cache cho app
      PreferenceService.savePreferences({
        portion,
        cuisines,
        healthGoal: goal,
        restrictions,
        tasteProfile: tastes,
        cookingTime: cookingTime as any,
      });

      // 2. Đồng bộ vào cơ sở dữ liệu MongoDB thông qua Backend API
      await updateSurvey({
        portion,
        cuisines,
        healthGoal: goal,
        restrictions,
        tasteProfile: tastes,
        cookingTime: cookingTime as any,
      });
    } catch (e) {
      console.error("Lỗi khi lưu khảo sát lên backend", e);
    } finally {
      setIsSaving(false);
      router.replace("/home");
    }
  };

  // Handle Skip
  const handleSkip = () => {
    PreferenceService.skipSurvey();
    router.replace("/home");
  };

  // Question list definitions
  const questions = [
    {
      num: 1,
      title: "Bạn thích loại món ăn nào?",
      subtitle: getCuisineSubtitle(),
      hasValue: cuisines.length > 0,
    },
    {
      num: 2,
      title: "Bạn thường thích khẩu vị nào?",
      subtitle: getTasteSubtitle(),
      hasValue: tastes.length > 0,
    },
    {
      num: 3,
      title: "Bạn có nguyên liệu nào không ăn được hoặc dị ứng không?",
      subtitle: getRestrictionSubtitle(),
      hasValue: restrictions.length > 0,
    },
    {
      num: 4,
      title: "Bạn thường nấu ăn cho bao nhiêu người?",
      subtitle: getPortionSubtitle(),
      hasValue: Boolean(portion),
    },
    {
      num: 5,
      title: "Bạn muốn món ăn có thời gian chế biến như thế nào?",
      subtitle: getTimeSubtitle(),
      hasValue: Boolean(cookingTime),
    },
    {
      num: 6,
      title: "Mục tiêu ăn uống của bạn là gì?",
      subtitle: getGoalSubtitle(),
      hasValue: Boolean(goal),
    },
  ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* TOP HEADER: Clean Navigation bar with Skip button */}
      <View style={styles.topBar}>
        <View style={styles.headerLeft}>
          <Text style={styles.mainTitle}>Giúp chúng tôi hiểu</Text>
          <Text style={styles.mainTitle}>sở thích của bạn</Text>
        </View>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.skipButtonText}>Bỏ qua</Text>
          <Ionicons name="chevron-forward" size={13} color={BrandColors.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={styles.subTitle}>
        Vui lòng trả lời một vài câu hỏi để nhận được gợi ý món ăn phù hợp hơn.
      </Text>

      {/* SCROLLABLE LIST OF INTERACTIVE COMPACT CARDS */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 85 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardList}>
          {questions.map((item) => {
            const isExpanded = expandedCard === item.num;

            return (
              <View
                key={item.num}
                style={[
                  styles.questionCard,
                  isExpanded && styles.questionCardExpanded,
                ]}
              >
                {/* Header of the card: tap to toggle options */}
                <TouchableOpacity
                  style={styles.cardHeaderRow}
                  onPress={() => handleToggleCard(item.num)}
                  activeOpacity={0.75}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.titleRow}>
                      <Text style={styles.itemNumber}>{item.num}.</Text>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                    </View>
                    <Text
                      style={[
                        styles.itemSubtitle,
                        item.hasValue && styles.itemSubtitleActive,
                      ]}
                      numberOfLines={1}
                    >
                      {item.subtitle}
                    </Text>
                  </View>

                  <Ionicons
                    name={isExpanded ? "chevron-down" : "chevron-forward"}
                    size={16}
                    color={isExpanded ? "#171717" : "#C7C7C7"}
                    style={styles.chevron}
                  />
                </TouchableOpacity>

                {/* INLINE COMPACT OPTIONS (Clean typography only, NO icons/emojis) */}
                {isExpanded && (
                  <View style={styles.inlineOptionsContainer}>
                    {/* OPTION 1: CUISINES */}
                    {item.num === 1 && (
                      <View style={styles.chipsWrap}>
                        {CUISINE_OPTIONS.map((c) => {
                          const isSelected = cuisines.includes(c.id);
                          return (
                            <TouchableOpacity
                              key={c.id}
                              style={[
                                styles.chip,
                                isSelected && styles.chipSelected,
                              ]}
                              onPress={() =>
                                toggleMulti(cuisines, setCuisines, c.id)
                              }
                              activeOpacity={0.75}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  isSelected && styles.chipTextSelected,
                                ]}
                              >
                                {c.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {/* OPTION 2: TASTES */}
                    {item.num === 2 && (
                      <View style={styles.chipsWrap}>
                        {TASTE_OPTIONS.map((t) => {
                          const isSelected = tastes.includes(t.id);
                          return (
                            <TouchableOpacity
                              key={t.id}
                              style={[
                                styles.chip,
                                isSelected && styles.chipSelected,
                              ]}
                              onPress={() =>
                                toggleMulti(tastes, setTastes, t.id)
                              }
                              activeOpacity={0.75}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  isSelected && styles.chipTextSelected,
                                ]}
                              >
                                {t.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {/* OPTION 3: RESTRICTIONS */}
                    {item.num === 3 && (
                      <View style={styles.chipsWrap}>
                        <TouchableOpacity
                          style={[
                            styles.chip,
                            restrictions.length === 0 && styles.chipSelected,
                          ]}
                          onPress={() => setRestrictions([])}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              restrictions.length === 0 &&
                                styles.chipTextSelected,
                            ]}
                          >
                            Không dị ứng
                          </Text>
                        </TouchableOpacity>

                        {RESTRICTION_OPTIONS.map((r) => {
                          const isSelected = restrictions.includes(r.id);
                          return (
                            <TouchableOpacity
                              key={r.id}
                              style={[
                                styles.chip,
                                isSelected && styles.chipAlertSelected,
                              ]}
                              onPress={() =>
                                toggleMulti(restrictions, setRestrictions, r.id)
                              }
                              activeOpacity={0.75}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  isSelected && styles.chipTextAlertSelected,
                                ]}
                              >
                                {r.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {/* OPTION 4: PORTION */}
                    {item.num === 4 && (
                      <View style={styles.portionRow}>
                        {PORTION_OPTIONS.map((p) => {
                          const isSelected = portion === p.id;
                          return (
                            <TouchableOpacity
                              key={p.id}
                              style={[
                                styles.portionPill,
                                isSelected && styles.portionPillSelected,
                              ]}
                              onPress={() =>
                                selectSingle(setPortion, p.id)
                              }
                              activeOpacity={0.8}
                            >
                              <Text
                                style={[
                                  styles.portionPillText,
                                  isSelected && styles.portionPillTextSelected,
                                ]}
                              >
                                {p.title}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {/* OPTION 5: TIME */}
                    {item.num === 5 && (
                      <View style={styles.chipsWrap}>
                        {TIME_OPTIONS.map((t) => {
                          const isSelected = cookingTime === t.id;
                          return (
                            <TouchableOpacity
                              key={t.id}
                              style={[
                                styles.chip,
                                isSelected && styles.chipSelected,
                              ]}
                              onPress={() =>
                                selectSingle(setCookingTime, t.id)
                              }
                              activeOpacity={0.75}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  isSelected && styles.chipTextSelected,
                                ]}
                              >
                                {t.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {/* OPTION 6: GOAL */}
                    {item.num === 6 && (
                      <View style={styles.chipsWrap}>
                        {GOAL_OPTIONS.map((g) => {
                          const isSelected = goal === g.id;
                          return (
                            <TouchableOpacity
                              key={g.id}
                              style={[
                                styles.chip,
                                isSelected && styles.chipSelected,
                              ]}
                              onPress={() =>
                                selectSingle(setGoal, g.id as any)
                              }
                              activeOpacity={0.75}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  isSelected && styles.chipTextSelected,
                                ]}
                              >
                                {g.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* BOTTOM STICKY ACTION BUTTON */}
      <View
        style={[
          styles.bottomStickyBar,
          { paddingBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        <TouchableOpacity
          style={[styles.submitButton, isSaving && { opacity: 0.8 }]}
          onPress={handleSave}
          activeOpacity={0.88}
          disabled={isSaving}
        >
          <LinearGradient
            colors={BrandColors.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Xác nhận & Khám phá món ✨</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondarySkip}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.secondarySkipText}>
            Bỏ qua khảo sát, vào trang chủ
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// STYLESHEET (Ultra-compact, sleek and matching user reference)
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 2,
  },
  headerLeft: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: BrandColors.textDark,
    lineHeight: 25,
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 12,
    color: BrandColors.textMuted,
    lineHeight: 17,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  skipButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 2,
  },
  skipButtonText: {
    fontSize: 12.5,
    color: BrandColors.textMuted,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  cardList: {
    gap: 7,
  },
  questionCard: {
    backgroundColor: BrandColors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    overflow: "hidden",
  },
  questionCardExpanded: {
    borderColor: BrandColors.borderLight,
    backgroundColor: BrandColors.surfaceCard,
    shadowColor: "#171717",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 1.5,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  cardContent: {
    flex: 1,
    paddingRight: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  itemNumber: {
    fontSize: 13,
    fontWeight: "700",
    color: BrandColors.textDark,
    marginRight: 5,
  },
  itemTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: BrandColors.textDark,
    lineHeight: 18,
  },
  itemSubtitle: {
    fontSize: 11.5,
    color: BrandColors.textPlaceholder,
    paddingLeft: 16,
    fontWeight: "500",
  },
  itemSubtitleActive: {
    color: BrandColors.textDark,
    fontWeight: "600",
  },
  chevron: {
    marginLeft: 4,
  },

  // Inline expanded options
  inlineOptionsContainer: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.background,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  chipSelected: {
    backgroundColor: BrandColors.surfaceMuted,
    borderColor: "#171717",
  },
  chipAlertSelected: {
    backgroundColor: "#F4F4F4",
    borderColor: "#242424",
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: BrandColors.textBody,
  },
  chipTextSelected: {
    color: BrandColors.textDark,
    fontWeight: "700",
  },
  chipTextAlertSelected: {
    color: "#212121",
    fontWeight: "700",
  },

  // Portion segmented pills
  portionRow: {
    flexDirection: "row",
    gap: 5,
    paddingTop: 4,
  },
  portionPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BrandColors.background,
    borderRadius: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  portionPillSelected: {
    backgroundColor: "#171717",
    borderColor: "#171717",
  },
  portionPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: BrandColors.textBody,
  },
  portionPillTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // Bottom action bar
  bottomStickyBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: BrandColors.surfaceCard,
    paddingTop: 8,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: BrandColors.borderLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 8,
  },
  submitButton: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#171717",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 2,
  },
  submitGradient: {
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondarySkip: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
  },
  secondarySkipText: {
    fontSize: 11.5,
    color: BrandColors.textPlaceholder,
    fontWeight: "500",
  },
});
