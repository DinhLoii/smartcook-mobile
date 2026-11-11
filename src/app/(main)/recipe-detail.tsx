import { BrandColors } from "@/constants/brandColors";
import { NearbyStoreCard, ShoppingNoteModal, ShoppingReminderBanner } from "@/components/planner";
import { CartService } from "@/services/cartService";
import { getRecipeById, RECIPES_DATA } from "@/data/recipesData";
import { RecipeService } from "@/services/recipeService";
import { CreateRecipeModal } from "@/components/recipe";
import { RecipeDetailVideo } from "@/components/recipe/RecipeVideoGuide";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user } = useAuth();

  // Fetch recipe or fallback to first recipe
  const fallbackRecipe = useMemo(
    () => getRecipeById(id as string) ?? RECIPES_DATA[0],
    [id]
  );
  const [recipe, setRecipe] = useState<Recipe>(fallbackRecipe);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [showEditRecipeModal, setShowEditRecipeModal] = useState<boolean>(false);

  const isAuthor = useMemo(() => {
    if (!user) return false;
    return (
      (recipe.authorId && recipe.authorId === user.id) ||
      (recipe.author && user.fullName && recipe.author.toLowerCase() === user.fullName.toLowerCase()) ||
      user.role === "admin"
    );
  }, [user, recipe]);

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

  const handleAuthorActions = () => {
    Alert.alert(
      "Quản lý món ăn",
      `Bạn là tác giả món "${recipe.title}". Chọn thao tác muốn thực hiện:`,
      [
        {
          text: "Chỉnh sửa công thức ✏️",
          onPress: () => setShowEditRecipeModal(true),
        },
        {
          text: "Xóa công thức 🗑️",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Xác nhận xóa công thức",
              `Bạn có chắc chắn muốn xóa "${recipe.title}"? Dữ liệu công thức sẽ bị xóa vĩnh viễn khỏi hệ thống.`,
              [
                { text: "Hủy", style: "cancel" },
                {
                  text: "Xóa vĩnh viễn",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await RecipeService.deleteRecipe(recipe.id);
                      Alert.alert("Thành công", "Đã xóa công thức thành công.", [
                        { text: "OK", onPress: () => router.back() },
                      ]);
                    } catch (err: any) {
                      Alert.alert("Lỗi", err?.message || "Không thể xóa công thức");
                    }
                  },
                },
              ]
            );
          },
        },
        { text: "Đóng", style: "cancel" },
      ]
    );
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

    const rawPrices = weights.map((w) => {
      return Math.max(
        1000,
        Math.round(((w / totalWeight) * scaledTotal) / 1000) * 1000
      );
    });

    const allocatedTotal = rawPrices.reduce((sum, price) => sum + price, 0);
    const diff = scaledTotal - allocatedTotal;
    if (diff !== 0 && rawPrices.length > 0) {
      const maxIdx = weights.indexOf(Math.max(...weights));
      return rawPrices.map((price, index) =>
        index === maxIdx ? Math.max(1000, price + diff) : price
      );
    }

    return rawPrices;
  }, [recipe.price, recipe.ingredients, defaultServings, servingsCount]);

  // Dynamic remaining cost, savings, owned count, and match percentage
  const ingredientCostSummary = recipe.ingredients.reduce(
    (summary, _, index) => {
      const cost = ingredientPrices[index] || 0;
      if (checkedIngredients[index]) {
        return {
          ...summary,
          savedCost: summary.savedCost + cost,
          ownedCount: summary.ownedCount + 1,
        };
      }
      return { ...summary, remainingCost: summary.remainingCost + cost };
    },
    {
      remainingCost: 0,
      savedCost: 0,
      ownedCount: 0,
    }
  );
  const totalCount = recipe.ingredients.length;
  const matchPercent =
    totalCount > 0
      ? Math.round((ingredientCostSummary.ownedCount / totalCount) * 100)
      : 0;
  const { remainingCost, savedCost, ownedCount } = ingredientCostSummary;

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
            colors={["rgba(27, 27, 27, 0.75)", "rgba(27, 27, 27, 0.2)", "transparent"]}
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
                  color={isFavorite ? "#242424" : "#FFFFFF"}
                />
              </TouchableOpacity>

              {/* Author Actions Button (Edit / Delete) */}
              {isAuthor && (
                <TouchableOpacity
                  style={styles.circleButton}
                  activeOpacity={0.7}
                  onPress={handleAuthorActions}
                >
                  <Ionicons name="ellipsis-vertical" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Floating Badges on Hero Image (Category + Rating) */}
          <View style={styles.floatingHeroBadgesRow}>
            {recipe.badge ? (
              <View style={styles.heroCategoryBadge}>
                <Text style={styles.heroCategoryBadgeText}>
                  {recipe.badge.replace(/^[^\p{L}\p{N}]+/u, "").trim()}
                </Text>
              </View>
            ) : null}

            <View style={styles.heroRatingBadge}>
              <Ionicons name="star" size={13} color="#404040" />
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
              <MaterialCommunityIcons name="chef-hat" size={16} color={BrandColors.textDark} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={styles.authorName}>{recipe.author}</Text>
                <Ionicons name="checkmark-circle" size={14} color="#262626" />
              </View>
              <Text style={styles.chefRoleText}>Đầu bếp chuyên gia SmartCook</Text>
            </View>
          </View>

          {/* 3. COMPACT 4-STAT CARDS ROW (Thời gian | Năng lượng | Độ khó | Số bước) */}
          <View style={styles.compactStatsGrid}>
            {/* Stat 1: Thời gian */}
            <View style={styles.compactStatCard}>
              <View style={styles.compactStatTopRow}>
                <Ionicons name="time-outline" size={14} color={BrandColors.textBody} />
                <Text style={styles.compactStatValue}>{recipe.minutes}p</Text>
              </View>
              <Text style={styles.compactStatLabel}>Thời gian</Text>
            </View>

            {/* Stat 2: Calo */}
            <View style={styles.compactStatCard}>
              <View style={styles.compactStatTopRow}>
                <Ionicons name="flame-outline" size={14} color={BrandColors.textBody} />
                <Text style={styles.compactStatValue}>{recipe.calories}</Text>
              </View>
              <Text style={styles.compactStatLabel}>Calories</Text>
            </View>

            {/* Stat 3: Độ khó */}
            <View style={styles.compactStatCard}>
              <View style={styles.compactStatTopRow}>
                <Ionicons name="ribbon-outline" size={14} color={BrandColors.textBody} />
                <Text style={styles.compactStatValue}>{recipe.difficulty || "Dễ"}</Text>
              </View>
              <Text style={styles.compactStatLabel}>Độ khó</Text>
            </View>

            {/* Stat 4: Số bước */}
            <View style={styles.compactStatCard}>
              <View style={styles.compactStatTopRow}>
                <Ionicons name="list-outline" size={14} color={BrandColors.textBody} />
                <Text style={styles.compactStatValue}>{recipe.stepsCount} bước</Text>
              </View>
              <Text style={styles.compactStatLabel}>Cách làm</Text>
            </View>
          </View>

          {/* 5. CULINARY EDITORIAL DESCRIPTION (Minimalist without box) */}
          {recipe.description ? (
            <Text style={styles.compactEditorialText} numberOfLines={3}>
              <Text style={styles.compactEditorialTitle}>Cảm hứng: </Text>
              {recipe.description}
            </Text>
          ) : null}

          {recipe.id === id && <RecipeDetailVideo key={`${recipe.id}:${recipe.youtubeVideoId ?? ""}`} recipe={recipe} />}

          {/* 6. ESTIMATED PRICE & FRIDGE MATCH (Streamlined minimal bar) */}
          <View style={styles.smartCostCard}>
            <View style={styles.smartCostLeft}>
              <Ionicons name="wallet-outline" size={18} color={BrandColors.textBody} />
              <View>
                <Text style={styles.smartCostSub}>Ước tính giá cần mua</Text>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5 }}>
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
                matchPercent > 0 && styles.fridgeMatchChipPositive,
              ]}
            >
              <Ionicons
                name={matchPercent > 0 ? "checkmark-circle" : "basket-outline"}
                size={13}
                color={matchPercent > 0 ? "#262626" : "#5E5E5E"}
              />
              <Text
                style={[
                  styles.fridgeMatchChipText,
                  matchPercent > 0 && styles.fridgeMatchChipTextPositive,
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
                  <Ionicons name="people-outline" size={18} color={BrandColors.textDark} />
                  <Text style={styles.servingsTitle}>Khẩu phần ăn</Text>
                </View>

                <View style={styles.servingsCounter}>
                  <TouchableOpacity
                    style={styles.servingsBtn}
                    activeOpacity={0.7}
                    onPress={() => handleAdjustServings(-1)}
                  >
                    <Ionicons name="remove" size={16} color={BrandColors.textDark} />
                  </TouchableOpacity>

                  <Text style={styles.servingsNumberText}>{servingsCount} phần</Text>

                  <TouchableOpacity
                    style={styles.servingsBtn}
                    activeOpacity={0.7}
                    onPress={() => handleAdjustServings(1)}
                  >
                    <Ionicons name="add" size={16} color={BrandColors.textDark} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Fridge Readiness Notice */}
              <View
                style={[
                  styles.fridgeReadinessBar,
                  matchPercent === 0 && {
                    backgroundColor: BrandColors.surfaceMuted,
                    borderColor: BrandColors.borderLight,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="fridge-outline"
                  size={18}
                  color={matchPercent > 0 ? "#262626" : "#171717"}
                />
                <Text
                  style={[
                    styles.fridgeReadinessText,
                    matchPercent === 0 && { color: "#282828" },
                  ]}
                >
                  {matchPercent === 0
                    ? `Món mới: Chưa có nguyên liệu nào. Cần mua cả ${totalCount} món.`
                    : matchPercent === 100
                    ? `Tuyệt vời! Tủ lạnh nhà bạn đã có đủ 100% nguyên liệu này.`
                    : `Tủ lạnh nhà bạn đã có sẵn ${matchPercent}% nguyên liệu (${ownedCount}/${totalCount} món).`}
                </Text>
              </View>

              {/* Header with "Thêm tất cả" on TOP to save space */}
              <View style={styles.ingredientsSectionHeader}>
                <Text style={styles.ingredientsSectionTitle}>
                  Nguyên liệu ({totalCount})
                </Text>

                {totalCount - ownedCount > 0 ? (
                  <TouchableOpacity
                    style={styles.addAllToCartBtn}
                    activeOpacity={0.8}
                    onPress={handleAddToCart}
                  >
                    <Ionicons name="cart-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.addAllToCartText}>
                      Thêm tất cả ({totalCount - ownedCount})
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.allReadyBadge}>
                    <Ionicons name="checkmark-circle" size={13} color="#262626" />
                    <Text style={styles.allReadyBadgeText}>Đã có đủ</Text>
                  </View>
                )}
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
                                addedCartIngredients[idx] ? "#262626" : "#171717"
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
                          colors={["#171717", "#292929"]}
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
                            <Ionicons name="bulb-outline" size={16} color={BrandColors.textBody} />
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
                              color={isTimerActive ? "#FFFFFF" : "#171717"}
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
                  <Ionicons name="fitness-outline" size={18} color={BrandColors.textBody} />
                  <Text style={styles.nutritionHeaderTitle}>
                    Giá trị dinh dưỡng ({recipe.servings})
                  </Text>
                </View>

                {/* 4 Macros Grid (Text đen nhẹ có gạch chân bên dưới, không khung) */}
                <View style={styles.macroGridContainer}>
                  {/* Calo */}
                  <View style={styles.macroItemBox}>
                    <Text style={styles.macroValueNumber}>
                      {recipe.nutrition.calories}
                    </Text>
                    <Text style={styles.macroNameLabel}>Calories</Text>
                  </View>

                  {/* Đạm */}
                  <View style={styles.macroItemBox}>
                    <Text style={styles.macroValueNumber}>
                      {recipe.nutrition.protein}
                    </Text>
                    <Text style={styles.macroNameLabel}>Chất đạm (Protein)</Text>
                  </View>

                  {/* Tinh bột */}
                  <View style={styles.macroItemBox}>
                    <Text style={styles.macroValueNumber}>
                      {recipe.nutrition.carbs}
                    </Text>
                    <Text style={styles.macroNameLabel}>Carbohydrate</Text>
                  </View>

                  {/* Chất béo */}
                  <View style={styles.macroItemBox}>
                    <Text style={styles.macroValueNumber}>
                      {recipe.nutrition.fat}
                    </Text>
                    <Text style={styles.macroNameLabel}>Chất béo (Fat)</Text>
                  </View>
                </View>

                {/* Nutritionist Advice Box (Tối giản, bỏ viền khung) */}
                {recipe.nutrition.advice ? (
                  <View style={styles.nutritionAdviceCard}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 }}>
                      <Ionicons name="sparkles" size={14} color={BrandColors.textDark} />
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

          {/* Call-to-action button */}
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
              colors={["#171717", "#292929"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.startCookingGradient}
            >
              <MaterialCommunityIcons name="chef-hat" size={16} color="#FFFFFF" />
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

      {/* Edit Recipe Modal for author */}
      <CreateRecipeModal
        visible={showEditRecipeModal}
        onClose={() => setShowEditRecipeModal(false)}
        initialRecipe={recipe}
        onRecipeCreated={(updated) => {
          setRecipe(updated);
          setShowEditRecipeModal(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  scrollView: {
    flex: 1,
  },

  /* 1. Hero Image & Top Header */
  heroImageContainer: {
    position: "relative",
    backgroundColor: "#171717",
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
    backgroundColor: "#171717",
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
    backgroundColor: "#EEEEEE",
    borderWidth: 1.5,
    borderColor: "#686868",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 6,
    shadowColor: "#292929",
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
    color: "#292929",
  },
  stickyNoteTriggerSub: {
    fontSize: 11,
    color: "#292929",
    marginTop: 1,
  },
  stickyNoteTriggerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#E6E6E6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stickyNoteOpenText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#292929",
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
    backgroundColor: "rgba(27, 27, 27, 0.75)",
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
    color: BrandColors.textDark,
  },
  heroReviewText: {
    fontSize: 11,
    color: BrandColors.textMuted,
    fontWeight: "500",
  },

  /* 2. Content Sheet Card */
  contentSheet: {
    marginTop: -26,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: BrandColors.surfaceCard,
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
    color: BrandColors.textDark,
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
    backgroundColor: BrandColors.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  authorName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
  chefRoleText: {
    fontSize: 11.5,
    color: BrandColors.textMuted,
  },

  /* 3. Compact 4-Stat Minimal Underline Row */
  compactStatsGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    marginBottom: 16,
  },
  compactStatCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: "#C7C7C7",
    backgroundColor: "transparent",
  },
  compactStatTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  compactStatValue: {
    fontSize: 14,
    fontWeight: "600",
    color: BrandColors.textBody,
    letterSpacing: -0.2,
  },
  compactStatLabel: {
    fontSize: 11,
    color: BrandColors.textMuted,
    fontWeight: "500",
    marginTop: 3,
    textAlign: "center",
  },

  /* 5. Minimalist Editorial Description */
  compactEditorialText: {
    fontSize: 13,
    lineHeight: 19,
    color: BrandColors.textBody,
    marginBottom: 12,
  },
  compactEditorialTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: BrandColors.textBody,
  },

  /* 6. Streamlined Smart Cost & Fridge Bar */
  smartCostCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: BrandColors.background,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  smartCostLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flex: 1,
  },
  smartCostSub: {
    fontSize: 11,
    fontWeight: "500",
    color: BrandColors.textMuted,
    marginBottom: 1,
  },
  smartCostPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: BrandColors.textDark,
  },
  smartCostPerPerson: {
    fontSize: 11.5,
    color: BrandColors.textMuted,
    fontWeight: "500",
  },
  fridgeMatchChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.inputBg,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    gap: 4,
  },
  fridgeMatchChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: BrandColors.textMuted,
  },
  fridgeMatchChipPositive: {
    backgroundColor: BrandColors.surfaceMuted,
    borderColor: "#EEEEEE",
  },
  fridgeMatchChipTextPositive: {
    color: "#262626",
  },

  /* 7. Segmented Tab Bar */
  tabBarContainer: {
    flexDirection: "row",
    backgroundColor: BrandColors.inputBg,
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
    backgroundColor: BrandColors.surfaceCard,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabItemText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: BrandColors.textMuted,
  },
  tabItemTextActive: {
    color: BrandColors.textDark,
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
    backgroundColor: BrandColors.surfaceCard,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  servingsTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
  servingsCounter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.inputBg,
    borderRadius: 10,
    padding: 2,
    gap: 10,
  },
  servingsBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: BrandColors.surfaceCard,
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
    color: BrandColors.textDark,
    minWidth: 50,
    textAlign: "center",
  },
  fridgeReadinessBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    gap: 8,
  },
  fridgeReadinessText: {
    fontSize: 12,
    color: "#292929",
    flex: 1,
  },
  ingredientsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 8,
  },
  ingredientsSectionTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
  addAllToCartBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171717",
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 8,
    gap: 4,
    shadowColor: "#171717",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  addAllToCartText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  allReadyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    gap: 4,
  },
  allReadyBadgeText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#262626",
  },
  ingredientsCardList: {
    gap: 8,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.surfaceCard,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
  },
  ingredientRowChecked: {
    backgroundColor: BrandColors.background,
    borderColor: "#C7C7C7",
  },
  modernCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#C7C7C7",
    backgroundColor: BrandColors.surfaceCard,
    justifyContent: "center",
    alignItems: "center",
  },
  modernCheckboxChecked: {
    backgroundColor: "#262626",
    borderColor: "#262626",
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
    color: BrandColors.textDark,
  },
  ingredientNameTextChecked: {
    color: BrandColors.textMuted,
    textDecorationLine: "line-through",
  },
  ingredientAmountText: {
    fontSize: 12,
    color: BrandColors.textMuted,
    marginTop: 1,
  },
  stockPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stockPillAvailable: {
    backgroundColor: BrandColors.surfaceMuted,
  },
  stockPillMissing: {
    backgroundColor: BrandColors.surfaceMuted,
  },
  stockPillText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  stockPillTextAvailable: {
    color: "#262626",
  },
  stockPillTextMissing: {
    color: BrandColors.textDark,
  },
  ingredientActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addSingleCartBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.surfaceMuted,
    borderWidth: 1,
    borderColor: "#C2C2C2",
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 7,
    gap: 3,
  },
  addSingleCartBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
  addedSingleCartBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.surfaceMuted,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 7,
    gap: 3,
  },
  addedSingleCartBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#262626",
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
    shadowColor: "#171717",
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
    backgroundColor: "#DEDEDE",
    marginVertical: 4,
  },
  timelineContentCard: {
    flex: 1,
    backgroundColor: BrandColors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
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
    color: BrandColors.textDark,
    marginBottom: 6,
  },
  timelineStepDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: BrandColors.textBody,
  },
  stepTipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EEEEEE",
    borderRadius: 10,
    padding: 9,
    marginTop: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "#C2C2C2",
  },
  stepTipText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 17,
    color: "#292929",
  },
  stepTimerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.surfaceMuted,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginTop: 10,
    gap: 6,
  },
  stepTimerBtnActive: {
    backgroundColor: "#171717",
    borderColor: "#171717",
  },
  stepTimerBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
  stepTimerBtnTextActive: {
    color: "#FFFFFF",
  },

  /* TAB 3: NUTRITION STYLES (Minimalist, không viền khung, gạch chân) */
  nutritionPanel: {
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  nutritionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 12,
  },
  nutritionHeaderTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: BrandColors.textBody,
  },
  macroGridContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  macroItemBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: "#C7C7C7",
    backgroundColor: "transparent",
  },
  macroValueNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: BrandColors.textBody,
    letterSpacing: -0.2,
  },
  macroNameLabel: {
    fontSize: 10.5,
    color: BrandColors.textMuted,
    marginTop: 3,
    fontWeight: "500",
    textAlign: "center",
  },
  nutritionAdviceCard: {
    marginTop: 12,
    paddingTop: 8,
  },
  nutritionAdviceTitle: {
    fontSize: 12.5,
    fontWeight: "600",
    color: BrandColors.textBody,
  },
  nutritionAdviceDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    color: BrandColors.textMuted,
  },

  /* 8. FLOATING BOTTOM ACTION BAR */
  bottomStickyBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderTopWidth: 1,
    borderTopColor: BrandColors.borderLight,
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
    color: BrandColors.textMuted,
  },
  bottomPriceValue: {
    fontSize: 20,
    fontWeight: "800",
    color: BrandColors.textDark,
    marginVertical: 1,
  },
  bottomPriceSub: {
    fontSize: 10.5,
    color: BrandColors.textDark,
    fontWeight: "600",
  },
  startCookingBtn: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#171717",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 2.5,
  },
  startCookingGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 9.5,
    gap: 6,
  },
  startCookingText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  cartActionBtn: {
    backgroundColor: "#171717",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
    gap: 8,
    shadowColor: "#171717",
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
    backgroundColor: BrandColors.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
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
    color: "#292929",
    flex: 1,
  },
});
