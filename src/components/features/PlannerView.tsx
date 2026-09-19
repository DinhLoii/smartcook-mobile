import { BrandColors } from "@/constants/brandColors";
import NearbyStoreCard from "@/components/common/NearbyStoreCard";
import { RECIPES_DATA } from "@/data/recipesData";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function PlannerView({ insetsTop }: { insetsTop: number }) {
  const router = useRouter();

  const [activeSubTab, setActiveSubTab] = useState<"calendar" | "shopping">(
    "calendar"
  );
  const [selectedDay, setSelectedDay] = useState("Thứ 2");

  // Week days
  const weekDays = [
    { day: "Thứ 2", date: "15" },
    { day: "Thứ 3", date: "16" },
    { day: "Thứ 4", date: "17" },
    { day: "Thứ 5", date: "18" },
    { day: "Thứ 6", date: "19" },
    { day: "Thứ 7", date: "20" },
    { day: "CN", date: "21" },
  ];

  // Meal slots for the day
  const dailyMeals = [
    {
      slot: "Bữa Sáng",
      time: "07:00",
      recipe: RECIPES_DATA[6], // Cơm Đùi Gà Trứng Ốp
      calories: 520,
    },
    {
      slot: "Bữa Trưa",
      time: "12:00",
      recipe: RECIPES_DATA[0], // Cơm Gà Teriyaki
      calories: 580,
    },
    {
      slot: "Bữa Tối",
      time: "19:00",
      recipe: RECIPES_DATA[2], // Salad Cá Hồi
      calories: 420,
    },
  ];

  // Shopping List items (Module 13: Auto-generated from weekly plan, subtracting in-fridge items)
  const [shoppingItems, setShoppingItems] = useState([
    { id: "s-1", name: "Thịt thăn bò Tenderloin", amount: "500g", category: "Thịt & Cá", price: "95.000đ", bought: false },
    { id: "s-2", name: "Phi lê cá hồi Nauy", amount: "400g", category: "Thịt & Cá", price: "80.000đ", bought: false },
    { id: "s-3", name: "Măng tây xanh tươi", amount: "200g", category: "Rau củ", price: "25.000đ", bought: true },
    { id: "s-4", name: "Cà chua bi hữu cơ", amount: "300g", category: "Rau củ", price: "18.000đ", bought: false },
    { id: "s-5", name: "Bơ lạt Anchor", amount: "100g", category: "Bơ & Gia vị", price: "28.000đ", bought: true },
    { id: "s-6", name: "Phô mai Parmesan", amount: "50g", category: "Bơ & Gia vị", price: "35.000đ", bought: false },
  ]);

  const toggleShoppingItem = (id: string) => {
    setShoppingItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, bought: !item.bought } : item
      )
    );
  };

  const totalCalories = dailyMeals.reduce((acc, m) => acc + m.calories, 0);

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
              Đi Chợ (4)
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
                  Đã lên thực đơn 3 bữa ({totalCalories} kcal)
                </Text>
              </View>
              <View style={styles.calorieTag}>
                <Text style={styles.calorieTagText}>Đạt 76%</Text>
              </View>
            </View>

            <View style={styles.calorieBarBg}>
              <View
                style={[
                  styles.calorieBarFill,
                  { width: `${(totalCalories / 2000) * 100}%` },
                ]}
              />
            </View>
          </View>

          {/* 3 Meals List for Selected Day */}
          <View style={styles.mealsListSection}>
            <Text style={styles.sectionHeading}>
              Thực đơn chi tiết {selectedDay}
            </Text>

            {dailyMeals.map((meal, index) => (
              <TouchableOpacity
                key={index}
                style={styles.mealSlotCard}
                activeOpacity={0.88}
                onPress={() =>
                  router.push({
                    pathname: "/recipe-detail",
                    params: { id: meal.recipe.id },
                  })
                }
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
                    {meal.recipe.title}
                  </Text>
                  <Text style={styles.mealSlotMeta}>
                    🔥 {meal.calories} kcal • ⏱ {meal.recipe.minutes} phút
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.slotDetailBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/recipe-detail",
                      params: { id: meal.recipe.id },
                    })
                  }
                >
                  <Text style={styles.slotDetailBtnText}>Xem chi tiết →</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
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
                Đã tự động trừ đi nguyên liệu sẵn có trong Tủ Lạnh
              </Text>
            </View>
            <Text style={styles.shopSumPrice}>~245.000đ</Text>
          </View>

          {/* Checklist Items */}
          <View style={styles.shoppingListSection}>
            <Text style={styles.sectionHeading}>
              Cần mua cho thực đơn tuần ({shoppingItems.filter((s) => !s.bought).length} món)
            </Text>

            {shoppingItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.shopItemRow,
                  item.bought && styles.shopItemRowBought,
                ]}
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
            ))}
          </View>

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
});
