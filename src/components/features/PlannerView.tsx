import { BrandColors } from "@/constants/brandColors";
import DismissKeyboard from "@/components/common/DismissKeyboard";
import { NearbyStoreCard } from "@/components/planner";
import { RECIPES_DATA } from "@/data/recipesData";
import {
  PlannerMealSlot,
  plannerService,
  WeeklyPlanResponse,
} from "@/services/plannerService";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

export default function PlannerView({ insetsTop }: { insetsTop: number }) {
  const router = useRouter();

  const [activeSubTab, setActiveSubTab] = useState<"calendar" | "shopping">(
    "calendar"
  );
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
  const [shoppingItems, setShoppingItems] = useState([
    { id: "s-1", name: "Thịt thăn bò Tenderloin", amount: "500g", category: "Thịt & Cá", price: "95.000đ", bought: false },
    { id: "s-2", name: "Phi lê cá hồi Nauy", amount: "400g", category: "Thịt & Cá", price: "80.000đ", bought: false },
    { id: "s-3", name: "Măng tây xanh tươi", amount: "200g", category: "Rau củ", price: "25.000đ", bought: true },
    { id: "s-4", name: "Cà chua bi hữu cơ", amount: "300g", category: "Rau củ", price: "18.000đ", bought: false },
    { id: "s-5", name: "Bơ lạt Anchor", amount: "100g", category: "Bơ & Gia vị", price: "28.000đ", bought: true },
    { id: "s-6", name: "Phô mai Parmesan", amount: "50g", category: "Bơ & Gia vị", price: "35.000đ", bought: false },
  ]);
  const [estimatedCost, setEstimatedCost] = useState<number>(245000);
  const [excludedCount, setExcludedCount] = useState<number>(3);
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
          if (id && !id.startsWith("s-")) {
            await plannerService.removeCartItem(id);
          }
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insetsTop + 8 }]}>
        <View>
          <Text style={styles.headerSubtitle}>KẾ HOẠCH BỮA ĂN</Text>
          <Text style={styles.headerTitle}>Thực Đơn &amp; Đi Chợ</Text>
        </View>

        {/* Sub-tab Switcher: Lịch Ăn vs Danh Sách Đi Chợ */}
        <View style={styles.subTabPillGroup}>
          <TouchableOpacity
            style={[
              styles.subTabPill,
              activeSubTab === "calendar" && styles.subTabPillActive,
            ]}
            onPress={() => setActiveSubTab("calendar")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="calendar"
              size={13}
              color={activeSubTab === "calendar" ? "#FFFFFF" : "#64748B"}
            />
            <Text
              style={[
                styles.subTabText,
                activeSubTab === "calendar" && styles.subTabTextActive,
              ]}
            >
              Lịch Ăn
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.subTabPill,
              activeSubTab === "shopping" && styles.subTabPillActive,
            ]}
            onPress={() => setActiveSubTab("shopping")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="cart"
              size={13}
              color={activeSubTab === "shopping" ? "#FFFFFF" : "#64748B"}
            />
            <Text
              style={[
                styles.subTabText,
                activeSubTab === "shopping" && styles.subTabTextActive,
              ]}
            >
              Đi Chợ ({unboughtCount})
            </Text>
          </TouchableOpacity>
        </View>
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
                  backgroundColor: "#FFF3E0",
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
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
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
                    <Ionicons name="close" size={22} color="#64748B" />
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
                  placeholderTextColor="#94A3B8"
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
                      backgroundColor: "#FEE2E2",
                      paddingHorizontal: 8,
                      paddingVertical: 5,
                      borderRadius: 10,
                      gap: 4,
                    }}
                    onPress={handleClearBoughtItems}
                  >
                    <Ionicons name="trash-bin-outline" size={13} color="#DC2626" />
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#DC2626" }}>
                      Dọn đồ đã mua
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#FFF3E0",
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
                      item.bought && { color: "#94A3B8" },
                    ]}
                  >
                    {item.price}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ padding: 4, marginLeft: 6 }}
                  onPress={() => handleRemoveShoppingItem(item.id, item.name)}
                >
                  <Ionicons name="close-circle-outline" size={18} color="#CBD5E1" />
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
                  backgroundColor: "#10B981",
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
                    <Ionicons name="close" size={22} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Tên nguyên liệu</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ví dụ: Tôm tươi, Nấm đông cô"
                  placeholderTextColor="#94A3B8"
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
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
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
    color: "#E65100",
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  subTabPillGroup: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    padding: 3,
    borderRadius: 20,
  },
  subTabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  subTabPillActive: {
    backgroundColor: BrandColors.primary,
  },
  subTabText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
  },
  subTabTextActive: {
    color: "#FFFFFF",
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    width: 44,
  },
  dayChipActive: {
    backgroundColor: "#FFF3E0",
    borderColor: BrandColors.primary,
  },
  dayText: {
    fontSize: 11,
    color: "#64748B",
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
    color: "#0F172A",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
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
    color: "#0F172A",
  },
  calorieCardSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  calorieTag: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  calorieTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#059669",
  },
  calorieBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
  },
  calorieBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  mealsListSection: {
    paddingHorizontal: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  mealSlotCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
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
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  slotBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#E65100",
  },
  slotTimeText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  mealSlotTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 3,
  },
  mealSlotMeta: {
    fontSize: 11.5,
    color: "#64748B",
  },
  slotDetailBtn: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  slotDetailBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#EA580C",
  },
  shoppingSummaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    backgroundColor: "#FFF7ED",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FED7AA",
    marginBottom: 20,
  },
  shopSumTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#9A3412",
  },
  shopSumSub: {
    fontSize: 11,
    color: "#C2410C",
    marginTop: 2,
  },
  shopSumPrice: {
    fontSize: 18,
    fontWeight: "900",
    color: "#EA580C",
  },
  shoppingListSection: {
    paddingHorizontal: 20,
  },
  shopItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 12,
  },
  shopItemRowBought: {
    backgroundColor: "#F8FAFC",
    opacity: 0.65,
  },
  shopCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  shopCheckboxChecked: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  shopItemName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#1E293B",
  },
  shopItemNameCrossed: {
    textDecorationLine: "line-through",
    color: "#94A3B8",
  },
  shopItemCategory: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  shopItemPrice: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
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
    color: "#0F172A",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: "#0F172A",
    marginBottom: 12,
  },
  slotOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  slotOptionActive: {
    backgroundColor: BrandColors.primary,
  },
  slotOptionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  slotOptionTextActive: {
    color: "#FFFFFF",
  },
  quickRecipeChip: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  quickRecipeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#E65100",
  },
  catOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  catOptionActive: {
    backgroundColor: BrandColors.primary,
  },
  catOptionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
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
});

