import { BrandColors } from "@/constants/brandColors";
import { NearbyStoreCard, ShoppingNoteModal, ShoppingReminderBanner } from "@/components/planner";
import { CartService } from "@/services/cartService";
import { getRecipeById, RECIPES_DATA } from "@/data/recipesData";
import { RecipeService } from "@/services/recipeService";
import { Recipe } from "@/types";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function RecipeDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Fetch recipe or fallback to first recipe
  const fallbackRecipe = useMemo(
    () => getRecipeById(id as string) ?? RECIPES_DATA[0],
    [id]
  );
  const [recipe, setRecipe] = useState<Recipe>(fallbackRecipe);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  // Active Tab state: 'ingredients' | 'steps' | 'nutrition'
  const [activeTab, setActiveTab] = useState<"ingredients" | "steps" | "nutrition">("ingredients");
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});

  // Dynamic Servings Scaler
  const defaultServings = parseInt(recipe.servings) || 4;
  const [servingsCount, setServingsCount] = useState<number>(defaultServings);

  useEffect(() => {
    let isMounted = true;
    async function fetchRecipeDetail() {
      if (!id) return;
      try {
        const fetched = await RecipeService.getRecipeById(id);
        if (isMounted && fetched) {
          setRecipe(fetched);
          setIsFavorite(!!fetched.isFavorite);
          const count = fetched.servingsCount || parseInt(fetched.servings) || 4;
          setServingsCount(count);
        }
      } catch (e) {
        console.warn("Lỗi load recipe detail:", e);
      }
    }
    fetchRecipeDetail();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleToggleFavorite = async () => {
    const nextVal = !isFavorite;
    setIsFavorite(nextVal);
    try {
      const res = await RecipeService.toggleFavorite(recipe.id);
      setIsFavorite(res.isFavorite);
    } catch {
      setIsFavorite(!nextVal);
    }
  };

  // Active Timer step notification tracker
  const [activeTimerStep, setActiveTimerStep] = useState<number | null>(null);

  // Individual added-to-cart ingredient tracker
  const [addedCartIngredients, setAddedCartIngredients] = useState<Record<number, boolean>>({});
  const [showShoppingNote, setShowShoppingNote] = useState<boolean>(false);
  const [cartItemsCount, setCartItemsCount] = useState(() =>
    CartService.getItems().filter((i) => !i.bought).length
  );

  useEffect(() => {
    const unsubscribe = CartService.subscribe(() => {
      setCartItemsCount(CartService.getItems().filter((i) => !i.bought).length);
    });
    return unsubscribe;
  }, []);

  const handleToggleCartItem = (idx: number, ingredientName: string) => {
    const ing = recipe.ingredients[idx];
    const price = ingredientPrices[idx] || 15000;
    const isCurrentlyAdded = !!addedCartIngredients[idx];

    if (!isCurrentlyAdded) {
      CartService.addItem({
        name: ingredientName,
        amount: getScaledAmount(ing.amount),
        price,
        recipeTitle: recipe.title,
        recipeId: recipe.id,
        bought: false,
      });
      setAddedCartIngredients((prev) => ({ ...prev, [idx]: true }));
      Alert.alert(
        "Tờ ghi chú đi chợ 📝",
        `Đã ghi chú "${ingredientName}" vào tờ giấy đi chợ!`,
        [
          { text: "Để sau", style: "cancel" },
          {
            text: "Xem tờ ghi chú",
            onPress: () => setShowShoppingNote(true),
          },
        ]
      );
    } else {
      CartService.removeItem(`cart-item-${idx}`);
      setAddedCartIngredients((prev) => ({ ...prev, [idx]: false }));
    }
  };

  // ScrollView Ref & Xem địa chỉ siêu thị theo sản phẩm
  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedIngredientForStore, setSelectedIngredientForStore] = useState<string | null>(null);
  const [storeSearchTrigger, setStoreSearchTrigger] = useState(0);

  const handleViewStoreForIngredient = (ingredientName: string) => {
    setSelectedIngredientForStore(ingredientName);
    setStoreSearchTrigger((prev) => prev + 1);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Adjust servings (min 1, max 12)
  const handleAdjustServings = (delta: number) => {
    setServingsCount((prev) => Math.max(1, Math.min(12, prev + delta)));
  };

  // Calculate dynamic ingredient amount scaling
  const getScaledAmount = (amountStr: string) => {
    if (servingsCount === defaultServings) return amountStr;
    const ratio = servingsCount / defaultServings;
    return amountStr.replace(/^([\d.,]+)/, (match) => {
      const num = parseFloat(match.replace(",", "."));
      if (isNaN(num)) return match;
      const scaled = Math.round(num * ratio * 10) / 10;
      return scaled.toString();
    });
  };

  // Helper to compute realistic weight for each ingredient
  const getIngredientWeight = (name: string, index: number): number => {
    const lower = name.toLowerCase();
    if (
      lower.includes("bò") ||
      lower.includes("gà") ||
      lower.includes("heo") ||
      lower.includes("thịt") ||
      lower.includes("hồi") ||
      lower.includes("tôm") ||
      lower.includes("mực") ||
      lower.includes("cá") ||
      lower.includes("steak") ||
      lower.includes("thăn")
    ) {
      return 10;
    }
    if (
      lower.includes("gạo") ||
      lower.includes("mì") ||
      lower.includes("pasta") ||
      lower.includes("bún") ||
      lower.includes("phở") ||
      lower.includes("măng tây") ||
      lower.includes("bơ lạt") ||
      lower.includes("phô mai")
    ) {
      return 4;
    }
    if (index === 0) return 6;
    if (index === 1) return 3;
    return 1.5;
  };

  // Dynamic per-ingredient cost map based on current recipe and servingsCount
  const ingredientPrices = useMemo(() => {
    const numericBasePrice =
      parseInt(recipe.price.replace(/[^\d]/g, "")) || 65000;
    const scaledTotal = Math.round(
      (numericBasePrice / defaultServings) * servingsCount
    );

    const weights = recipe.ingredients.map((ing, idx) =>
      getIngredientWeight(ing.name, idx)
    );
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    let allocatedTotal = 0;
    const rawPrices = weights.map((w) => {
      const price = Math.max(
        1000,
        Math.round(((w / totalWeight) * scaledTotal) / 1000) * 1000
      );
      allocatedTotal += price;
      return price;
    });

    const diff = scaledTotal - allocatedTotal;
    if (diff !== 0 && rawPrices.length > 0) {
      const maxIdx = weights.indexOf(Math.max(...weights));
      rawPrices[maxIdx] = Math.max(1000, rawPrices[maxIdx] + diff);
    }

    return rawPrices;
  }, [recipe.price, recipe.ingredients, defaultServings, servingsCount]);

  // Dynamic remaining cost, savings, owned count, and match percentage
  const { remainingCost, savedCost, ownedCount, totalCount, matchPercent } =
    useMemo(() => {
      const total = recipe.ingredients.length;
      let remaining = 0;
      let saved = 0;
      let owned = 0;

      recipe.ingredients.forEach((_, idx) => {
        const isChecked = Boolean(checkedIngredients[idx]);
        const cost = ingredientPrices[idx] || 0;
        if (isChecked) {
          saved += cost;
          owned += 1;
        } else {
          remaining += cost;
        }
      });

      const percent = total > 0 ? Math.round((owned / total) * 100) : 0;

      return {
        remainingCost: remaining,
        savedCost: saved,
        ownedCount: owned,
        totalCount: total,
        matchPercent: percent,
      };
    }, [recipe.ingredients, checkedIngredients, ingredientPrices]);

  // Handle adding missing ingredients to shopping cart
  const handleAddToCart = () => {
    const missingItems = recipe.ingredients.filter(
      (_, idx) => !checkedIngredients[idx]
    );
    const newAdded: Record<number, boolean> = { ...addedCartIngredients };
    const itemsToAdd: Array<{
      name: string;
      amount: string;
      price: number;
      recipeTitle: string;
      recipeId: string;
      bought: false;
    }> = [];

    recipe.ingredients.forEach((ing, idx) => {
      if (!checkedIngredients[idx]) {
        newAdded[idx] = true;
        itemsToAdd.push({
          name: ing.name,
          amount: getScaledAmount(ing.amount),
          price: ingredientPrices[idx] || 15000,
          recipeTitle: recipe.title,
          recipeId: recipe.id,
          bought: false,
        });
      }
    });

    CartService.addItems(itemsToAdd);
    setAddedCartIngredients(newAdded);
    setShowShoppingNote(true);
  };

  // Handle timer click
  const handleStartTimer = (stepNumber: number, minutes: number) => {
    setActiveTimerStep(stepNumber);
    Alert.alert(
      "Đã khởi động hẹn giờ ⏱️",
      `Đang đếm ngược ${minutes} phút cho Bước ${stepNumber}: ${recipe.steps[stepNumber - 1]?.title || ""}`
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      {/* Main Scrollable Recipe View */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 96,
        }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* 1. TOP HERO IMAGE HEADER */}
        <View style={[styles.heroImageContainer, { width, height: 360 }]}>
          <Image
            source={
              typeof recipe.image === "string"
                ? { uri: recipe.image }
                : recipe.image
            }
            style={styles.heroImage}
            resizeMode="cover"
          />

          {/* Top Subtle Dark Vignette for Header Controls */}
          <LinearGradient
            colors={["rgba(15, 23, 42, 0.75)", "rgba(15, 23, 42, 0.2)", "transparent"]}
            locations={[0, 0.4, 1]}
            style={styles.topVignette}
          />

          {/* Floating Header Controls */}
          <View style={[styles.floatingHeaderBar, { paddingTop: insets.top + 8 }]}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.circleButton}
              activeOpacity={0.7}
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {/* Shopping Note / Cart Button */}
              <TouchableOpacity
                style={styles.circleButton}
                activeOpacity={0.7}
                onPress={() => setShowShoppingNote(true)}
              >
                <Ionicons name="cart-outline" size={19} color="#FFFFFF" />
                {cartItemsCount > 0 && (
                  <View style={styles.headerCartBadge}>
                    <Text style={styles.headerCartBadgeText}>
                      {cartItemsCount > 9 ? "9+" : cartItemsCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Share Button */}
              <TouchableOpacity
                style={styles.circleButton}
                activeOpacity={0.7}
                onPress={() =>
                  Alert.alert("Chia sẻ", `Đã sao chép liên kết công thức "${recipe.title}"!`)
                }
              >
                <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Favorite / Bookmark Button */}
              <TouchableOpacity
                style={styles.circleButton}
                activeOpacity={0.7}
                onPress={handleToggleFavorite}
              >
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={19}
                  color={isFavorite ? "#EF4444" : "#FFFFFF"}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Floating Badges on Hero Image (Category + Rating) */}
          <View style={styles.floatingHeroBadgesRow}>
            {recipe.badge ? (
              <View style={styles.heroCategoryBadge}>
                <Text style={styles.heroCategoryBadgeText}>{recipe.badge}</Text>
              </View>
            ) : null}

            <View style={styles.heroRatingBadge}>
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text style={styles.heroRatingText}>{recipe.rating || 4.9}</Text>
              <Text style={styles.heroReviewText}>({recipe.reviewCount || 1420})</Text>
            </View>
          </View>
        </View>

        {/* 2. OVERLAPPING WHITE CONTENT SHEET */}
        <View style={styles.contentSheet}>
          {/* Top Shopping Reminder Banner */}
          <ShoppingReminderBanner
            onPress={() => setShowShoppingNote(true)}
            style={{ marginHorizontal: 0, marginBottom: 14 }}
          />

          {/* Dish Title */}
          <Text style={styles.dishTitle}>{recipe.title}</Text>

          {/* Author / Chef Row */}
          <View style={styles.authorRow}>
            <View style={styles.chefAvatar}>
              <MaterialCommunityIcons name="chef-hat" size={16} color="#EA580C" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={styles.authorName}>{recipe.author}</Text>
                <Ionicons name="checkmark-circle" size={14} color="#0284C7" />
              </View>
              <Text style={styles.chefRoleText}>Đầu bếp chuyên gia SmartCook</Text>
            </View>
          </View>

          {/* 3. COMPACT 4-STAT CARDS ROW (Thời gian | Năng lượng | Độ khó | Số bước) */}
          <View style={styles.compactStatsGrid}>
            {/* Stat 1: Thời gian */}
            <View style={[styles.compactStatCard, { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }]}>
              <View style={styles.compactStatTopRow}>
                <Ionicons name="time-outline" size={13} color="#EA580C" />
                <Text style={styles.compactStatValue}>{recipe.minutes}p</Text>
              </View>
              <Text style={styles.compactStatLabel}>Thời gian</Text>
            </View>

            {/* Stat 2: Calo */}
            <View style={[styles.compactStatCard, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <View style={styles.compactStatTopRow}>
                <Ionicons name="flame-outline" size={13} color="#DC2626" />
                <Text style={styles.compactStatValue}>{recipe.calories}</Text>
              </View>
              <Text style={styles.compactStatLabel}>Calories</Text>
            </View>

            {/* Stat 3: Độ khó */}
            <View style={[styles.compactStatCard, { backgroundColor: "#F5F3FF", borderColor: "#DDD6FE" }]}>
              <View style={styles.compactStatTopRow}>
                <Ionicons name="ribbon-outline" size={13} color="#7C3AED" />
                <Text style={styles.compactStatValue}>{recipe.difficulty || "Dễ"}</Text>
              </View>
              <Text style={styles.compactStatLabel}>Độ khó</Text>
            </View>

            {/* Stat 4: Số bước */}
            <View style={[styles.compactStatCard, { backgroundColor: "#F0F9FF", borderColor: "#BAE6FD" }]}>
              <View style={styles.compactStatTopRow}>
                <Ionicons name="list-outline" size={13} color="#0284C7" />
                <Text style={styles.compactStatValue}>{recipe.stepsCount} bước</Text>
              </View>
              <Text style={styles.compactStatLabel}>Cách làm</Text>
            </View>
          </View>

          {/* 4. COMPACT MEAL TAGS ROW */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.compactTagsContainer}
            style={styles.compactTagsScroll}
          >
            {recipe.tags.map((tag, index) => (
              <View key={index} style={styles.compactTagPill}>
                <Text style={styles.compactTagText}>{tag}</Text>
              </View>
            ))}
          </ScrollView>

          {/* 5. COMPACT CULINARY EDITORIAL DESCRIPTION */}
          {recipe.description ? (
            <View style={styles.compactEditorialCard}>
              <Ionicons name="sparkles" size={13} color="#EA580C" style={{ marginTop: 1 }} />
              <Text style={styles.compactEditorialText} numberOfLines={3}>
                <Text style={styles.compactEditorialTitle}>Cảm hứng: </Text>
                {recipe.description}
              </Text>
            </View>
          ) : null}

          {/* 6. ESTIMATED PRICE & FRIDGE MATCH CARD */}
          <View style={styles.smartCostCard}>
            <View style={styles.smartCostLeft}>
              <View style={styles.smartCostIconBox}>
                <Ionicons name="wallet-outline" size={20} color="#EA580C" />
              </View>
              <View>
                <Text style={styles.smartCostSub}>Ước tính giá cần mua</Text>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                  <Text style={styles.smartCostPrice}>
                    {remainingCost === 0
                      ? "0đ"
                      : `~${remainingCost.toLocaleString("vi-VN")}đ`}
                  </Text>
                  <Text style={styles.smartCostPerPerson}>
                    {remainingCost === 0
                      ? "(Đã có đủ)"
                      : `(~${Math.round(remainingCost / servingsCount).toLocaleString("vi-VN")}đ / phần)`}
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.fridgeMatchChip,
                matchPercent === 100 && { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
              ]}
            >
              <Ionicons
                name={matchPercent > 0 ? "checkmark-circle" : "basket-outline"}
                size={14}
                color={matchPercent > 0 ? "#059669" : "#EA580C"}
              />
              <Text
                style={[
                  styles.fridgeMatchChipText,
                  matchPercent === 0 && { color: "#EA580C" },
                ]}
              >
                {matchPercent}% trong tủ
              </Text>
            </View>
          </View>

          {/* 7. MODERN SEGMENTED TAB BAR (Việt hóa chuẩn: Nguyên liệu | Cách làm | Dinh dưỡng) */}
          <View style={styles.tabBarContainer}>
            {/* Tab 1: Nguyên liệu */}
            <Pressable
              style={[
                styles.tabItem,
                activeTab === "ingredients" && styles.tabItemActive,
              ]}
              onPress={() => setActiveTab("ingredients")}
            >
              <Text
                style={[
                  styles.tabItemText,
                  activeTab === "ingredients" && styles.tabItemTextActive,
                ]}
              >
                Nguyên liệu ({recipe.ingredients.length})
              </Text>
            </Pressable>

            {/* Tab 2: Cách làm */}
            <Pressable
              style={[
                styles.tabItem,
                activeTab === "steps" && styles.tabItemActive,
              ]}
              onPress={() => setActiveTab("steps")}
            >
              <Text
                style={[
                  styles.tabItemText,
                  activeTab === "steps" && styles.tabItemTextActive,
                ]}
              >
                Cách làm ({recipe.steps.length})
              </Text>
            </Pressable>

            {/* Tab 3: Dinh dưỡng */}
            <Pressable
              style={[
                styles.tabItem,
                activeTab === "nutrition" && styles.tabItemActive,
              ]}
              onPress={() => setActiveTab("nutrition")}
            >
              <Text
                style={[
                  styles.tabItemText,
                  activeTab === "nutrition" && styles.tabItemTextActive,
                ]}
              >
                Dinh dưỡng
              </Text>
            </Pressable>
          </View>

          {/* ==================================================== */}
          {/* TAB 1: NGUYÊN LIỆU (INGREDIENTS & SERVINGS SCALER)    */}
          {/* ==================================================== */}
          {activeTab === "ingredients" && (
            <View style={styles.tabContentBlock}>
              {/* Servings Adjuster Bar */}
              <View style={styles.servingsCard}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="people-outline" size={18} color="#0F172A" />
                  <Text style={styles.servingsTitle}>Khẩu phần ăn</Text>
                </View>

                <View style={styles.servingsCounter}>
                  <TouchableOpacity
                    style={styles.servingsBtn}
                    activeOpacity={0.7}
                    onPress={() => handleAdjustServings(-1)}
                  >
                    <Ionicons name="remove" size={16} color="#0F172A" />
                  </TouchableOpacity>

                  <Text style={styles.servingsNumberText}>{servingsCount} phần</Text>

                  <TouchableOpacity
                    style={styles.servingsBtn}
                    activeOpacity={0.7}
                    onPress={() => handleAdjustServings(1)}
                  >
                    <Ionicons name="add" size={16} color="#0F172A" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Fridge Readiness Notice */}
              <View
                style={[
                  styles.fridgeReadinessBar,
                  matchPercent === 0 && {
                    backgroundColor: "#FFF7ED",
                    borderColor: "#FED7AA",
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="fridge-outline"
                  size={18}
                  color={matchPercent > 0 ? "#059669" : "#EA580C"}
                />
                <Text
                  style={[
                    styles.fridgeReadinessText,
                    matchPercent === 0 && { color: "#C2410C" },
                  ]}
                >
                  {matchPercent === 0
                    ? `Món mới: Chưa có nguyên liệu nào. Cần mua cả ${totalCount} món.`
                    : matchPercent === 100
                    ? `Tuyệt vời! Tủ lạnh nhà bạn đã có đủ 100% nguyên liệu này.`
                    : `Tủ lạnh nhà bạn đã có sẵn ${matchPercent}% nguyên liệu (${ownedCount}/${totalCount} món).`}
                </Text>
              </View>

              {/* Interactive Ingredients List */}
              <View style={styles.ingredientsCardList}>
                {recipe.ingredients.map((ing, idx) => {
                  const isChecked = Boolean(checkedIngredients[idx]);
                  const price = ingredientPrices[idx] || 0;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.ingredientRow,
                        isChecked && styles.ingredientRowChecked,
                      ]}
                    >
                      {/* Bấm vào tên hoặc checkbox để đánh dấu đã có / chưa có */}
                      <TouchableOpacity
                        style={styles.ingredientMainInfo}
                        activeOpacity={0.7}
                        onPress={() => toggleIngredient(idx)}
                      >
                        {/* Checkbox */}
                        <View
                          style={[
                            styles.modernCheckbox,
                            isChecked && styles.modernCheckboxChecked,
                          ]}
                        >
                          {isChecked && (
                            <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                          )}
                        </View>

                        {/* Ingredient details */}
                        <View style={styles.ingredientTextGroup}>
                          <Text
                            style={[
                              styles.ingredientNameText,
                              isChecked && styles.ingredientNameTextChecked,
                            ]}
                          >
                            {ing.name}
                          </Text>
                          <Text style={styles.ingredientAmountText}>
                            {getScaledAmount(ing.amount)}
                            {isChecked
                              ? " • Đã có sẵn"
                              : ` • ~${price.toLocaleString("vi-VN")}đ`}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {/* Stock availability status pill & Xem địa chỉ */}
                      <View style={styles.ingredientActionsRow}>
                        <TouchableOpacity
                          style={[
                            styles.stockPill,
                            isChecked
                              ? styles.stockPillAvailable
                              : styles.stockPillMissing,
                          ]}
                          activeOpacity={0.7}
                          onPress={() => toggleIngredient(idx)}
                        >
                          <Text
                            style={[
                              styles.stockPillText,
                              isChecked
                                ? styles.stockPillTextAvailable
                                : styles.stockPillTextMissing,
                            ]}
                          >
                            {isChecked ? "Đã có" : "Cần mua"}
                          </Text>
                        </TouchableOpacity>

                        {!isChecked && (
                          <TouchableOpacity
                            style={
                              addedCartIngredients[idx]
                                ? styles.addedSingleCartBtn
                                : styles.addSingleCartBtn
                            }
                            activeOpacity={0.7}
                            onPress={() => handleToggleCartItem(idx, ing.name)}
                          >
                            <Ionicons
                              name={
                                addedCartIngredients[idx]
                                  ? "checkmark-circle"
                                  : "cart-outline"
                              }
                              size={12}
                              color={
                                addedCartIngredients[idx] ? "#059669" : "#EA580C"
                              }
                            />
                            <Text
                              style={
                                addedCartIngredients[idx]
                                  ? styles.addedSingleCartBtnText
                                  : styles.addSingleCartBtnText
                              }
                            >
                              {addedCartIngredients[idx]
                                ? "Đã thêm"
                                : "Thêm vào giỏ"}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>


              {/* 🛒 Shopping Cart Action for missing ingredients */}
              {totalCount - ownedCount > 0 ? (
                <TouchableOpacity
                  style={styles.cartActionBtn}
                  activeOpacity={0.82}
                  onPress={handleAddToCart}
                >
                  <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.cartActionText}>
                    Thêm {totalCount - ownedCount} món cần mua vào Giỏ hàng đi chợ
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.allIngredientsReadyBanner}>
                  <Ionicons name="checkmark-done-circle" size={18} color="#059669" />
                  <Text style={styles.allIngredientsReadyText}>
                    Đã đủ nguyên liệu! Bạn có thể bắt đầu nấu ngay mà không cần đi chợ.
                  </Text>
                </View>
              )}

              {/* 🏪 Siêu thị gần tôi (Mock Data & GPS Haversine) */}
              <NearbyStoreCard
                style={{ marginTop: 12 }}
                selectedProduct={selectedIngredientForStore}
                onClearProduct={() => setSelectedIngredientForStore(null)}
                searchTrigger={storeSearchTrigger}
              />
            </View>
          )}

          {/* ==================================================== */}
          {/* TAB 2: CÁCH LÀM (INTERACTIVE TIMELINE & STEPS)        */}
          {/* ==================================================== */}
          {activeTab === "steps" && (
            <View style={styles.tabContentBlock}>
              <View style={styles.timelineWrapper}>
                {recipe.steps.map((step, idx) => {
                  const isLast = idx === recipe.steps.length - 1;
                  const isTimerActive = activeTimerStep === step.stepNumber;

                  return (
                    <View key={step.stepNumber} style={styles.timelineStepItem}>
                      {/* Left Column: Number Badge & Vertical Connector Line */}
                      <View style={styles.timelineLeftTrack}>
                        <LinearGradient
                          colors={["#FF5722", "#FF7043"]}
                          style={styles.timelineStepNumberBox}
                        >
                          <Text style={styles.timelineStepNumberText}>
                            {step.stepNumber}
                          </Text>
                        </LinearGradient>
                        {!isLast && <View style={styles.timelineConnectingLine} />}
                      </View>

                      {/* Right Column: Step Content Card */}
                      <View style={styles.timelineContentCard}>
                        <Text style={styles.timelineStepTitle}>{step.title}</Text>
                        <Text style={styles.timelineStepDesc}>
                          {step.description}
                        </Text>

                        {/* Chef Tip if available */}
                        {step.tip ? (
                          <View style={styles.stepTipBox}>
                            <Ionicons name="bulb-outline" size={16} color="#D97706" />
                            <Text style={styles.stepTipText}>
                              <Text style={{ fontWeight: "700" }}>Mẹo bếp: </Text>
                              {step.tip}
                            </Text>
                          </View>
                        ) : null}

                        {/* Interactive Timer Chip */}
                        {step.timerMinutes ? (
                          <TouchableOpacity
                            style={[
                              styles.stepTimerBtn,
                              isTimerActive && styles.stepTimerBtnActive,
                            ]}
                            activeOpacity={0.8}
                            onPress={() =>
                              handleStartTimer(step.stepNumber, step.timerMinutes!)
                            }
                          >
                            <Ionicons
                              name={isTimerActive ? "alarm" : "timer-outline"}
                              size={15}
                              color={isTimerActive ? "#FFFFFF" : "#EA580C"}
                            />
                            <Text
                              style={[
                                styles.stepTimerBtnText,
                                isTimerActive && styles.stepTimerBtnTextActive,
                              ]}
                            >
                              {isTimerActive
                                ? `Đang hẹn giờ: ${step.timerMinutes} phút`
                                : `Bấm hẹn giờ: ${step.timerMinutes} phút`}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ==================================================== */}
          {/* TAB 3: DINH DƯỠNG (NUTRITION & MACROS)                 */}
          {/* ==================================================== */}
          {activeTab === "nutrition" && (
            <View style={styles.tabContentBlock}>
              <View style={styles.nutritionPanel}>
                <View style={styles.nutritionHeaderRow}>
                  <Ionicons name="fitness-outline" size={20} color="#EA580C" />
                  <Text style={styles.nutritionHeaderTitle}>
                    Giá trị dinh dưỡng ({recipe.servings})
                  </Text>
                </View>

                {/* 4 Macros Grid */}
                <View style={styles.macroGridContainer}>
                  {/* Calo */}
                  <View style={[styles.macroItemBox, { backgroundColor: "#FFF7ED" }]}>
                    <Text style={[styles.macroValueNumber, { color: "#EA580C" }]}>
                      {recipe.nutrition.calories}
                    </Text>
                    <Text style={styles.macroNameLabel}>Calories</Text>
                  </View>

                  {/* Đạm */}
                  <View style={[styles.macroItemBox, { backgroundColor: "#FEF2F2" }]}>
                    <Text style={[styles.macroValueNumber, { color: "#DC2626" }]}>
                      {recipe.nutrition.protein}
                    </Text>
                    <Text style={styles.macroNameLabel}>Chất đạm (Protein)</Text>
                  </View>

                  {/* Tinh bột */}
                  <View style={[styles.macroItemBox, { backgroundColor: "#F5F3FF" }]}>
                    <Text style={[styles.macroValueNumber, { color: "#7C3AED" }]}>
                      {recipe.nutrition.carbs}
                    </Text>
                    <Text style={styles.macroNameLabel}>Carbohydrate</Text>
                  </View>

                  {/* Chất béo */}
                  <View style={[styles.macroItemBox, { backgroundColor: "#ECFDF5" }]}>
                    <Text style={[styles.macroValueNumber, { color: "#059669" }]}>
                      {recipe.nutrition.fat}
                    </Text>
                    <Text style={styles.macroNameLabel}>Chất béo (Fat)</Text>
                  </View>
                </View>

                {/* Nutritionist Advice Box */}
                {recipe.nutrition.advice ? (
                  <View style={styles.nutritionAdviceCard}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Ionicons name="sparkles" size={15} color="#EA580C" />
                      <Text style={styles.nutritionAdviceTitle}>Lời khuyên chuyên gia</Text>
                    </View>
                    <Text style={styles.nutritionAdviceDesc}>
                      {recipe.nutrition.advice}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 8. FLOATING BOTTOM ACTION BAR */}
      <View
        style={[
          styles.bottomStickyBar,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <View style={styles.bottomBarContent}>
          {/* Price breakdown column */}
          <View style={styles.bottomPriceCol}>
            <Text style={styles.bottomPriceLabel}>Ước tính giá tiền</Text>
            <Text style={styles.bottomPriceValue}>
              {remainingCost === 0
                ? "0đ"
                : `~${remainingCost.toLocaleString("vi-VN")}đ`}
            </Text>
            <Text style={styles.bottomPriceSub}>
              {savedCost > 0
                ? `Tiết kiệm ~${savedCost.toLocaleString("vi-VN")}đ • ${servingsCount} người`
                : `Khẩu phần ${servingsCount} người`}
            </Text>
          </View>

          {/* Big Call-to-action button */}
          <TouchableOpacity
            style={styles.startCookingBtn}
            activeOpacity={0.88}
            onPress={() =>
              router.push({
                pathname: "/cooking-mode",
                params: { id: recipe.id },
              })
            }
          >
            <LinearGradient
              colors={["#FF5722", "#FF7043"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.startCookingGradient}
            >
              <MaterialCommunityIcons name="pot-steam" size={20} color="#FFFFFF" />
              <Text style={styles.startCookingText}>Bắt đầu nấu</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Shopping Notepad / Sticky Note Modal (Tờ giấy ghi chú đi chợ) */}
      <ShoppingNoteModal
        visible={showShoppingNote}
        onClose={() => setShowShoppingNote(false)}
        onFindStore={() => {
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 200);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },

  /* 1. Hero Image & Top Header */
  heroImageContainer: {
    position: "relative",
    backgroundColor: "#0F172A",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  topVignette: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  floatingHeaderBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  headerCartBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#FF5722",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  headerCartBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  stickyNoteTriggerBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FEFCE8",
    borderWidth: 1.5,
    borderColor: "#FDE047",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 6,
    shadowColor: "#854D0E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  stickyNoteTriggerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  stickyNoteTriggerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#78350F",
  },
  stickyNoteTriggerSub: {
    fontSize: 11,
    color: "#92400E",
    marginTop: 1,
  },
  stickyNoteTriggerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#FEF08A",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stickyNoteOpenText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
  },
  floatingHeroBadgesRow: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroCategoryBadge: {
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  heroCategoryBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  heroRatingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
    gap: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  heroRatingText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  heroReviewText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },

  /* 2. Content Sheet Card */
  contentSheet: {
    marginTop: -26,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 6,
  },
  dishTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
    marginBottom: 8,
    lineHeight: 32,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  chefAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  authorName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  chefRoleText: {
    fontSize: 11.5,
    color: "#64748B",
  },

  /* 3. Compact 4-Stat Cards */
  compactStatsGrid: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  compactStatCard: {
    flex: 1,
    borderRadius: 11,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  compactStatTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  compactStatValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  compactStatLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 1,
  },

  /* 4. Compact Tags */
  compactTagsScroll: {
    marginBottom: 10,
  },
  compactTagsContainer: {
    flexDirection: "row",
    gap: 6,
    paddingRight: 6,
  },
  compactTagPill: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  compactTagText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },

  /* 5. Compact Editorial Description */
  compactEditorialCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#FFFDF9",
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  compactEditorialTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#C2410C",
  },
  compactEditorialText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#334155",
  },

  /* 6. Smart Cost & Fridge Card */
  smartCostCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  smartCostLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  smartCostIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  smartCostSub: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  smartCostPrice: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  smartCostPerPerson: {
    fontSize: 11.5,
    color: "#EA580C",
    fontWeight: "600",
  },
  fridgeMatchChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    gap: 4,
  },
  fridgeMatchChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },

  /* 7. Segmented Tab Bar */
  tabBarContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 12,
  },
  tabItemActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabItemText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#64748B",
  },
  tabItemTextActive: {
    color: "#EA580C",
    fontWeight: "800",
  },

  /* TAB 1: INGREDIENTS STYLES */
  tabContentBlock: {
    marginBottom: 10,
  },
  servingsCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  servingsTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  servingsCounter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 2,
    gap: 10,
  },
  servingsBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  servingsNumberText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
    minWidth: 50,
    textAlign: "center",
  },
  fridgeReadinessBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    gap: 8,
  },
  fridgeReadinessText: {
    fontSize: 12,
    color: "#166534",
    flex: 1,
  },
  ingredientsCardList: {
    gap: 8,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
  },
  ingredientRowChecked: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
  },
  modernCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  modernCheckboxChecked: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  ingredientMainInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  ingredientTextGroup: {
    flex: 1,
  },
  ingredientNameText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  ingredientNameTextChecked: {
    color: "#64748B",
    textDecorationLine: "line-through",
  },
  ingredientAmountText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  stockPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stockPillAvailable: {
    backgroundColor: "#ECFDF5",
  },
  stockPillMissing: {
    backgroundColor: "#FFF7ED",
  },
  stockPillText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  stockPillTextAvailable: {
    color: "#059669",
  },
  stockPillTextMissing: {
    color: "#EA580C",
  },
  ingredientActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addSingleCartBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 7,
    gap: 3,
  },
  addSingleCartBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#EA580C",
  },
  addedSingleCartBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 7,
    gap: 3,
  },
  addedSingleCartBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#059669",
  },

  /* TAB 2: STEPS TIMELINE STYLES */
  timelineWrapper: {
    paddingLeft: 4,
    paddingTop: 4,
  },
  timelineStepItem: {
    flexDirection: "row",
    marginBottom: 16,
  },
  timelineLeftTrack: {
    alignItems: "center",
    width: 32,
    marginRight: 10,
  },
  timelineStepNumberBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF5722",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  timelineStepNumberText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  timelineConnectingLine: {
    flex: 1,
    width: 2,
    backgroundColor: "#FED7AA",
    marginVertical: 4,
  },
  timelineContentCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  timelineStepTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  timelineStepDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: "#475569",
  },
  stepTipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    borderRadius: 10,
    padding: 9,
    marginTop: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  stepTipText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 17,
    color: "#92400E",
  },
  stepTimerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginTop: 10,
    gap: 6,
  },
  stepTimerBtnActive: {
    backgroundColor: "#EA580C",
    borderColor: "#EA580C",
  },
  stepTimerBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#EA580C",
  },
  stepTimerBtnTextActive: {
    color: "#FFFFFF",
  },

  /* TAB 3: NUTRITION STYLES */
  nutritionPanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
  },
  nutritionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  nutritionHeaderTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  macroGridContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  macroItemBox: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  macroValueNumber: {
    fontSize: 15,
    fontWeight: "800",
  },
  macroNameLabel: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
    textAlign: "center",
  },
  nutritionAdviceCard: {
    backgroundColor: "#FFFDF9",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  nutritionAdviceTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#C2410C",
  },
  nutritionAdviceDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: "#475569",
  },

  /* 8. FLOATING BOTTOM ACTION BAR */
  bottomStickyBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 12,
    paddingHorizontal: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomBarContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomPriceCol: {
    justifyContent: "center",
  },
  bottomPriceLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  bottomPriceValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginVertical: 1,
  },
  bottomPriceSub: {
    fontSize: 10.5,
    color: "#EA580C",
    fontWeight: "600",
  },
  startCookingBtn: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#FF5722",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  startCookingGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 13,
    gap: 8,
  },
  startCookingText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  cartActionBtn: {
    backgroundColor: "#EA580C",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
    gap: 8,
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  cartActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  allIngredientsReadyBanner: {
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    gap: 8,
  },
  allIngredientsReadyText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#065F46",
    flex: 1,
  },
});
