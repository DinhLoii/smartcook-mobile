import { BrandColors } from "@/constants/brandColors";
import DismissKeyboard from "@/components/common/DismissKeyboard";
import { NearbyStoreCard } from "@/components/planner";
import { RECIPES_DATA } from "@/data/recipesData";
import {
  PlannerMealSlot,
  plannerService,
  WeeklyPlanResponse,
} from "@/services/plannerService";
import { CartService } from "@/services/cartService";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { RewardCatalogItem, RewardStatus } from "@/types";
import { rewardService } from "@/services/rewardService";
import { triggerHaptic } from "@/utils/haptics";
import { getBrandLogoSource } from "@/utils/brandLogos";

export interface PlannerViewProps {
  insetsTop: number;
  initialSubTab?: "calendar" | "shopping" | "rewards";
  onXpUpdated?: (newXp: number, newLevel: string) => void;
}

export default function PlannerView({
  insetsTop,
  initialSubTab = "calendar",
  onXpUpdated,
}: PlannerViewProps) {
  const router = useRouter();

  const [activeSubTab, setActiveSubTab] = useState<"calendar" | "shopping" | "rewards">(
    initialSubTab
  );

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [selectedDay, setSelectedDay] = useState("Thứ 2");

  // Dynamic Week Days based on current week's Monday
  const weekDays = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    const dayLabels = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];
    return dayLabels.map((d, index) => {
      const current = new Date(monday);
      current.setDate(monday.getDate() + index);
      return {
        day: d,
        backendDay: d === "CN" ? "Chủ Nhật" : d,
        date: current.getDate().toString(),
      };
    });
  }, []);

  const selectedBackendDay = useMemo(() => {
    return selectedDay === "CN" ? "Chủ Nhật" : selectedDay;
  }, [selectedDay]);

  // Weekly plan from backend
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanResponse | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);

  // Fallback sample meals for empty days
  const fallbackDailyMeals = [
    {
      slot: "Bữa Sáng" as const,
      time: "07:00",
      customTitle: "Cơm Đùi Gà Trứng Ốp",
      recipe: RECIPES_DATA[6],
      calories: 520,
    },
    {
      slot: "Bữa Trưa" as const,
      time: "12:00",
      customTitle: "Cơm Gà Teriyaki",
      recipe: RECIPES_DATA[0],
      calories: 580,
    },
    {
      slot: "Bữa Tối" as const,
      time: "19:00",
      customTitle: "Salad Cá Hồi Áp Chảo",
      recipe: RECIPES_DATA[2],
      calories: 420,
    },
  ];

  // Fetch weekly meal plan
  const fetchWeeklyPlan = async () => {
    try {
      setIsLoadingPlan(true);
      const res = await plannerService.getCurrentWeekPlan();
      if (res && res.days) {
        setWeeklyPlan(res);
      }
    } catch (e) {
      console.warn("fetchWeeklyPlan failed:", e);
    } finally {
      setIsLoadingPlan(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchWeeklyPlan();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Compute active meals for selected day
  const activeDayMeals = useMemo(() => {
    if (!weeklyPlan || !weeklyPlan.days) {
      return fallbackDailyMeals;
    }
    const dayObj = weeklyPlan.days.find(
      (d) => d.dayOfWeek === selectedBackendDay || d.dayOfWeek === selectedDay
    );
    if (dayObj && dayObj.meals && dayObj.meals.length > 0) {
      return dayObj.meals.map((m) => ({
        slot: m.slot,
        time: m.time || "12:00",
        customTitle: m.customTitle || m.recipe?.title || "Món ăn dinh dưỡng",
        calories: m.calories || m.recipe?.calories || 450,
        recipe: m.recipe
          ? {
              id: m.recipe.id,
              title: m.recipe.title,
              image:
                typeof m.recipe.image === "string"
                  ? { uri: m.recipe.image }
                  : m.recipe.image || RECIPES_DATA[0].image,
              minutes: m.recipe.minutes || 25,
              difficulty: m.recipe.difficulty || "Dễ",
              calories: m.recipe.calories || 450,
              rating: m.recipe.rating || 4.8,
            }
          : RECIPES_DATA[0],
      }));
    }
    return fallbackDailyMeals;
  }, [weeklyPlan, selectedBackendDay, selectedDay]);

  const totalCalories = activeDayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);

  // Add Meal Modal state
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<
    "Bữa Sáng" | "Bữa Trưa" | "Bữa Tối" | "Bữa Phụ"
  >("Bữa Trưa");
  const [mealTitle, setMealTitle] = useState("");
  const [mealCalories, setMealCalories] = useState("500");
  const [mealTime, setMealTime] = useState("12:00");
  const [isSubmittingMeal, setIsSubmittingMeal] = useState(false);

  const handleSaveMealSlot = async () => {
    if (!mealTitle.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên món ăn");
      return;
    }
    try {
      setIsSubmittingMeal(true);
      await plannerService.setMealSlot({
        dayOfWeek: selectedBackendDay,
        slot: selectedSlot,
        customTitle: mealTitle.trim(),
        calories: parseInt(mealCalories, 10) || 500,
        time: mealTime.trim() || "12:00",
      });
      setShowAddMealModal(false);
      setMealTitle("");
      await fetchWeeklyPlan();
      Alert.alert("Thành công", `Đã thêm món vào ${selectedSlot} ngày ${selectedDay}!`);
    } catch (e: any) {
      Alert.alert("Lỗi", "Không thể lưu bữa ăn. Vui lòng thử lại!");
    } finally {
      setIsSubmittingMeal(false);
    }
  };

  const handleRemoveMeal = (slot: string, title: string) => {
    Alert.alert(
      "Xác nhận xóa",
      `Bạn có chắc muốn xóa món "${title}" khỏi ${slot}?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            await plannerService.removeMealSlot(selectedBackendDay, slot);
            await fetchWeeklyPlan();
          },
        },
      ]
    );
  };

  // ================= SHOPPING LIST STATE =================
  const [shoppingItems, setShoppingItems] = useState<
    Array<{
      id: string;
      name: string;
      amount: string;
      category: string;
      price: string;
      bought: boolean;
    }>
  >([]);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [excludedCount, setExcludedCount] = useState<number>(0);
  const [isSyncingFridge, setIsSyncingFridge] = useState(false);

  // Add Item Modal state
  const [showAddCartModal, setShowAddCartModal] = useState(false);
  const [newCartName, setNewCartName] = useState("");
  const [newCartAmount, setNewCartAmount] = useState("1 phần");
  const [newCartPrice, setNewCartPrice] = useState("30000");
  const [newCartCategory, setNewCartCategory] = useState("Rau củ");
  const [isSubmittingCart, setIsSubmittingCart] = useState(false);

  // Fetch smart shopping list from backend API
  const fetchShoppingList = async () => {
    try {
      const res = await plannerService.getSmartShoppingList();
      if (res && Array.isArray(res.items)) {
        setShoppingItems(
          res.items.map((i) => ({
            id: i._id || i.id || `item-${Math.random()}`,
            name: i.name,
            amount: i.amount || "1",
            category: i.category || "Rau củ",
            price: i.price ? `${i.price.toLocaleString("vi-VN")}đ` : "25.000đ",
            bought: Boolean(i.bought),
          }))
        );
        if (res.estimatedTotalCost !== undefined) {
          setEstimatedCost(res.estimatedTotalCost);
        }
        if (res.fridgeItemsExcludedCount !== undefined) {
          setExcludedCount(res.fridgeItemsExcludedCount);
        }
      }
    } catch (e) {
      console.warn("fetchShoppingList API failed, using fallback:", e);
    }
  };

  useEffect(() => {
    if (activeSubTab === "shopping") {
      const timer = setTimeout(() => {
        void fetchShoppingList();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeSubTab]);

  const toggleShoppingItem = async (id: string) => {
    const item = shoppingItems.find((s) => s.id === id);
    const newBought = item ? !item.bought : false;

    // Instant UI update
    setShoppingItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, bought: newBought } : it))
    );

    // Persist to backend
    if (id && !id.startsWith("s-")) {
      await plannerService.toggleBoughtStatus(id, newBought);
    }
  };

  const handleRemoveShoppingItem = async (id: string, name: string) => {
    Alert.alert("Xác nhận", `Xóa "${name}" khỏi danh sách đi chợ?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          setShoppingItems((prev) => prev.filter((i) => i.id !== id));
          CartService.removeItem(id, name);
          const target = id && !id.startsWith("s-") ? id : name;
          await plannerService.removeCartItem(target);
        },
      },
    ]);
  };

  const handleClearBoughtItems = async () => {
    Alert.alert(
      "Dọn dẹp món đã mua",
      "Bạn muốn xóa tất cả các món đã tích chọn là đã mua?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Dọn dẹp",
          style: "destructive",
          onPress: async () => {
            setShoppingItems((prev) => prev.filter((i) => !i.bought));
            await plannerService.clearBoughtItems();
            fetchShoppingList();
          },
        },
      ]
    );
  };

  const handleSaveCartItem = async () => {
    if (!newCartName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên nguyên liệu");
      return;
    }
    try {
      setIsSubmittingCart(true);
      await plannerService.addCartItem({
        name: newCartName.trim(),
        amount: newCartAmount.trim() || "1 phần",
        price: parseInt(newCartPrice, 10) || 0,
        category: newCartCategory,
      });
      setShowAddCartModal(false);
      setNewCartName("");
      await fetchShoppingList();
    } catch (e: any) {
      Alert.alert("Lỗi", "Không thể thêm nguyên liệu");
    } finally {
      setIsSubmittingCart(false);
    }
  };

  const handleSyncToFridge = async () => {
    const boughtCount = shoppingItems.filter((s) => s.bought).length;
    if (boughtCount === 0) {
      Alert.alert("Thông báo", "Bạn chưa tích chọn nguyên liệu nào đã mua xong!");
      return;
    }

    try {
      setIsSyncingFridge(true);
      const res = await plannerService.syncBoughtToFridge();
      Alert.alert(
        "✨ Đồng Bộ Thành Công",
        `Đã tự động chuyển ${res?.syncedCount || boughtCount} nguyên liệu đã mua vào kho Tủ Lạnh của bạn!`,
        [{ text: "Đóng" }]
      );
      fetchShoppingList();
    } catch (e: any) {
      Alert.alert("Thông báo", "Đã ghi nhận chuyển nguyên liệu vào tủ lạnh!");
    } finally {
      setIsSyncingFridge(false);
    }
  };

  const unboughtCount = shoppingItems.filter((s) => !s.bought).length;

  // Chef Rewards & Daily Check-in States
  const [rewardStatus, setRewardStatus] = useState<RewardStatus | null>(null);
  const [isLoadingRewards, setIsLoadingRewards] = useState(false);
  const [isClaimingCheckIn, setIsClaimingCheckIn] = useState(false);
  const [redeemingRewardId, setRedeemingRewardId] = useState<string | null>(null);
  const [rewardsSubTab, setRewardsSubTab] = useState<"catalog" | "my_rewards">("catalog");

  const fetchRewardStatus = async () => {
    try {
      setIsLoadingRewards(true);
      const data = await rewardService.getRewardStatus();
      if (data) {
        setRewardStatus(data);
      }
    } catch (e) {
      console.warn("fetchRewardStatus failed:", e);
    } finally {
      setIsLoadingRewards(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "rewards" && !rewardStatus) {
      void fetchRewardStatus();
    }
  }, [activeSubTab, rewardStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchRewardStatus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const todayRewardXp = useMemo(() => {
    const streak = rewardStatus?.streakDays ?? 0;
    const rewards = rewardStatus?.streakRewards || [15, 20, 25, 30, 40, 50, 100];
    return rewards[streak] || 15;
  }, [rewardStatus]);

  const handleCheckIn = async () => {
    if (rewardStatus?.hasCheckedInToday || isClaimingCheckIn) return;
    try {
      setIsClaimingCheckIn(true);
      const res = await rewardService.checkInToday();
      triggerHaptic("success");

      setRewardStatus((prev) =>
        prev
          ? {
              ...prev,
              chefExp: res.chefExp,
              level: res.level,
              streakDays: res.streakDays,
              hasCheckedInToday: true,
            }
          : null
      );

      if (onXpUpdated) {
        onXpUpdated(res.chefExp, res.level);
      }

      Alert.alert(
        "🎉 Điểm Danh Thành Công!",
        `Bạn nhận được +${res.xpGained} XP!\nChuỗi hiện tại: ${res.streakDays} ngày liên tiếp.\nTổng kinh nghiệm: ${res.chefExp} XP (${res.level}).`
      );
    } catch (err: any) {
      Alert.alert(
        "Thông báo",
        err.response?.data?.message || err.message || "Điểm danh không thành công"
      );
    } finally {
      setIsClaimingCheckIn(false);
    }
  };

  const handleRedeem = (item: RewardCatalogItem) => {
    if (!rewardStatus) return;

    if (rewardStatus.chefExp < item.xpCost) {
      Alert.alert(
        "Chưa đủ điểm Chef XP",
        `Bạn cần ${item.xpCost} XP để đổi phần quà này (Hiện có: ${rewardStatus.chefExp} XP). Nấu ăn và điểm danh mỗi ngày để tích thêm XP nhé!`
      );
      return;
    }

    Alert.alert(
      "Xác nhận đổi quà",
      `Bạn có muốn dùng ${item.xpCost} XP để đổi "${item.title}" không?`,
      [
        { text: "Để sau", style: "cancel" },
        {
          text: "Đổi ngay",
          style: "default",
          onPress: async () => {
            setRedeemingRewardId(item.id);
            try {
              const res = await rewardService.redeemReward(item.id);
              triggerHaptic("success");

              setRewardStatus((prev) =>
                prev
                  ? {
                      ...prev,
                      chefExp: res.remainingExp,
                      claimedRewards: [res.reward, ...prev.claimedRewards],
                    }
                  : null
              );

              if (onXpUpdated && rewardStatus) {
                onXpUpdated(res.remainingExp, rewardStatus.level);
              }

              Alert.alert(
                "🎁 Đổi Quà Thành Công!",
                `Mã ưu đãi của bạn: [${res.reward.code}]. Bạn có thể xem lại mã trong tab 'Quà Của Tôi'.`,
                [
                  {
                    text: "Xem mã quà",
                    onPress: () => setRewardsSubTab("my_rewards"),
                  },
                  { text: "Đóng" },
                ]
              );
            } catch (err: any) {
              Alert.alert(
                "Lỗi đổi quà",
                err.response?.data?.message || "Không thể đổi phần quà này."
              );
            } finally {
              setRedeemingRewardId(null);
            }
          },
        },
      ]
    );
  };

  const handleCopyCode = (code: string) => {
    Clipboard.setString(code);
    triggerHaptic("selection");
    Alert.alert("Đã sao chép", `Mã ưu đãi [${code}] đã được sao chép vào bộ nhớ tạm!`);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insetsTop + 4 }]}>
        <View>
          <Text style={styles.headerSubtitle}>
            {activeSubTab === "calendar"
              ? "KẾ HOẠCH BỮA ĂN"
              : activeSubTab === "shopping"
              ? "DANH SÁCH MUA SẮM"
              : "HỘP QUÀ & TÍCH ĐIỂM"}
          </Text>
          <Text style={styles.headerTitle}>
            {activeSubTab === "calendar"
              ? "Thực Đơn Tuần"
              : activeSubTab === "shopping"
              ? "Danh Sách Đi Chợ"
              : "Thưởng Chef"}
          </Text>
        </View>
      </View>

      {/* 3-Tab Segmented Switcher */}
      <View style={styles.subTabSegmentContainer}>
        <TouchableOpacity
          style={[
            styles.subTabSegmentBtn,
            activeSubTab === "calendar" && styles.subTabSegmentBtnActive,
          ]}
          onPress={() => setActiveSubTab("calendar")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="calendar"
            size={14}
            color={activeSubTab === "calendar" ? "#171717" : "#5E5E5E"}
          />
          <Text
            style={[
              styles.subTabSegmentText,
              activeSubTab === "calendar" && styles.subTabSegmentTextActive,
            ]}
          >
            Lịch Ăn
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.subTabSegmentBtn,
            activeSubTab === "shopping" && styles.subTabSegmentBtnActive,
          ]}
          onPress={() => setActiveSubTab("shopping")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="cart"
            size={14}
            color={activeSubTab === "shopping" ? "#171717" : "#5E5E5E"}
          />
          <Text
            style={[
              styles.subTabSegmentText,
              activeSubTab === "shopping" && styles.subTabSegmentTextActive,
            ]}
          >
            Đi Chợ {unboughtCount > 0 ? `(${unboughtCount})` : ""}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.subTabSegmentBtn,
            activeSubTab === "rewards" && styles.subTabSegmentBtnActive,
          ]}
          onPress={() => setActiveSubTab("rewards")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="gift"
            size={14}
            color={activeSubTab === "rewards" ? "#171717" : "#5E5E5E"}
          />
          <Text
            style={[
              styles.subTabSegmentText,
              activeSubTab === "rewards" && styles.subTabSegmentTextActive,
            ]}
          >
            Thưởng Chef
          </Text>
          {rewardStatus && !rewardStatus.hasCheckedInToday && (
            <View style={styles.rewardsBadgeDot} />
          )}
        </TouchableOpacity>
      </View>

      {/* VIEW 1: WEEKLY CALENDAR MEAL PLAN */}
      {activeSubTab === "calendar" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
          {/* Week Horizontal Date Picker */}
          <View style={styles.weekPickerRow}>
            {weekDays.map((w, idx) => {
              const isSelected = selectedDay === w.day;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.dayChip,
                    isSelected && styles.dayChipActive,
                  ]}
                  onPress={() => setSelectedDay(w.day)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextActive,
                    ]}
                  >
                    {w.day}
                  </Text>
                  <Text
                    style={[
                      styles.dateText,
                      isSelected && styles.dateTextActive,
                    ]}
                  >
                    {w.date}
                  </Text>
                  {isSelected && <View style={styles.dayDot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Daily Calorie Summary Progress Card */}
          <View style={styles.dailyCalorieCard}>
            <View style={styles.calorieCardTop}>
              <View>
                <Text style={styles.calorieCardTitle}>
                  Mục tiêu {selectedDay}: 2.000 kcal
                </Text>
                <Text style={styles.calorieCardSub}>
                  Đã lên thực đơn {activeDayMeals.length} bữa ({totalCalories} kcal)
                </Text>
              </View>
              <View style={styles.calorieTag}>
                <Text style={styles.calorieTagText}>
                  Đạt {Math.min(100, Math.round((totalCalories / 2000) * 100))}%
                </Text>
              </View>
            </View>

            <View style={styles.calorieBarBg}>
              <View
                style={[
                  styles.calorieBarFill,
                  { width: `${Math.min(100, (totalCalories / 2000) * 100)}%` },
                ]}
              />
            </View>
          </View>

          {/* Meals List for Selected Day */}
          <View style={styles.mealsListSection}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={styles.sectionHeading}>
                Thực đơn chi tiết {selectedDay}
              </Text>
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: BrandColors.inputBg,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 12,
                  gap: 4,
                }}
                onPress={() => setShowAddMealModal(true)}
              >
                <Ionicons name="add" size={15} color={BrandColors.primary} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: BrandColors.primary }}>
                  + Thêm món
                </Text>
              </TouchableOpacity>
            </View>

            {isLoadingPlan ? (
              <ActivityIndicator size="small" color={BrandColors.primary} style={{ marginVertical: 20 }} />
            ) : (
              activeDayMeals.map((meal, index) => (
                <View key={index} style={styles.mealSlotCard}>
                  <TouchableOpacity
                    style={{ flexDirection: "row", flex: 1, alignItems: "center", gap: 12 }}
                    activeOpacity={0.88}
                    onPress={() => {
                      if (meal.recipe?.id) {
                        router.push({
                          pathname: "/recipe-detail",
                          params: { id: meal.recipe.id },
                        });
                      }
                    }}
                  >
                    <Image source={meal.recipe.image} style={styles.mealSlotImg} />
                    <View style={styles.mealSlotInfo}>
                      <View style={styles.slotHeaderRow}>
                        <View style={styles.slotBadge}>
                          <Text style={styles.slotBadgeText}>{meal.slot}</Text>
                        </View>
                        <Text style={styles.slotTimeText}>{meal.time}</Text>
                      </View>

                      <Text style={styles.mealSlotTitle} numberOfLines={1}>
                        {meal.customTitle}
                      </Text>
                      <Text style={styles.mealSlotMeta}>
                        🔥 {meal.calories} kcal • ⏱ {meal.recipe.minutes} phút
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ padding: 6 }}
                    onPress={() => handleRemoveMeal(meal.slot, meal.customTitle)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#242424" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* Add Meal Modal */}
          <Modal visible={showAddMealModal} transparent animationType="fade">
            <DismissKeyboard>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.modalOverlay}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Thêm món vào {selectedDay}</Text>
                  <TouchableOpacity onPress={() => setShowAddMealModal(false)}>
                    <Ionicons name="close" size={22} color={BrandColors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Slot Selector */}
                <Text style={styles.inputLabel}>Chọn bữa ăn</Text>
                <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
                  {(["Bữa Sáng", "Bữa Trưa", "Bữa Tối", "Bữa Phụ"] as const).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.slotOption,
                        selectedSlot === s && styles.slotOptionActive,
                      ]}
                      onPress={() => setSelectedSlot(s)}
                    >
                      <Text
                        style={[
                          styles.slotOptionText,
                          selectedSlot === s && styles.slotOptionTextActive,
                        ]}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Quick Recipes Picker */}
                <Text style={styles.inputLabel}>Gợi ý món phổ biến</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {RECIPES_DATA.slice(0, 4).map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={styles.quickRecipeChip}
                      onPress={() => {
                        setMealTitle(r.title);
                        setMealCalories(r.calories.toString());
                      }}
                    >
                      <Text style={styles.quickRecipeText}>{r.title}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>Tên món ăn</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ví dụ: Bò xào hành cần tây"
                  placeholderTextColor={BrandColors.textPlaceholder}
                  value={mealTitle}
                  onChangeText={setMealTitle}
                />

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Lượng Calo (kcal)</Text>
                    <TextInput
                      style={styles.modalInput}
                      keyboardType="numeric"
                      value={mealCalories}
                      onChangeText={setMealCalories}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Giờ ăn</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={mealTime}
                      onChangeText={setMealTime}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSaveMealSlot}
                  disabled={isSubmittingMeal}
                >
                  <Text style={styles.modalSaveBtnText}>
                    {isSubmittingMeal ? "Đang lưu..." : "Lưu vào thực đơn"}
                  </Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
            </DismissKeyboard>
          </Modal>
        </ScrollView>
      )}

      {/* VIEW 2: SMART SHOPPING LIST (MODULE 13) */}
      {activeSubTab === "shopping" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
          {/* Smart Shopping Cost Summary */}
          <View style={styles.shoppingSummaryCard}>
            <View>
              <Text style={styles.shopSumTitle}>Ước tính chi phí mua sắm</Text>
              <Text style={styles.shopSumSub}>
                Đã tự động loại trừ {excludedCount} nguyên liệu có trong Tủ Lạnh
              </Text>
            </View>
            <Text style={styles.shopSumPrice}>~{estimatedCost.toLocaleString("vi-VN")}đ</Text>
          </View>

          {/* Checklist Items */}
          <View style={styles.shoppingListSection}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={styles.sectionHeading}>
                Cần mua cho tuần ({unboughtCount} món)
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {shoppingItems.some((s) => s.bought) && (
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#EEEEEE",
                      paddingHorizontal: 8,
                      paddingVertical: 5,
                      borderRadius: 10,
                      gap: 4,
                    }}
                    onPress={handleClearBoughtItems}
                  >
                    <Ionicons name="trash-bin-outline" size={13} color="#212121" />
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#212121" }}>
                      Dọn đồ đã mua
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: BrandColors.inputBg,
                    paddingHorizontal: 8,
                    paddingVertical: 5,
                    borderRadius: 10,
                    gap: 4,
                  }}
                  onPress={() => setShowAddCartModal(true)}
                >
                  <Ionicons name="add" size={14} color={BrandColors.primary} />
                  <Text style={{ fontSize: 11, fontWeight: "700", color: BrandColors.primary }}>
                    + Thêm món
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {shoppingItems.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.shopItemRow,
                  item.bought && styles.shopItemRowBought,
                ]}
              >
                <TouchableOpacity
                  style={{ flexDirection: "row", flex: 1, alignItems: "center", gap: 12 }}
                  onPress={() => toggleShoppingItem(item.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.shopCheckbox,
                      item.bought && styles.shopCheckboxChecked,
                    ]}
                  >
                    {item.bought && (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.shopItemName,
                        item.bought && styles.shopItemNameCrossed,
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text style={styles.shopItemCategory}>
                      {item.category} • {item.amount}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.shopItemPrice,
                      item.bought && { color: BrandColors.textPlaceholder },
                    ]}
                  >
                    {item.price}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ padding: 4, marginLeft: 6 }}
                  onPress={() => handleRemoveShoppingItem(item.id, item.name)}
                >
                  <Ionicons name="close-circle-outline" size={18} color="#C7C7C7" />
                </TouchableOpacity>
              </View>
            ))}

            {/* Sync to Fridge Button */}
            {shoppingItems.some((s) => s.bought) && (
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#353535",
                  marginTop: 12,
                  paddingVertical: 13,
                  borderRadius: 14,
                  gap: 8,
                }}
                onPress={handleSyncToFridge}
                disabled={isSyncingFridge}
                activeOpacity={0.8}
              >
                <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
                <Text style={{ color: "#FFFFFF", fontSize: 13.5, fontWeight: "700" }}>
                  {isSyncingFridge ? "Đang đồng bộ..." : "Đồng bộ đồ đã mua vào Tủ Lạnh"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Add Shopping Item Modal */}
          <Modal visible={showAddCartModal} transparent animationType="fade">
            <DismissKeyboard>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.modalOverlay}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Thêm nguyên liệu cần mua</Text>
                  <TouchableOpacity onPress={() => setShowAddCartModal(false)}>
                    <Ionicons name="close" size={22} color={BrandColors.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Tên nguyên liệu</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ví dụ: Tôm tươi, Nấm đông cô"
                  placeholderTextColor={BrandColors.textPlaceholder}
                  value={newCartName}
                  onChangeText={setNewCartName}
                />

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Số lượng</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="500g / 1 bó"
                      value={newCartAmount}
                      onChangeText={setNewCartAmount}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Đơn giá dự kiến</Text>
                    <TextInput
                      style={styles.modalInput}
                      keyboardType="numeric"
                      placeholder="35000"
                      value={newCartPrice}
                      onChangeText={setNewCartPrice}
                    />
                  </View>
                </View>

                <Text style={styles.inputLabel}>Phân loại</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                  {["Rau củ", "Thịt & Cá", "Gia vị", "Trái cây", "Đồ khô"].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catOption,
                        newCartCategory === cat && styles.catOptionActive,
                      ]}
                      onPress={() => setNewCartCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.catOptionText,
                          newCartCategory === cat && styles.catOptionTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSaveCartItem}
                  disabled={isSubmittingCart}
                >
                  <Text style={styles.modalSaveBtnText}>
                    {isSubmittingCart ? "Đang thêm..." : "Thêm vào danh sách"}
                  </Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
            </DismissKeyboard>
          </Modal>

          {/* Siêu thị gần bạn để đi chợ */}
          <NearbyStoreCard
            style={{ marginTop: 14 }}
            title="Siêu thị gần bạn để đi chợ"
          />
        </ScrollView>
      )}

      {/* VIEW 3: CHEF REWARDS & CHECK-IN */}
      {activeSubTab === "rewards" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {isLoadingRewards && !rewardStatus ? (
            <View style={styles.rewardsLoadingBox}>
              <ActivityIndicator size="large" color={BrandColors.textDark} />
              <Text style={styles.rewardsLoadingText}>Đang tải hộp quà & điểm thưởng...</Text>
            </View>
          ) : (
            <>
              {/* 1. Chef Pass & Balance Card */}
              <View style={styles.chefStatusCard}>
                {/* Top: Rank badge + Streak pill */}
                <View style={styles.chefCardTopRow}>
                  <View style={styles.chefRankBadge}>
                    <Ionicons name="ribbon-outline" size={13} color={BrandColors.textBody} />
                    <Text style={styles.chefRankText}>{rewardStatus?.level || "Tập sự"}</Text>
                  </View>

                  <View style={styles.streakFlamePill}>
                    <Ionicons name="flame" size={15} color={BrandColors.textDark} />
                    <Text style={styles.streakFlameNum}>{rewardStatus?.streakDays ?? 0}</Text>
                    <Text style={styles.streakFlameLabel}>ngày liên tiếp</Text>
                  </View>
                </View>

                {/* Middle: Prominent XP Balance */}
                <View style={styles.chefBalanceBox}>
                  <Text style={styles.chefBalanceLabel}>ĐIỂM TÍCH LŨY CHEF XP</Text>
                  <View style={styles.chefBalanceValueRow}>
                    <Text style={styles.chefXpNumber}>{rewardStatus?.chefExp ?? 0}</Text>
                    <Text style={styles.chefXpUnit}>XP</Text>
                  </View>
                </View>

                {/* Subtle Divider */}
                <View style={styles.chefCardDivider} />

                {/* 7-Day Streak Tracker */}
                <View style={styles.streakTrackerSection}>
                  <View style={styles.streakTrackerHeader}>
                    <Text style={styles.streakTrackerTitle}>Chuỗi điểm danh 7 ngày</Text>
                    <View style={styles.streakTrackerStatusRow}>
                      <View
                        style={[
                          styles.streakTrackerStatusDot,
                          rewardStatus?.hasCheckedInToday && styles.streakTrackerStatusDotDone,
                        ]}
                      />
                      <Text
                        style={[
                          styles.streakTrackerStatus,
                          rewardStatus?.hasCheckedInToday && styles.streakTrackerStatusDone,
                        ]}
                      >
                        {rewardStatus?.hasCheckedInToday
                          ? "Đã điểm danh hôm nay"
                          : "Chưa điểm danh hôm nay"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.streakPillRow}>
                    {(rewardStatus?.streakRewards || [15, 20, 25, 30, 40, 50, 100]).map(
                      (xpReward, index) => {
                        const dayNum = index + 1;
                        const streak = rewardStatus?.streakDays ?? 0;
                        const isPassed = rewardStatus?.hasCheckedInToday
                          ? dayNum <= streak
                          : dayNum < streak + 1;
                        const isToday =
                          !rewardStatus?.hasCheckedInToday && dayNum === streak + 1;

                        return (
                          <View
                            key={`streak-${dayNum}`}
                            style={[
                              styles.streakDayBox,
                              isPassed && styles.streakDayBoxPassed,
                              isToday && styles.streakDayBoxToday,
                            ]}
                          >
                            <Text
                              style={[
                                styles.streakDayLabel,
                                isToday && styles.streakDayLabelToday,
                              ]}
                            >
                              N{dayNum}
                            </Text>
                            <View style={styles.streakDayIcon}>
                              {isPassed ? (
                                <Ionicons name="checkmark-circle" size={15} color={BrandColors.textBody} />
                              ) : dayNum === 7 ? (
                                <Ionicons
                                  name="gift-outline"
                                  size={14}
                                  color={isToday ? "#171717" : "#4A4A4A"}
                                />
                              ) : (
                                <Ionicons
                                  name="sparkles"
                                  size={12}
                                  color={isToday ? "#171717" : "#C7C7C7"}
                                />
                              )}
                            </View>
                            <Text
                              style={[
                                styles.streakDayXp,
                                isToday && styles.streakDayXpToday,
                              ]}
                            >
                              +{xpReward}
                            </Text>
                          </View>
                        );
                      }
                    )}
                  </View>
                </View>

                {/* 1-Tap Check-in Button */}
                <TouchableOpacity
                  style={[
                    styles.checkInBtnWrapper,
                    rewardStatus?.hasCheckedInToday && styles.checkInBtnDisabled,
                  ]}
                  activeOpacity={0.8}
                  disabled={rewardStatus?.hasCheckedInToday || isClaimingCheckIn}
                  onPress={handleCheckIn}
                >
                  {isClaimingCheckIn ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : rewardStatus?.hasCheckedInToday ? (
                    <View style={styles.checkedInRow}>
                      <Ionicons name="checkmark-circle" size={16} color={BrandColors.textBody} />
                      <Text style={styles.checkedInText}>
                        Đã điểm danh hôm nay (Quay lại vào ngày mai)
                      </Text>
                    </View>
                  ) : (
                    <LinearGradient
                      colors={["#171717", "#292929"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.checkInGradientBtn}
                    >
                      <Ionicons name="gift-outline" size={17} color="#FFFFFF" />
                      <Text style={styles.checkInGradientText}>
                        Điểm danh nhận ngay +{todayRewardXp} XP
                      </Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              </View>

              {/* 2. Rewards Sub-segment: Đổi Voucher vs Quà Của Tôi */}
              <View style={styles.rewardsSegmentRow}>
                <TouchableOpacity
                  style={[
                    styles.rewardsSegmentBtn,
                    rewardsSubTab === "catalog" && styles.rewardsSegmentBtnActive,
                  ]}
                  onPress={() => setRewardsSubTab("catalog")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="pricetags-outline"
                    size={14}
                    color={rewardsSubTab === "catalog" ? "#171717" : "#5E5E5E"}
                  />
                  <Text
                    style={[
                      styles.rewardsSegmentText,
                      rewardsSubTab === "catalog" && styles.rewardsSegmentTextActive,
                    ]}
                  >
                    Đổi Voucher ({rewardStatus?.catalog.length || 0})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.rewardsSegmentBtn,
                    rewardsSubTab === "my_rewards" && styles.rewardsSegmentBtnActive,
                  ]}
                  onPress={() => setRewardsSubTab("my_rewards")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="wallet-outline"
                    size={14}
                    color={rewardsSubTab === "my_rewards" ? "#171717" : "#5E5E5E"}
                  />
                  <Text
                    style={[
                      styles.rewardsSegmentText,
                      rewardsSubTab === "my_rewards" && styles.rewardsSegmentTextActive,
                    ]}
                  >
                    Quà Của Tôi ({rewardStatus?.claimedRewards.length || 0})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 3. Catalog List */}
              {rewardsSubTab === "catalog" && (
                <View style={styles.voucherListSection}>
                  {(rewardStatus?.catalog || []).map((item) => {
                    const canAfford = (rewardStatus?.chefExp ?? 0) >= item.xpCost;
                    const isRedeeming = redeemingRewardId === item.id;
                    const brandLogo = getBrandLogoSource(
                      item.brand,
                      item.title,
                      item.icon,
                      (item as any).imageUrl
                    );

                    return (
                      <View key={item.id} style={styles.voucherCard}>
                        {/* Authentic Brand Logo Image Box */}
                        <View style={styles.voucherBrandIcon}>
                          {brandLogo ? (
                            <Image
                              source={brandLogo}
                              style={styles.voucherBrandImage}
                              resizeMode="contain"
                            />
                          ) : (
                            <MaterialCommunityIcons
                              name={
                                item.icon === "cart"
                                  ? "cart-outline"
                                  : item.icon === "basket"
                                  ? "basket-outline"
                                  : item.icon === "star"
                                  ? "star-outline"
                                  : "gift-outline"
                              }
                              size={22}
                              color={BrandColors.textBody}
                            />
                          )}
                        </View>

                        {/* Voucher Info */}
                        <View style={styles.voucherInfoBox}>
                          <View style={styles.voucherBrandRow}>
                            <Text style={styles.voucherBrandLabel}>{item.brand}</Text>
                            <View style={styles.voucherValueBadge}>
                              <Text style={styles.voucherValueBadgeText}>
                                {item.discountValue}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.voucherTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={styles.voucherDesc} numberOfLines={1}>
                            {item.description}
                          </Text>
                        </View>

                        {/* Fast Redeem Button */}
                        <TouchableOpacity
                          style={[
                            styles.voucherRedeemBtn,
                            !canAfford && styles.voucherRedeemBtnDisabled,
                          ]}
                          activeOpacity={0.8}
                          disabled={isRedeeming}
                          onPress={() => handleRedeem(item)}
                        >
                          {isRedeeming ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <Ionicons
                                name={canAfford ? "sparkles" : "lock-closed-outline"}
                                size={12}
                                color={canAfford ? "#FFFFFF" : "#686868"}
                              />
                              <Text
                                style={[
                                  styles.voucherRedeemBtnText,
                                  !canAfford && styles.voucherRedeemBtnTextDisabled,
                                ]}
                              >
                                {item.xpCost} XP
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* 4. My Claimed Rewards */}
              {rewardsSubTab === "my_rewards" && (
                <View style={styles.claimedListSection}>
                  {!rewardStatus?.claimedRewards ||
                  rewardStatus.claimedRewards.length === 0 ? (
                    <View style={styles.emptyClaimedBox}>
                      <Ionicons name="ticket-outline" size={38} color="#C7C7C7" />
                      <Text style={styles.emptyClaimedTitle}>
                        Chưa có voucher nào
                      </Text>
                      <Text style={styles.emptyClaimedDesc}>
                        Dùng điểm Chef XP tích lũy từ nấu ăn và điểm danh để đổi voucher siêu thị nhé!
                      </Text>
                    </View>
                  ) : (
                    rewardStatus.claimedRewards.map((reward) => {
                      const brandLogo = getBrandLogoSource(
                        undefined,
                        reward.title,
                        reward.type,
                        undefined
                      );

                      return (
                        <View key={reward.id} style={styles.claimedCard}>
                          <View style={styles.claimedCardHeader}>
                            <View style={styles.claimedBrandHeader}>
                              {brandLogo && (
                                <View style={styles.claimedBrandIconSmall}>
                                  <Image
                                    source={brandLogo}
                                    style={styles.voucherBrandImage}
                                    resizeMode="contain"
                                  />
                                </View>
                              )}
                              <View style={styles.claimedTag}>
                                <Ionicons name="pricetag-outline" size={11} color={BrandColors.textDark} />
                                <Text style={styles.claimedTagText}>
                                  {reward.discountValue}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.claimedExpiry}>
                              HSD: {new Date(reward.expiresAt).toLocaleDateString("vi-VN")}
                            </Text>
                          </View>

                          <Text style={styles.claimedCardTitle} numberOfLines={1}>
                            {reward.title}
                          </Text>

                          {/* Monospace Code + 1-Tap Copy */}
                          <View style={styles.claimedCodeRow}>
                            <View style={styles.claimedCodeBox}>
                              <Text style={styles.claimedCodeText}>{reward.code}</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.claimedCopyBtn}
                              activeOpacity={0.8}
                              onPress={() => handleCopyCode(reward.code)}
                            >
                              <Ionicons name="copy-outline" size={14} color={BrandColors.textDark} />
                              <Text style={styles.claimedCopyBtnText}>Sao chép</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: "800",
    color: BrandColors.textMuted,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: BrandColors.textDark,
    marginTop: 2,
  },
  subTabSegmentContainer: {
    flexDirection: "row",
    backgroundColor: BrandColors.inputBg,
    marginHorizontal: 16,
    padding: 3,
    borderRadius: 14,
    marginBottom: 14,
  },
  subTabSegmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 11,
    gap: 5,
    position: "relative",
  },
  subTabSegmentBtnActive: {
    backgroundColor: BrandColors.surfaceCard,
    shadowColor: "#171717",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  subTabSegmentText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: BrandColors.textMuted,
  },
  subTabSegmentTextActive: {
    color: BrandColors.textDark,
    fontWeight: "700",
  },
  rewardsBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#171717",
    position: "absolute",
    top: 8,
    right: 8,
  },
  weekPickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  dayChip: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: BrandColors.surfaceCard,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    width: 44,
  },
  dayChipActive: {
    backgroundColor: BrandColors.inputBg,
    borderColor: BrandColors.primary,
  },
  dayText: {
    fontSize: 11,
    color: BrandColors.textMuted,
    fontWeight: "600",
    marginBottom: 2,
  },
  dayTextActive: {
    color: BrandColors.primary,
    fontWeight: "800",
  },
  dateText: {
    fontSize: 14,
    fontWeight: "800",
    color: BrandColors.textDark,
  },
  dateTextActive: {
    color: BrandColors.primary,
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: BrandColors.primary,
    marginTop: 4,
  },
  dailyCalorieCard: {
    marginHorizontal: 20,
    backgroundColor: BrandColors.surfaceCard,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    marginBottom: 20,
  },
  calorieCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  calorieCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: BrandColors.textDark,
  },
  calorieCardSub: {
    fontSize: 12,
    color: BrandColors.textMuted,
    marginTop: 2,
  },
  calorieTag: {
    backgroundColor: BrandColors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  calorieTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#262626",
  },
  calorieBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: BrandColors.inputBg,
    overflow: "hidden",
  },
  calorieBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#353535",
  },
  mealsListSection: {
    paddingHorizontal: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: BrandColors.textDark,
    marginBottom: 12,
  },
  mealSlotCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.surfaceCard,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    gap: 12,
  },
  mealSlotImg: {
    width: 65,
    height: 65,
    borderRadius: 14,
  },
  mealSlotInfo: {
    flex: 1,
  },
  slotHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  slotBadge: {
    backgroundColor: BrandColors.inputBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  slotBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
  slotTimeText: {
    fontSize: 11,
    color: BrandColors.textPlaceholder,
    fontWeight: "600",
  },
  mealSlotTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: BrandColors.textDark,
    marginBottom: 3,
  },
  mealSlotMeta: {
    fontSize: 11.5,
    color: BrandColors.textMuted,
  },
  slotDetailBtn: {
    backgroundColor: BrandColors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  slotDetailBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
  shoppingSummaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    backgroundColor: BrandColors.surfaceMuted,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    marginBottom: 20,
  },
  shopSumTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#292929",
  },
  shopSumSub: {
    fontSize: 11,
    color: "#282828",
    marginTop: 2,
  },
  shopSumPrice: {
    fontSize: 18,
    fontWeight: "900",
    color: BrandColors.textDark,
  },
  shoppingListSection: {
    paddingHorizontal: 20,
  },
  shopItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.surfaceCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    gap: 12,
  },
  shopItemRowBought: {
    backgroundColor: BrandColors.background,
    opacity: 0.65,
  },
  shopCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#C7C7C7",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BrandColors.surfaceCard,
  },
  shopCheckboxChecked: {
    backgroundColor: "#353535",
    borderColor: "#353535",
  },
  shopItemName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
  shopItemNameCrossed: {
    textDecorationLine: "line-through",
    color: BrandColors.textPlaceholder,
  },
  shopItemCategory: {
    fontSize: 11,
    color: BrandColors.textMuted,
    marginTop: 2,
  },
  shopItemPrice: {
    fontSize: 12.5,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(27, 27, 27, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: BrandColors.surfaceCard,
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: BrandColors.textDark,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: BrandColors.textBody,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: BrandColors.background,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: BrandColors.textDark,
    marginBottom: 12,
  },
  slotOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: BrandColors.inputBg,
    alignItems: "center",
  },
  slotOptionActive: {
    backgroundColor: BrandColors.primary,
  },
  slotOptionText: {
    fontSize: 11,
    fontWeight: "700",
    color: BrandColors.textMuted,
  },
  slotOptionTextActive: {
    color: "#FFFFFF",
  },
  quickRecipeChip: {
    backgroundColor: BrandColors.inputBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#DADADA",
  },
  quickRecipeText: {
    fontSize: 11,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
  catOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: BrandColors.inputBg,
  },
  catOptionActive: {
    backgroundColor: BrandColors.primary,
  },
  catOptionText: {
    fontSize: 11,
    fontWeight: "700",
    color: BrandColors.textMuted,
  },
  catOptionTextActive: {
    color: "#FFFFFF",
  },
  modalSaveBtn: {
    backgroundColor: BrandColors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  modalSaveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  /* VIEW 3 REWARDS & CHEF STYLES */
  rewardsLoadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  rewardsLoadingText: {
    fontSize: 13,
    color: BrandColors.textMuted,
    fontWeight: "600",
  },
  chefStatusCard: {
    backgroundColor: BrandColors.surfaceCard,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    shadowColor: "#171717",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  chefCardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  chefRankBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.background,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    gap: 5,
  },
  chefRankText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: BrandColors.textBody,
  },
  streakFlamePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.background,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    gap: 4,
  },
  streakFlameNum: {
    fontSize: 13,
    fontWeight: "800",
    color: BrandColors.textDark,
  },
  streakFlameLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: BrandColors.textMuted,
  },
  chefBalanceBox: {
    marginTop: 2,
    marginBottom: 4,
  },
  chefBalanceLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: BrandColors.textPlaceholder,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  chefBalanceValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  chefXpNumber: {
    fontSize: 32,
    fontWeight: "800",
    color: BrandColors.textDark,
    letterSpacing: -0.5,
  },
  chefXpUnit: {
    fontSize: 14,
    fontWeight: "700",
    color: BrandColors.textMuted,
  },
  chefCardDivider: {
    height: 1,
    backgroundColor: BrandColors.inputBg,
    marginVertical: 14,
  },
  streakTrackerSection: {
    marginBottom: 14,
  },
  streakTrackerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  streakTrackerTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: BrandColors.textBody,
  },
  streakTrackerStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  streakTrackerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C7C7C7",
  },
  streakTrackerStatusDotDone: {
    backgroundColor: "#353535",
  },
  streakTrackerStatus: {
    fontSize: 11.5,
    fontWeight: "600",
    color: BrandColors.textPlaceholder,
  },
  streakTrackerStatusDone: {
    color: "#262626",
    fontWeight: "600",
  },
  streakPillRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 5,
  },
  streakDayBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: BrandColors.background,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  streakDayBoxPassed: {
    backgroundColor: BrandColors.background,
    borderColor: "#C7C7C7",
  },
  streakDayBoxToday: {
    backgroundColor: BrandColors.surfaceCard,
    borderColor: "#171717",
    borderWidth: 1.5,
    shadowColor: "#171717",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  streakDayLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: BrandColors.textMuted,
    marginBottom: 2,
  },
  streakDayLabelToday: {
    color: BrandColors.textDark,
    fontWeight: "800",
  },
  streakDayIcon: {
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  streakDayXp: {
    fontSize: 9.5,
    fontWeight: "700",
    color: BrandColors.textBody,
    marginTop: 2,
  },
  streakDayXpToday: {
    color: BrandColors.textDark,
    fontWeight: "800",
  },
  checkInBtnWrapper: {
    borderRadius: 14,
    overflow: "hidden",
  },
  checkInBtnDisabled: {
    opacity: 0.95,
  },
  checkedInRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BrandColors.background,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  checkedInText: {
    fontSize: 12,
    fontWeight: "600",
    color: BrandColors.textBody,
  },
  checkInGradientBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
  },
  checkInGradientText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  rewardsSegmentRow: {
    flexDirection: "row",
    backgroundColor: BrandColors.inputBg,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  rewardsSegmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  rewardsSegmentBtnActive: {
    backgroundColor: BrandColors.surfaceCard,
    shadowColor: "#171717",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  rewardsSegmentText: {
    fontSize: 12,
    fontWeight: "600",
    color: BrandColors.textMuted,
  },
  rewardsSegmentTextActive: {
    color: BrandColors.textDark,
    fontWeight: "700",
  },
  voucherListSection: {
    paddingHorizontal: 0,
  },
  voucherCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.surfaceCard,
    padding: 12,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    shadowColor: "#171717",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    gap: 12,
  },
  voucherBrandIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: BrandColors.surfaceCard,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#171717",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  voucherBrandImage: {
    width: "100%",
    height: "100%",
  },
  voucherInfoBox: {
    flex: 1,
  },
  voucherBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  voucherBrandLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: BrandColors.textMuted,
    letterSpacing: 0.5,
  },
  voucherValueBadge: {
    backgroundColor: BrandColors.inputBg,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  voucherValueBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: BrandColors.textDark,
  },
  voucherTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: BrandColors.textDark,
    marginBottom: 2,
  },
  voucherDesc: {
    fontSize: 11.5,
    color: BrandColors.textMuted,
  },
  voucherRedeemBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171717",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  voucherRedeemBtnDisabled: {
    backgroundColor: BrandColors.background,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  voucherRedeemBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  voucherRedeemBtnTextDisabled: {
    color: BrandColors.textPlaceholder,
    fontWeight: "600",
  },
  claimedListSection: {
    paddingHorizontal: 0,
  },
  emptyClaimedBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 30,
    gap: 8,
  },
  emptyClaimedTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: BrandColors.textBody,
  },
  emptyClaimedDesc: {
    fontSize: 12.5,
    color: BrandColors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  claimedCard: {
    backgroundColor: BrandColors.surfaceCard,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    shadowColor: "#171717",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  claimedCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  claimedBrandHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  claimedBrandIconSmall: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: BrandColors.surfaceCard,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  claimedTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.inputBg,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  claimedTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: BrandColors.textDark,
  },
  claimedExpiry: {
    fontSize: 11,
    color: BrandColors.textMuted,
    fontWeight: "500",
  },
  claimedCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: BrandColors.textDark,
    marginBottom: 10,
  },
  claimedCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  claimedCodeBox: {
    flex: 1,
    backgroundColor: BrandColors.background,
    borderWidth: 1,
    borderColor: "#C7C7C7",
    borderStyle: "dashed",
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  claimedCodeText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 13.5,
    fontWeight: "700",
    color: BrandColors.textDark,
    letterSpacing: 1,
  },
  claimedCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.surfaceCard,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  claimedCopyBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
});

