import {
  CommunityView,
  FridgeView,
  PlannerView,
  ProfileView,
  ScanAIView,
} from "@/components/features";
import { BrandColors } from "@/constants/brandColors";
import { ShoppingNoteModal, ShoppingReminderBanner } from "@/components/planner";
import { DraggableAIAssistant } from "@/components/ai";
import { CreateRecipeModal } from "@/components/recipe";
import { NotificationModal } from "@/components/notifications/NotificationModal";
import { InAppNotificationBanner } from "@/components/notifications/InAppNotificationBanner";
import { GiftRewardsModal } from "@/components/rewards/GiftRewardsModal";
import { notificationService } from "@/services/notificationService";
import { CartService } from "@/services/cartService";
import { PreferenceService, UserPreferences, CUISINE_OPTIONS } from "@/services/preferenceService";
import { CategoryService } from "@/services/categoryService";
import { RecipeService } from "@/services/recipeService";
import { CategoryItem, Recipe } from "@/types";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user, updateChefXP } = useAuth();

  const [activeTab, setActiveTab] = useState<
    "home" | "fridge" | "planner" | "scan" | "community" | "profile"
  >("home");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showShoppingNote, setShowShoppingNote] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [plannerSubTab, setPlannerSubTab] = useState<"calendar" | "shopping" | "rewards">("calendar");
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [cartCount, setCartCount] = useState(() =>
    CartService.getItems().filter((i) => !i.bought).length
  );

  useEffect(() => {
    CartService.fetchServerItems().catch(() => {});

    const unsubscribe = CartService.subscribe(() => {
      setCartCount(CartService.getItems().filter((i) => !i.bought).length);
    });

    // Tải số lượng thông báo chưa đọc và lắng nghe realtime
    notificationService.getNotifications(1, 1).then((res) => {
      setUnreadNotifCount(res.unreadCount);
    });

    const unsubscribeNotif = notificationService.subscribeUnreadCount((count) => {
      setUnreadNotifCount(count);
    });

    return () => {
      unsubscribe();
      unsubscribeNotif();
    };
  }, []);

  const [userPrefs, setUserPrefs] = useState<UserPreferences>(() =>
    PreferenceService.getPreferences()
  );

  useEffect(() => {
    const unsubscribe = PreferenceService.subscribe((prefs) => {
      setUserPrefs(prefs);
    });
    return unsubscribe;
  }, []);

  const [filterTime, setFilterTime] = useState<string>("all");
  const [filterCalo, setFilterCalo] = useState<string>("all");
  const [filterFridgeOnly, setFilterFridgeOnly] = useState<boolean>(false);
  const [favoriteIds, setFavoriteIds] = useState<Record<string, boolean>>({
    "dish-1": true,
  });

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showCreateRecipeModal, setShowCreateRecipeModal] = useState<boolean>(false);
  const [customDishes, setCustomDishes] = useState<
    Array<{
      id: string;
      title: string;
      badge: string;
      price: string;
      image: any;
      sub: string;
      fridge: string;
    }>
  >(() =>
    RecipeService.getCustomRecipes().map((r) => ({
      id: r.id,
      title: r.title,
      badge: r.badge,
      price: r.price,
      image: r.image,
      sub: r.sub,
      fridge: `${r.fridgeMatchPercent}%`,
    }))
  );

  const ITEMS_PER_PAGE = 10;
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [serverDishes, setServerDishes] = useState<any[]>([]);
  const [isLoadingDishes, setIsLoadingDishes] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [serverTotalPages, setServerTotalPages] = useState<number>(1);
  const [serverTotalCount, setServerTotalCount] = useState<number>(0);

  const fetchRecipes = async (showLoading = true) => {
    if (showLoading) setIsLoadingDishes(true);
    try {
      const res = await RecipeService.getRecipes({
        category: selectedCategory === "all" ? undefined : selectedCategory,
        search: searchQuery.trim() || undefined,
        maxMinutes: filterTime === "15" ? 15 : filterTime === "30" ? 30 : undefined,
        maxCalories: filterCalo === "400" ? 400 : filterCalo === "600" ? 600 : undefined,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      });

      if (res && res.recipes) {
        const mapped = res.recipes.map((r) => ({
          id: r.id,
          title: r.title,
          badge: r.badge,
          price: r.price,
          image: r.image,
          sub: r.sub,
          fridge: `${r.fridgeMatchPercent}%`,
          isFavorite: r.isFavorite,
        }));
        setServerDishes(mapped);
        setServerTotalPages(res.totalPages);
        setServerTotalCount(res.total);

        const favs: Record<string, boolean> = {};
        res.recipes.forEach((r) => {
          if (r.isFavorite) favs[r.id] = true;
        });
        setFavoriteIds((prev) => ({ ...prev, ...favs }));
      }
    } catch (e) {
      console.warn("Lỗi fetch recipes:", e);
    } finally {
      setIsLoadingDishes(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchRecipes();
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedCategory, searchQuery, filterTime, filterCalo, currentPage]);

  const handleRecipeCreated = (newRecipe: Recipe) => {
    const formattedDish = {
      id: newRecipe.id,
      title: newRecipe.title,
      badge: newRecipe.badge,
      price: newRecipe.price,
      image: newRecipe.image,
      sub: newRecipe.sub,
      fridge: `${newRecipe.fridgeMatchPercent}%`,
    };
    setCustomDishes((prev) => [formattedDish, ...prev]);
    setSelectedCategory("all");
    setCurrentPage(1);
    fetchRecipes(false);
  };

  const toggleFavorite = async (id: string) => {
    const nextVal = !favoriteIds[id];
    setFavoriteIds((prev) => ({ ...prev, [id]: nextVal }));
    try {
      const res = await RecipeService.toggleFavorite(id);
      setFavoriteIds((prev) => ({ ...prev, [id]: res.isFavorite }));
    } catch {
      setFavoriteIds((prev) => ({ ...prev, [id]: !nextVal }));
    }
  };

  const handleOpenRecipe = (recipeId: string) => {
    router.push({
      pathname: "/recipe-detail",
      params: { id: recipeId },
    });
  };

  interface HeroSlideItem {
    id: string;
    recipeId: string;
    titlePrefix: string;
    highlight: string;
    titleSuffix: string;
    subtitle: string;
    actionText: string;
    tagBadge: "hot" | "popular";
    image: any;
    gradientColors: readonly [string, string, string];
    highlightColor: string;
    btnGradient: readonly [string, string];
    badgeColor: string;
  }

  // 5 Dishes data for Hero Carousel with corresponding info
  const heroSlides: HeroSlideItem[] = [
    {
      id: "slide-1",
      recipeId: "dish-1",
      titlePrefix: "Nấu ngay với ",
      highlight: "100%",
      titleSuffix: " nguyên liệu có sẵn",
      subtitle: "Thịt gà • Cà chua • Bơ • Gạo",
      actionText: "Xem chi tiết →",
      tagBadge: "hot",
      image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
      gradientColors: ["#FFF0EB", "#FFE2D7", "#FED7AA"],
      highlightColor: "#FF4D6D",
      btnGradient: ["#FF4D6D", "#FF7043"],
      badgeColor: "#E65100",
    },
    {
      id: "slide-2",
      recipeId: "dish-3",
      titlePrefix: "Thực đơn ",
      highlight: "Eat Clean",
      titleSuffix: " chỉ 380 kcal",
      subtitle: "Cá hồi • Quả bơ • Xà lách • Olive",
      actionText: "Xem chi tiết →",
      tagBadge: "popular",
      image: require("@/assets/images/salad-salmon.jpg"),
      gradientColors: ["#F0FDF4", "#DCFCE7", "#BBF7D0"],
      highlightColor: "#059669",
      btnGradient: ["#059669", "#10B981"],
      badgeColor: "#047857",
    },
    {
      id: "slide-3",
      recipeId: "dish-2",
      titlePrefix: "Bò Bít Tết sốt tiêu ",
      highlight: "giàu đạm",
      titleSuffix: " cho cả nhà",
      subtitle: "Thịt bò • Măng tây • Bơ tỏi • Tiêu",
      actionText: "Xem chi tiết →",
      tagBadge: "hot",
      image: require("@/assets/images/steak-asparagus.jpg"),
      gradientColors: ["#FFF5EB", "#FFE5D6", "#FED7AA"],
      highlightColor: "#EA580C",
      btnGradient: ["#EA580C", "#F97316"],
      badgeColor: "#C2410C",
    },
    {
      id: "slide-4",
      recipeId: "dish-5",
      titlePrefix: "Mỳ Ý sốt Bolognese chuẩn Ý trong ",
      highlight: "15 phút",
      titleSuffix: "",
      subtitle: "Mỳ Ý • Bò bằm • Cà chua bi • Phô mai",
      actionText: "Xem chi tiết →",
      tagBadge: "popular",
      image: require("@/assets/images/pasta-bolognese.jpg"),
      gradientColors: ["#FFF0EB", "#FFE0D3", "#FED7AA"],
      highlightColor: "#E11D48",
      btnGradient: ["#E11D48", "#FB7185"],
      badgeColor: "#BE123C",
    },
    {
      id: "slide-5",
      recipeId: "dish-7",
      titlePrefix: "Gà rán sốt mật ong cay giòn ",
      highlight: "98% mê",
      titleSuffix: "",
      subtitle: "Ức gà • Mật ong • Hạt mè • Ớt cay",
      actionText: "Xem chi tiết →",
      tagBadge: "hot",
      image: require("@/assets/images/crispy-chicken.jpg"),
      gradientColors: ["#FFF7ED", "#FFEDD5", "#FED7AA"],
      highlightColor: "#D97706",
      btnGradient: ["#D97706", "#F59E0B"],
      badgeColor: "#B45309",
    },
  ];

  const [trendingSlides, setTrendingSlides] = useState<HeroSlideItem[]>(heroSlides);

  useEffect(() => {
    RecipeService.getTrendingRecipes(5)
      .then((items) => {
        if (items && items.length > 0) {
          const mapped: HeroSlideItem[] = items.map((r, idx) => ({
            id: `trending-${r.id}`,
            recipeId: r.id,
            titlePrefix: `${r.title.slice(0, 22)}${r.title.length > 22 ? "..." : ""} `,
            highlight: `${r.minutes}p`,
            titleSuffix: ` • ${r.difficulty}`,
            subtitle:
              r.ingredients?.slice(0, 4).map((i) => i.name).join(" • ") ||
              r.sub ||
              "Công thức thịnh hành",
            actionText: "Xem chi tiết →",
            tagBadge: idx % 2 === 0 ? "hot" : "popular",
            image: typeof r.image === "string" ? { uri: r.image } : r.image,
            gradientColors:
              idx % 2 === 0
                ? ["#FFF0EB", "#FFE2D7", "#FED7AA"]
                : ["#F0FDF4", "#DCFCE7", "#BBF7D0"],
            highlightColor: idx % 2 === 0 ? "#FF4D6D" : "#059669",
            btnGradient:
              idx % 2 === 0
                ? ["#FF4D6D", "#FF7043"]
                : ["#059669", "#10B981"],
            badgeColor: idx % 2 === 0 ? "#E65100" : "#047857",
          }));
          setTrendingSlides(mapped);
        }
      })
      .catch((err) => console.warn("Lỗi tải trending recipes:", err));
  }, []);

  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const currentHeroIndexRef = useRef<number>(0);
  const heroListRef = useRef<FlatList>(null);
  const isUserInteractingRef = useRef<boolean>(false);
  const interactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const HERO_CARD_WIDTH = width - 40;

  // Sync ref with state
  const updateSlideIndex = (index: number) => {
    currentHeroIndexRef.current = index;
    setCurrentHeroIndex(index);
  };

  const scrollToSlide = (index: number) => {
    heroListRef.current?.scrollToOffset({
      offset: index * HERO_CARD_WIDTH,
      animated: true,
    });
    updateSlideIndex(index);
  };

  const pauseAutoScroll = () => {
    isUserInteractingRef.current = true;
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
  };

  const resumeAutoScrollAfterDelay = (delayMs = 3500) => {
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    interactionTimeoutRef.current = setTimeout(() => {
      isUserInteractingRef.current = false;
    }, delayMs);
  };

  // Auto-sliding animation cycling continuously through trending dishes
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isUserInteractingRef.current) {
        const nextIndex = (currentHeroIndexRef.current + 1) % trendingSlides.length;
        scrollToSlide(nextIndex);
      }
    }, 3500);

    return () => {
      clearInterval(timer);
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
    };
  }, [HERO_CARD_WIDTH, trendingSlides.length]);

  const handleNextSlide = () => {
    pauseAutoScroll();
    const nextIndex = (currentHeroIndexRef.current + 1) % trendingSlides.length;
    scrollToSlide(nextIndex);
    resumeAutoScrollAfterDelay(4000);
  };

  const handlePrevSlide = () => {
    pauseAutoScroll();
    const prevIndex =
      (currentHeroIndexRef.current - 1 + trendingSlides.length) % trendingSlides.length;
    scrollToSlide(prevIndex);
    resumeAutoScrollAfterDelay(4000);
  };

  const handleSelectSlide = (index: number) => {
    pauseAutoScroll();
    scrollToSlide(index);
    resumeAutoScrollAfterDelay(4000);
  };

  const renderHeroItem = useCallback(
    ({ item }: { item: (typeof trendingSlides)[0] }) => (
      <TouchableOpacity
        style={[
          styles.heroCardContainer,
          { width: HERO_CARD_WIDTH },
        ]}
        activeOpacity={0.92}
        onPress={() => handleOpenRecipe(item.recipeId)}
      >
        <LinearGradient
          colors={item.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCardGradient}
        >
          {/* Left Content Column */}
          <View style={styles.heroCardLeft}>
            <Text style={styles.heroCardTitle} numberOfLines={2}>
              {item.titlePrefix}
              <Text
                style={[
                  styles.heroCardHighlight,
                  { color: item.highlightColor },
                ]}
              >
                {item.highlight}
              </Text>
              {item.titleSuffix}
            </Text>

            <Text style={styles.heroCardSubtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>

            <View style={styles.heroBtnRow}>
              {/* Action Pill Button with Sunset Coral Gradient */}
              <TouchableOpacity
                style={styles.heroActionButton}
                activeOpacity={0.85}
                onPress={() => handleOpenRecipe(item.recipeId)}
              >
                <LinearGradient
                  colors={item.btnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.heroActionGradient}
                >
                  <Text style={styles.heroActionText}>
                    {item.actionText}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <View
                style={[
                  styles.heroTagBadgeBtn,
                  item.tagBadge === "popular"
                    ? styles.heroTagBadgePopular
                    : styles.heroTagBadgeHot,
                ]}
              >
                <Text
                  style={[
                    styles.heroTagBadgeBtnText,
                    item.tagBadge === "popular"
                      ? styles.heroTagTextPopular
                      : styles.heroTagTextHot,
                  ]}
                >
                  {item.tagBadge === "popular" ? "⭐ Popular" : "🔥 Hot"}
                </Text>
              </View>
            </View>
          </View>

          {/* Right Floating Appetizing Dish Image */}
          <View style={styles.heroImageWrapper}>
            <Image
              source={item.image}
              style={styles.heroDishImage}
              resizeMode="cover"
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    ),
    [HERO_CARD_WIDTH]
  );

  // Categories from SRS Module 4 with live sync from Backend
  const [categories, setCategories] = useState([
    {
      id: "all",
      label: "Tất cả",
      iconName: "grid-outline" as const,
      color: "#FF5722",
    },
    {
      id: "quick",
      label: "Nấu nhanh < 20p",
      iconName: "flash-outline" as const,
      color: "#F59E0B",
    },
    {
      id: "family",
      label: "Gia đình",
      iconName: "people-outline" as const,
      color: "#FF6B35",
    },
    {
      id: "healthy",
      label: "Healthy",
      iconName: "leaf-outline" as const,
      color: "#10B981",
    },
    {
      id: "budget",
      label: "Tiết kiệm",
      iconName: "wallet-outline" as const,
      color: "#3B82F6",
    },
    {
      id: "kids",
      label: "Trẻ em",
      iconName: "happy-outline" as const,
      color: "#EC4899",
    },
    {
      id: "vegetarian",
      label: "Ăn chay",
      iconName: "nutrition-outline" as const,
      color: "#059669",
    },
    {
      id: "vietnamese",
      label: "Món Việt",
      iconName: "restaurant-outline" as const,
      color: "#D97706",
    },
    {
      id: "dessert",
      label: "Tráng miệng",
      iconName: "ice-cream-outline" as const,
      color: "#8B5CF6",
    },
  ]);

  useEffect(() => {
    let isMounted = true;
    CategoryService.getCategories().then((cats) => {
      if (isMounted && cats && cats.length > 0) {
        setCategories(
          cats.map((c) => ({
            id: c.code || c.id,
            label: c.name,
            iconName: (c.icon || "restaurant-outline") as any,
            color: c.color || "#FF6B35",
          }))
        );
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Dishes categorized by SRS Category (8+ dishes per category for smooth pagination)
  const popularDishesByCategory: Record<
    string,
    Array<{
      id: string;
      title: string;
      badge: string;
      price: string;
      image: any;
      sub: string;
      fridge: string;
    }>
  > = {
    all: [
      {
        id: "dish-1",
        title: "Cơm Gà Teriyaki Áp Chảo",
        badge: "Gia đình • 4 phần",
        price: "~65.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Đậm đà • Cả nhà thích",
        fridge: "100%",
      },
      {
        id: "dish-2",
        title: "Bò Bít Tết Sốt Tiêu",
        badge: "4.9 • 30 phút",
        price: "~85.000đ",
        image: require("@/assets/images/steak-asparagus.jpg"),
        sub: "Bữa tối giàu protein",
        fridge: "85%",
      },
      {
        id: "dish-vn-1",
        title: "Phở Bò Tái Lăn Hà Nội",
        badge: "Chuẩn vị • 35 phút",
        price: "~60.000đ",
        image: require("@/assets/images/steak-asparagus.jpg"),
        sub: "Nước dùng ngọt thanh",
        fridge: "80%",
      },
      {
        id: "dish-5",
        title: "Mỳ Ý Bò Bằm Sốt Cà",
        badge: "Chuẩn Ý • 15 phút",
        price: "~45.000đ",
        image: require("@/assets/images/pasta-bolognese.jpg"),
        sub: "Cả nhà cùng mê",
        fridge: "100%",
      },
      {
        id: "dish-3",
        title: "Salad Cá Hồi Áp Chảo",
        badge: "20 phút • 420 kcal",
        price: "~55.000đ",
        image: require("@/assets/images/salad-salmon.jpg"),
        sub: "Giảm cân • Eat Clean",
        fridge: "90%",
      },
      {
        id: "dish-4",
        title: "Gà Áp Chảo Bơ Mè",
        badge: "Low Carb • 380 kcal",
        price: "~40.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Healthy • Tăng cơ",
        fridge: "100%",
      },
      {
        id: "dish-veg-1",
        title: "Nấm Đùi Gà Xào Hạt Điều",
        badge: "Thanh lọc • 320 kcal",
        price: "~40.000đ",
        image: require("@/assets/images/salad-salmon.jpg"),
        sub: "Ít béo • Bổ dưỡng",
        fridge: "90%",
      },
      {
        id: "dish-6",
        title: "Salad Rau Trộn Bơ Sáp",
        badge: "10 phút • 280 kcal",
        price: "~35.000đ",
        image: require("@/assets/images/salad-salmon.jpg"),
        sub: "Tươi mát • Giữ dáng",
        fridge: "100%",
      },
      {
        id: "dish-8",
        title: "Cơm Đùi Gà Trứng Ốp",
        badge: "12 phút • Nhanh gọn",
        price: "~25.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Tiện lợi • Đủ chất",
        fridge: "100%",
      },
      {
        id: "dish-kids-1",
        title: "Cơm Nắm Cá Ngừ Rong Biển",
        badge: "15 phút • Không khói",
        price: "~35.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Ăn liền • Đậm vị",
        fridge: "100%",
      },
      {
        id: "dish-7",
        title: "Gà Giòn Chiên Sốt Cay",
        badge: "Tiết kiệm • Dưới 30k",
        price: "~28.000đ",
        image: require("@/assets/images/crispy-chicken.jpg"),
        sub: "Bình dân • No bụng",
        fridge: "95%",
      },
      {
        id: "dish-des-1",
        title: "Panna Cotta Sữa Dâu Tây",
        badge: "Mềm mịn • Tan chảy",
        price: "~20.000đ",
        image: require("@/assets/images/crispy-chicken.jpg"),
        sub: "Tráng miệng cho bé",
        fridge: "100%",
      },
      {
        id: "dish-kids-2",
        title: "Mỳ Ý Sốt Kem Phô Mai",
        badge: "Béo ngậy • Bé mê",
        price: "~45.000đ",
        image: require("@/assets/images/pasta-bolognese.jpg"),
        sub: "Giàu canxi • Dễ tiêu",
        fridge: "90%",
      },
      {
        id: "dish-1-alt",
        title: "Gà Rim Nước Mắm Gừng",
        badge: "Bữa cơm mẹ nấu",
        price: "~50.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Gừng ấm • Đưa cơm",
        fridge: "100%",
      },
      {
        id: "dish-des-2",
        title: "Chè Khúc Bạch Hạnh Nhân",
        badge: "Thanh nhiệt • Dịu ngọt",
        price: "~32.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Khúc bạch phô mai",
        fridge: "90%",
      },
      {
        id: "dish-des-3",
        title: "Sữa Chua Hy Lạp Hoa Quả",
        badge: "Lợi khuẩn • Tươi mát",
        price: "~30.000đ",
        image: require("@/assets/images/pasta-bolognese.jpg"),
        sub: "Tráng miệng nhẹ nhàng",
        fridge: "100%",
      },
    ],
    family: [
      {
        id: "dish-1",
        title: "Cơm Gà Teriyaki Áp Chảo",
        badge: "Gia đình • 4 phần",
        price: "~65.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Đậm đà • Cả nhà thích",
        fridge: "100%",
      },
      {
        id: "dish-2",
        title: "Bò Bít Tết Sốt Tiêu",
        badge: "4.9 • 30 phút",
        price: "~85.000đ",
        image: require("@/assets/images/steak-asparagus.jpg"),
        sub: "Bữa tối giàu protein",
        fridge: "85%",
      },
      {
        id: "dish-vn-1",
        title: "Phở Bò Tái Lăn Hà Nội",
        badge: "Chuẩn vị • 35 phút",
        price: "~60.000đ",
        image: require("@/assets/images/steak-asparagus.jpg"),
        sub: "Nước dùng ngọt thanh",
        fridge: "80%",
      },
      {
        id: "dish-5",
        title: "Mỳ Ý Bò Bằm Sốt Cà",
        badge: "Chuẩn Ý • 15 phút",
        price: "~45.000đ",
        image: require("@/assets/images/pasta-bolognese.jpg"),
        sub: "Cả nhà cùng mê",
        fridge: "100%",
      },
      {
        id: "dish-7",
        title: "Gà Chiên Nước Mắm Giòn",
        badge: "Giòn thơm nức mũi",
        price: "~35.000đ",
        image: require("@/assets/images/crispy-chicken.jpg"),
        sub: "Đậm vị miền Nam",
        fridge: "95%",
      },
      {
        id: "dish-8",
        title: "Cơm Sườn Trứng Ốp La",
        badge: "Cơm tấm • Đậm đà",
        price: "~35.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Nước mắm tỏi ớt",
        fridge: "100%",
      },
      {
        id: "dish-3",
        title: "Salad Cá Hồi Áp Chảo",
        badge: "Bổ dưỡng • Cả nhà",
        price: "~55.000đ",
        image: require("@/assets/images/salad-salmon.jpg"),
        sub: "Omega-3 cho gia đình",
        fridge: "90%",
      },
      {
        id: "dish-des-1",
        title: "Panna Cotta Sữa Dâu Tây",
        badge: "Tráng miệng gia đình",
        price: "~20.000đ",
        image: require("@/assets/images/crispy-chicken.jpg"),
        sub: "Tráng miệng cho bé & mẹ",
        fridge: "100%",
      },
    ],
    healthy: [
      {
        id: "dish-3",
        title: "Salad Cá Hồi Áp Chảo",
        badge: "20 phút • 420 kcal",
        price: "~55.000đ",
        image: require("@/assets/images/salad-salmon.jpg"),
        sub: "Giảm cân • Eat Clean",
        fridge: "90%",
      },
      {
        id: "dish-4",
        title: "Gà Áp Chảo Bơ Mè",
        badge: "Low Carb • 380 kcal",
        price: "~40.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Healthy • Tăng cơ",
        fridge: "100%",
      },
      {
        id: "dish-veg-1",
        title: "Nấm Đùi Gà Xào Hạt Điều",
        badge: "Thanh lọc • 320 kcal",
        price: "~40.000đ",
        image: require("@/assets/images/salad-salmon.jpg"),
        sub: "Ít béo • Bổ dưỡng",
        fridge: "90%",
      },
      {
        id: "dish-6",
        title: "Salad Rau Trộn Bơ Sáp",
        badge: "10 phút • 280 kcal",
        price: "~35.000đ",
        image: require("@/assets/images/salad-salmon.jpg"),
        sub: "Tươi mát • Giữ dáng",
        fridge: "100%",
      },
      {
        id: "dish-1",
        title: "Cơm Gà Teriyaki Nấu Gạo Lứt",
        badge: "Giàu chất xơ • 450 kcal",
        price: "~65.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Gạo lứt dinh dưỡng",
        fridge: "100%",
      },
      {
        id: "dish-kids-1",
        title: "Cơm Nắm Rong Biển Nhật",
        badge: "Tinh bột chậm • 290 kcal",
        price: "~25.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Rong biển giải độc",
        fridge: "100%",
      },
      {
        id: "dish-2",
        title: "Bò Áp Chảo Măng Tây Healthy",
        badge: "Đạm nạc • 490 kcal",
        price: "~85.000đ",
        image: require("@/assets/images/steak-asparagus.jpg"),
        sub: "Măng tây giàu xơ",
        fridge: "85%",
      },
      {
        id: "dish-des-1",
        title: "Sữa Chua Hoa Quả Hạt Chia",
        badge: "Lợi khuẩn • 180 kcal",
        price: "~25.000đ",
        image: require("@/assets/images/crispy-chicken.jpg"),
        sub: "Tráng miệng thanh nhẹ",
        fridge: "100%",
      },
    ],
    quick: [
      {
        id: "dish-5",
        title: "Mỳ Ý Bò Bằm Sốt Cà",
        badge: "15 phút • Chuẩn Ý",
        price: "~45.000đ",
        image: require("@/assets/images/pasta-bolognese.jpg"),
        sub: "Tiện lợi • Nóng hổi",
        fridge: "100%",
      },
      {
        id: "dish-8",
        title: "Cơm Đùi Gà Trứng Ốp",
        badge: "12 phút • Nhanh gọn",
        price: "~25.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Tiện lợi • Đủ chất",
        fridge: "100%",
      },
      {
        id: "dish-kids-1",
        title: "Cơm Nắm Cá Ngừ Rong Biển",
        badge: "15 phút • Không khói",
        price: "~35.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Ăn liền • Đậm vị",
        fridge: "100%",
      },
      {
        id: "dish-3",
        title: "Salad Cá Hồi Trộn Chanh Leo",
        badge: "15 phút • Siêu tốc",
        price: "~55.000đ",
        image: require("@/assets/images/salad-salmon.jpg"),
        sub: "Tươi mát • Nhanh gọn",
        fridge: "90%",
      },
      {
        id: "dish-7",
        title: "Gà Giòn Lắc Phô Mai Siêu Tốc",
        badge: "15 phút • Giòn rụm",
        price: "~30.000đ",
        image: require("@/assets/images/crispy-chicken.jpg"),
        sub: "Chiên nồi chiên không dầu",
        fridge: "95%",
      },
      {
        id: "dish-6",
        title: "Salad Trộn Sốt Giấm Táo",
        badge: "8 phút • Không nấu",
        price: "~25.000đ",
        image: require("@/assets/images/salad-salmon.jpg"),
        sub: "Trộn ăn ngay",
        fridge: "100%",
      },
      {
        id: "dish-vn-1",
        title: "Phở Bò Nước Dùng Nấu Sẵn",
        badge: "10 phút • Nóng hổi",
        price: "~60.000đ",
        image: require("@/assets/images/steak-asparagus.jpg"),
        sub: "Nhanh gọn tiện lợi",
        fridge: "80%",
      },
      {
        id: "dish-4",
        title: "Ức Gà Áp Chảo Bơ Tỏi",
        badge: "12 phút • Thơm lừng",
        price: "~40.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Chín mềm mọng nước",
        fridge: "100%",
      },
    ],
    budget: [
      {
        id: "dish-7",
        title: "Gà Giòn Chiên Sốt Cay",
        badge: "Tiết kiệm • Dưới 30k",
        price: "~28.000đ",
        image: require("@/assets/images/crispy-chicken.jpg"),
        sub: "Bình dân • No bụng",
        fridge: "95%",
      },
      {
        id: "dish-8",
        title: "Cơm Đùi Gà Trứng Ốp",
        badge: "Dễ làm • ~25.000đ",
        price: "~25.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Sinh viên • Tiết kiệm",
        fridge: "100%",
      },
      {
        id: "dish-kids-1",
        title: "Cơm Nắm Rong Biển Nhật",
        badge: "Giá rẻ • ~20.000đ",
        price: "~20.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Đơn giản • Dễ làm",
        fridge: "100%",
      },
      {
        id: "dish-des-1",
        title: "Panna Cotta Dâu Tây",
        badge: "Tráng miệng • ~15.000đ",
        price: "~15.000đ",
        image: require("@/assets/images/crispy-chicken.jpg"),
        sub: "Ngọt ngào • Mát lạnh",
        fridge: "100%",
      },
      {
        id: "dish-5",
        title: "Mỳ Ý Xốt Cà Chua Trứng",
        badge: "Tiết kiệm • ~22.000đ",
        price: "~22.000đ",
        image: require("@/assets/images/pasta-bolognese.jpg"),
        sub: "Dễ làm tại nhà",
        fridge: "100%",
      },
      {
        id: "dish-1",
        title: "Cơm Đùi Gà Rim Nước Mắm",
        badge: "Đậm vị • ~28.000đ",
        price: "~28.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Bữa trưa giá rẻ",
        fridge: "100%",
      },
      {
        id: "dish-veg-1",
        title: "Đậu Hũ Sốt Nấm Hạt Điều",
        badge: "Thuần chay • ~24.000đ",
        price: "~24.000đ",
        image: require("@/assets/images/salad-salmon.jpg"),
        sub: "Bổ dưỡng rẻ khỏe",
        fridge: "90%",
      },
      {
        id: "dish-4",
        title: "Gà Xào Bắp Cải Tiết Kiệm",
        badge: "Bình dân • ~26.000đ",
        price: "~26.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Đưa cơm no lâu",
        fridge: "100%",
      },
    ],
    kids: [
      {
        id: "dish-kids-1",
        title: "Cơm Nắm Cá Ngừ Rong Biển",
        badge: "Bé thích • Giàu DHA",
        price: "~35.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Ngộ nghĩnh • Dễ ăn",
        fridge: "100%",
      },
      {
        id: "dish-kids-2",
        title: "Mỳ Ý Sốt Kem Phô Mai",
        badge: "Béo ngậy • Bé mê",
        price: "~45.000đ",
        image: require("@/assets/images/pasta-bolognese.jpg"),
        sub: "Giàu canxi • Dễ tiêu",
        fridge: "90%",
      },
      {
        id: "dish-7",
        title: "Gà Viên Mật Ong Giòn Tan",
        badge: "Giòn rụm • Không cay",
        price: "~30.000đ",
        image: require("@/assets/images/crispy-chicken.jpg"),
        sub: "Mật ong thơm ngọt",
        fridge: "95%",
      },
      {
        id: "dish-des-1",
        title: "Panna Cotta Sữa Dâu Tây",
        badge: "Mềm mịn • Tan chảy",
        price: "~20.000đ",
        image: require("@/assets/images/crispy-chicken.jpg"),
        sub: "Tráng miệng cho bé",
        fridge: "100%",
      },
      {
        id: "dish-5",
        title: "Mỳ Ý Bò Bằm Sốt Cà Bi",
        badge: "Trẻ em • Ngọt tự nhiên",
        price: "~40.000đ",
        image: require("@/assets/images/pasta-bolognese.jpg"),
        sub: "Cà chua giàu vitamin A",
        fridge: "100%",
      },
      {
        id: "dish-1",
        title: "Cơm Gà Teriyaki Ngọt Dịu",
        badge: "Bé ăn ngon miệng",
        price: "~45.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Sốt ngọt dễ nuốt",
        fridge: "100%",
      },
      {
        id: "dish-8",
        title: "Cơm Trứng Cuộn Omurice",
        badge: "Hình gấu ngộ nghĩnh",
        price: "~25.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Trứng mềm béo thơm",
        fridge: "100%",
      },
      {
        id: "dish-3",
        title: "Bơ Nghiền Sữa Chua Cho Bé",
        badge: "Chất béo tốt cho não",
        price: "~22.000đ",
        image: require("@/assets/images/salad-salmon.jpg"),
        sub: "Ăn dặm & bữa phụ",
        fridge: "90%",
      },
    ],
    vegetarian: [
      {
        id: "dish-veg-1",
        title: "Nấm Đùi Gà Xào Hạt Điều",
        badge: "Thuần chay • Thanh đạm",
        price: "~40.000đ",
        image: require("@/assets/images/salad-salmon.jpg"),
        sub: "Thơm bùi • Bổ dưỡng",
        fridge: "90%",
      },
      {
        id: "dish-3",
        title: "Salad Rau Mầm Bơ Quả",
        badge: "Tươi xanh • 100% Chay",
        price: "~35.000đ",
        image: require("@/assets/images/salad-salmon.jpg"),
        sub: "Giàu vitamin • Nhẹ bụng",
        fridge: "95%",
      },
      {
        id: "dish-kids-1",
        title: "Cơm Nắm Rong Biển Hạt Mè",
        badge: "Chay thực dưỡng",
        price: "~22.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Mè rang thơm bùi",
        fridge: "100%",
      },
      {
        id: "dish-des-1",
        title: "Chè Thạch Dâu Trái Cây",
        badge: "Mát lạnh • Chay thanh",
        price: "~25.000đ",
        image: require("@/assets/images/crispy-chicken.jpg"),
        sub: "Tráng miệng thanh nhiệt",
        fridge: "100%",
      },
      {
        id: "dish-5",
        title: "Mỳ Ý Sốt Cà Chua Nấm Đùi Gà",
        badge: "Chay chuẩn vị Ý",
        price: "~38.000đ",
        image: require("@/assets/images/pasta-bolognese.jpg"),
        sub: "Nấm ngọt thanh đạm",
        fridge: "100%",
      },
      {
        id: "dish-6",
        title: "Salad Bơ Sáp Dầu Giấm",
        badge: "Thuần thực vật",
        price: "~32.000đ",
        image: require("@/assets/images/salad-salmon.jpg"),
        sub: "Dầu olive nguyên chất",
        fridge: "100%",
      },
      {
        id: "dish-8",
        title: "Đậu Hũ Chiên Sả Ớt Chay",
        badge: "Giòn thơm nức mũi",
        price: "~20.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Đậm vị đưa cơm",
        fridge: "100%",
      },
      {
        id: "dish-4",
        title: "Nấm Bào Ngư Chiên Giòn",
        badge: "Giòn rụm • Chay thanh",
        price: "~30.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Món ăn vặt thuần chay",
        fridge: "100%",
      },
    ],
    vietnamese: [
      {
        id: "dish-vn-1",
        title: "Phở Bò Tái Lăn Hà Nội",
        badge: "Món Việt • Tinh hoa",
        price: "~60.000đ",
        image: require("@/assets/images/steak-asparagus.jpg"),
        sub: "Nước dùng ngọt thanh",
        fridge: "80%",
      },
      {
        id: "dish-8",
        title: "Cơm Sườn Trứng Ốp La",
        badge: "Cơm tấm • Đậm đà",
        price: "~35.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Nước mắm tỏi ớt",
        fridge: "100%",
      },
      {
        id: "dish-1",
        title: "Gà Rim Nước Mắm Gừng",
        badge: "Bữa cơm mẹ nấu",
        price: "~50.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Gừng ấm • Đưa cơm",
        fridge: "100%",
      },
      {
        id: "dish-7",
        title: "Gà Chiên Nước Mắm Giòn",
        badge: "Giòn thơm nức mũi",
        price: "~35.000đ",
        image: require("@/assets/images/crispy-chicken.jpg"),
        sub: "Đậm vị miền Nam",
        fridge: "95%",
      },
      {
        id: "dish-3",
        title: "Gỏi Cá Hồi Xoài Xanh",
        badge: "Biến tấu Việt Nam",
        price: "~55.000đ",
        image: require("@/assets/images/salad-salmon.jpg"),
        sub: "Chua ngọt cay nồng",
        fridge: "90%",
      },
      {
        id: "dish-veg-1",
        title: "Canh Nấm Đùi Gà Nấu Rong",
        badge: "Canh thanh mát",
        price: "~35.000đ",
        image: require("@/assets/images/salad-salmon.jpg"),
        sub: "Bữa cơm gia đình",
        fridge: "90%",
      },
      {
        id: "dish-5",
        title: "Mỳ Xào Bò Rau Cải",
        badge: "Quen thuộc • Đậm đà",
        price: "~40.000đ",
        image: require("@/assets/images/pasta-bolognese.jpg"),
        sub: "Bò mềm cải giòn",
        fridge: "100%",
      },
      {
        id: "dish-des-1",
        title: "Chè Khúc Bạch Đường Phèn",
        badge: "Thanh nhiệt giải nhiệt",
        price: "~25.000đ",
        image: require("@/assets/images/crispy-chicken.jpg"),
        sub: "Hạnh nhân giòn bùi",
        fridge: "100%",
      },
    ],
    dessert: [
      {
        id: "dish-des-1",
        title: "Panna Cotta Sốt Dâu Tây",
        badge: "Mát lạnh • Núng nính",
        price: "~30.000đ",
        image: require("@/assets/images/crispy-chicken.jpg"),
        sub: "Mềm mịn • Tan trong miệng",
        fridge: "100%",
      },
      {
        id: "dish-3",
        title: "Sinh Tố Bơ Chuối Hạt Chia",
        badge: "Bổ dưỡng • Healthy",
        price: "~28.000đ",
        image: require("@/assets/images/salad-salmon.jpg"),
        sub: "Bữa phụ nạp năng lượng",
        fridge: "100%",
      },
      {
        id: "dish-kids-1",
        title: "Chè Khúc Bạch Hạnh Nhân",
        badge: "Thanh nhiệt • Dịu ngọt",
        price: "~32.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Khúc bạch phô mai",
        fridge: "90%",
      },
      {
        id: "dish-5",
        title: "Sữa Chua Hy Lạp Hoa Quả",
        badge: "Lợi khuẩn • Tươi mát",
        price: "~30.000đ",
        image: require("@/assets/images/pasta-bolognese.jpg"),
        sub: "Tráng miệng nhẹ nhàng",
        fridge: "100%",
      },
      {
        id: "dish-7",
        title: "Chuối Chiên Mật Ong Giòn",
        badge: "Nóng giòn thơm lừng",
        price: "~18.000đ",
        image: require("@/assets/images/crispy-chicken.jpg"),
        sub: "Mật ong hoa rừng",
        fridge: "95%",
      },
      {
        id: "dish-6",
        title: "Pudding Xoài Cốt Dừa",
        badge: "Chua ngọt béo ngậy",
        price: "~26.000đ",
        image: require("@/assets/images/salad-salmon.jpg"),
        sub: "Cốt dừa béo thơm",
        fridge: "100%",
      },
      {
        id: "dish-4",
        title: "Kem Trái Cây Sữa Tươi",
        badge: "Mát lạnh ngày hè",
        price: "~20.000đ",
        image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        sub: "Tươi ngon thanh mát",
        fridge: "100%",
      },
      {
        id: "dish-2",
        title: "Bánh Crepe Sốt Socola Dâu",
        badge: "Chuẩn vị Pháp",
        price: "~35.000đ",
        image: require("@/assets/images/steak-asparagus.jpg"),
        sub: "Vỏ bánh mềm mỏng",
        fridge: "85%",
      },
    ],
  };

  // Personalized dishes computed from user survey preferences (portion, cuisines, health goals)
  const personalizedDishes = useMemo(() => {
    const allDishes = popularDishesByCategory["all"] ?? [];
    return allDishes
      .map((dish) => {
        let matchScore = 50;
        let matchReason = "Phù hợp khẩu vị của bạn";

        // 1. Check portion match
        if (userPrefs.portion === "3-4" || userPrefs.portion === "5+") {
          if (
            dish.badge.toLowerCase().includes("gia đình") ||
            dish.badge.toLowerCase().includes("phần") ||
            dish.title.includes("Gà") ||
            dish.title.includes("Phở")
          ) {
            matchScore += 30;
            matchReason = `Khớp ${PreferenceService.getPortionDisplay(userPrefs.portion)}`;
          }
        } else {
          // 1 or 2 people
          if (
            dish.badge.toLowerCase().includes("15 phút") ||
            dish.badge.toLowerCase().includes("20 phút") ||
            dish.title.includes("Mỳ") ||
            dish.title.includes("Salad")
          ) {
            matchScore += 30;
            matchReason = `Nhanh gọn cho ${PreferenceService.getPortionDisplay(userPrefs.portion)}`;
          }
        }

        // 2. Check cuisine match
        if (
          userPrefs.cuisines.includes("vietnamese") &&
          (dish.badge.includes("🇻🇳") || dish.title.includes("Phở") || dish.title.includes("Cơm"))
        ) {
          matchScore += 25;
          matchReason = "Chuẩn vị Món Việt";
        }
        if (
          userPrefs.cuisines.includes("healthy") &&
          (dish.sub.toLowerCase().includes("clean") || dish.sub.toLowerCase().includes("protein") || dish.title.includes("Salad"))
        ) {
          matchScore += 25;
          matchReason = "Chuẩn Eat Clean";
        }
        if (
          userPrefs.cuisines.includes("quick") &&
          (dish.badge.includes("15") || dish.badge.includes("20"))
        ) {
          matchScore += 25;
          matchReason = "Nấu nhanh < 20p";
        }
        if (
          userPrefs.cuisines.includes("western") &&
          (dish.badge.includes("Ý") || dish.badge.includes("Pháp") || dish.title.includes("Bò") || dish.title.includes("Mỳ"))
        ) {
          matchScore += 25;
          matchReason = "Chuẩn Món Âu & Steak";
        }

        return { ...dish, matchScore, matchReason };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 6);
  }, [userPrefs]);

  // Filtered dishes based on category, search, and filter modal
  const filteredDishes = useMemo(() => {
    let baseList =
      selectedCategory === "all"
        ? (popularDishesByCategory["all"] ?? [])
        : (popularDishesByCategory[selectedCategory] ??
          popularDishesByCategory["family"]);

    let list = [...customDishes, ...baseList];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (dish) =>
          dish.title.toLowerCase().includes(q) ||
          dish.badge.toLowerCase().includes(q) ||
          dish.sub.toLowerCase().includes(q)
      );
    }

    if (filterTime === "15") {
      list = list.filter(
        (d) =>
          d.badge.includes("15") ||
          d.badge.includes("12") ||
          d.badge.includes("10") ||
          d.badge.includes("8")
      );
    } else if (filterTime === "30") {
      list = list.filter(
        (d) =>
          !d.badge.includes("35") &&
          !d.badge.includes("40")
      );
    }

    if (filterCalo === "400") {
      list = list.filter(
        (d) =>
          d.badge.includes("380") ||
          d.badge.includes("280") ||
          d.badge.includes("320") ||
          d.badge.includes("290") ||
          d.badge.includes("180") ||
          d.badge.includes("kcal")
      );
    }

    if (filterFridgeOnly) {
      list = list.filter((d) => {
        const val = parseInt(d.fridge.replace("%", ""), 10);
        return !isNaN(val) && val >= 80;
      });
    }

    return list;
  }, [
    selectedCategory,
    searchQuery,
    filterTime,
    filterCalo,
    filterFridgeOnly,
    popularDishesByCategory,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredDishes.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(
    currentPage,
    serverDishes.length > 0 ? serverTotalPages : totalPages
  );
  const paginatedDishes = filteredDishes.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  const displayDishes = serverDishes.length > 0 ? serverDishes : paginatedDishes;
  const displayTotalPages = serverDishes.length > 0 ? serverTotalPages : totalPages;
  const displayCount = serverDishes.length > 0 ? serverTotalCount : filteredDishes.length;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      {/* 1. Main Home Tab Content */}
      {activeTab === "home" && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 10,
              paddingBottom: insets.bottom + 90, // Space for docked tab bar
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                fetchRecipes(false);
                CartService.fetchServerItems().catch(() => {});
              }}
              colors={["#FF5722"]}
              tintColor="#FF5722"
            />
          }
        >
          {/* Soft Sunset Pastel Gradient Top Backdrop */}
          <LinearGradient
            colors={["#FFE7DC", "#FFF3EB", "#FDFEFE", "#FFFFFF"]}
            locations={[0, 0.45, 0.8, 1]}
            style={styles.topBackdropGradient}
            pointerEvents="none"
          />

          {/* 1. Top Profile Header */}
          <View style={styles.headerRow}>
            {/* Left: User Avatar & Status */}
            <TouchableOpacity
              style={styles.userProfileLeft}
              activeOpacity={0.8}
              onPress={() => setActiveTab("profile")}
            >
              <View style={styles.avatarBorder}>
                <Image
                  source={
                    user?.avatar
                      ? { uri: user.avatar }
                      : require("@/assets/images/smartcook-auth-bg.jpg")
                  }
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
                <View style={styles.onlineBadge} />
              </View>

              <View style={styles.userInfoCol}>
                <Text style={styles.userNameText}>
                  {user?.fullName ||
                    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
                    "Alex Cooker"}
                </Text>
                <View style={styles.premiumTag}>
                  <Ionicons name="sparkles" size={10} color="#E65100" />
                  <Text style={styles.premiumText}>
                    {user?.level || "Tập sự"} • {user?.chefExp ?? 0} XP
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Right: Floating Circular Action Buttons */}
            <View style={styles.headerRightActions}>
              {/* Shopping Cart / Note Button with Live Badge */}
              <TouchableOpacity
                style={styles.circularIconBtn}
                activeOpacity={0.75}
                onPress={() => setShowShoppingNote(true)}
              >
                <Ionicons name="cart-outline" size={20} color="#334155" />
                {cartCount > 0 && (
                  <View style={styles.cartBadgeCircle}>
                    <Text style={styles.cartBadgeCircleText}>
                      {cartCount > 9 ? "9+" : cartCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>


              {/* Meal Planner & Chef Rewards */}
              <TouchableOpacity
                style={styles.circularIconBtn}
                activeOpacity={0.75}
                onPress={() => {
                  setPlannerSubTab("rewards");
                  setActiveTab("planner");
                }}
              >
                <Ionicons name="calendar-outline" size={19} color="#0284C7" />
              </TouchableOpacity>

              {/* Notification Bell with Realtime Badge */}
              <TouchableOpacity
                style={styles.circularIconBtn}
                activeOpacity={0.75}
                onPress={() => setShowNotificationModal(true)}
              >
                <Ionicons
                  name={unreadNotifCount > 0 ? "notifications" : "notifications-outline"}
                  size={20}
                  color={unreadNotifCount > 0 ? "#FF5722" : "#334155"}
                />
                {unreadNotifCount > 0 ? (
                  <View style={styles.notifBadgeCircle}>
                    <Text style={styles.cartBadgeCircleText}>
                      {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>
          </View>

          {/* Shopping Reminder Banner (Băng rôn nhắc nhở đi chợ phía trên app) */}
          <ShoppingReminderBanner
            onPress={() => setShowShoppingNote(true)}
          />

          {/* 2. Search & Filter Bar Row */}
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={20} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm món ăn, nguyên liệu, calo..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setCurrentPage(1);
                }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Button */}
            <TouchableOpacity
              style={styles.filterButton}
              activeOpacity={0.8}
              onPress={() => setShowFilterModal(true)}
            >
              <Ionicons name="options-outline" size={20} color="#334155" />
            </TouchableOpacity>
          </View>

          {/* 3. Categories Circular Row */}
          <View style={styles.categoriesSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesRow}
            >
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.categoryItem}
                    activeOpacity={0.75}
                    onPress={() => {
                      setSelectedCategory(cat.id);
                      setCurrentPage(1);
                    }}
                  >
                    <View
                      style={[
                        styles.categoryCircle,
                        isSelected && styles.categoryCircleActive,
                      ]}
                    >
                      <Ionicons
                        name={cat.iconName}
                        size={22}
                        color={isSelected ? BrandColors.primary : cat.color}
                      />
                    </View>
                    <Text
                      style={[
                        styles.categoryLabel,
                        isSelected && styles.categoryLabelActive,
                      ]}
                      numberOfLines={1}
                    >
                      {cat.label}
                    </Text>
                    {isSelected && <View style={styles.categoryActiveDot} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 4. Hero Carousel Section (Hot Hôm Nay) */}
          <View style={styles.heroSection}>
            {/* Header Row with title and arrows */}
            <View style={styles.heroHeaderRow}>
              <View style={styles.heroHeaderTitleGroup}>
                <Text style={styles.heroSectionHeader}>
                  Hot hôm nay
                </Text>
              </View>

              {/* Manual Back & Forth Buttons */}
              <View style={styles.heroNavButtons}>
                <TouchableOpacity
                  style={styles.heroNavBtn}
                  activeOpacity={0.7}
                  onPress={handlePrevSlide}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-back" size={15} color="#475569" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.heroNavBtn}
                  activeOpacity={0.7}
                  onPress={handleNextSlide}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-forward" size={15} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Carousel Slider */}
            <View style={[styles.heroCardOuter, { width: HERO_CARD_WIDTH }]}>
              <FlatList
                ref={heroListRef}
                data={trendingSlides}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={HERO_CARD_WIDTH}
                snapToAlignment="center"
                decelerationRate="fast"
                bounces={false}
                keyExtractor={(item) => item.id}
                initialNumToRender={2}
                maxToRenderPerBatch={2}
                windowSize={3}
                removeClippedSubviews={false}
                getItemLayout={(_, index) => ({
                  length: HERO_CARD_WIDTH,
                  offset: HERO_CARD_WIDTH * index,
                  index,
                })}
                onScrollBeginDrag={pauseAutoScroll}
                onScrollEndDrag={() => resumeAutoScrollAfterDelay(3500)}
                onMomentumScrollEnd={(e) => {
                  const offsetX = e.nativeEvent.contentOffset.x;
                  const newIdx = Math.round(offsetX / HERO_CARD_WIDTH);
                  if (newIdx >= 0 && newIdx < trendingSlides.length) {
                    updateSlideIndex(newIdx);
                  }
                  resumeAutoScrollAfterDelay(3500);
                }}
                renderItem={renderHeroItem}
              />
            </View>

            {/* Pagination Indicators (Dots / Active Pill) */}
            <View style={styles.heroPaginationRow}>
              {trendingSlides.map((slide, index) => {
                const isActive = index === currentHeroIndex;
                return (
                  <TouchableOpacity
                    key={slide.id}
                    activeOpacity={0.7}
                    onPress={() => handleSelectSlide(index)}
                    style={[
                      styles.paginationDot,
                      isActive && styles.paginationDotActive,
                    ]}
                  />
                );
              })}
            </View>
          </View>

          {/* 4.5. PERSONALIZED RECOMMENDATION SECTION (DÀNH RIÊNG CHO KHẨU VỊ CỦA BẠN) */}
          <View style={styles.personalizedSection}>
            <View style={styles.personalizedHeaderRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.personalizedSectionHeading}>
                    Dành riêng cho khẩu vị của bạn
                  </Text>
                  <View style={styles.personalizedSparkBadge}>
                    <Ionicons name="sparkles" size={10} color="#EA580C" />
                    <Text style={styles.personalizedSparkText}>AI Match</Text>
                  </View>
                </View>
                <Text style={styles.personalizedSectionSubheading}>
                  Khẩu phần: {PreferenceService.getPortionDisplay(userPrefs.portion)} •{" "}
                  {userPrefs.cuisines
                    .slice(0, 2)
                    .map((id) => CUISINE_OPTIONS.find((c) => c.id === id)?.label || id)
                    .join(", ")}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.tweakPrefsBtn}
                onPress={() => router.push("/onboarding-survey")}
                activeOpacity={0.75}
              >
                <Ionicons name="options-outline" size={12} color="#EA580C" />
                <Text style={styles.tweakPrefsText}>Tùy chỉnh</Text>
              </TouchableOpacity>
            </View>

            {/* Horizontal Scroll of Personalized Cards */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.personalizedCardsScroll}
            >
              {personalizedDishes.map((dish) => (
                <TouchableOpacity
                  key={dish.id}
                  style={styles.personalizedDishCard}
                  onPress={() => handleOpenRecipe(dish.id)}
                  activeOpacity={0.88}
                >
                  <View style={styles.personalizedImageWrap}>
                    <Image
                      source={dish.image}
                      style={styles.personalizedDishImg}
                      resizeMode="cover"
                    />
                    <View
                      style={[
                        styles.cardHotPopularBadge,
                        dish.id.includes("1") || dish.id.includes("custom")
                          ? styles.badgeHot
                          : styles.badgePopular,
                      ]}
                    >
                      <Text
                        style={[
                          styles.cardHotPopularText,
                          dish.id.includes("1") || dish.id.includes("custom")
                            ? styles.badgeTextHot
                            : styles.badgeTextPopular,
                        ]}
                      >
                        {dish.id.includes("1") || dish.id.includes("custom")
                          ? "🔥 Hot"
                          : "⭐ Popular"}
                      </Text>
                    </View>
                    <View style={styles.personalizedMatchPill}>
                      <Ionicons name="checkmark-circle" size={11} color="#16A34A" />
                      <Text style={styles.personalizedMatchPillText}>
                        {dish.matchReason}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.personalizedDishInfo}>
                    <Text style={styles.personalizedDishTitle} numberOfLines={1}>
                      {dish.title}
                    </Text>
                    <Text style={styles.personalizedDishSub} numberOfLines={1}>
                      {dish.sub}
                    </Text>
                    <View style={styles.personalizedDishBottomRow}>
                      <Text style={styles.personalizedDishPrice}>{dish.price}</Text>
                      <View style={styles.cookNowMiniPill}>
                        <Text style={styles.cookNowMiniText}>Nấu ngay ›</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* 5. Most Popular Offer (Món Ăn Phổ Biến Nhất) with Pagination */}
          <View style={styles.popularSection}>
            {/* Clean Modern Typography Header (No Box, No Icon) */}
            <View style={styles.cleanTextHeaderRow}>
              <View style={styles.cleanTextHeaderLeft}>
                <Text style={styles.cleanSectionHeading}>Món ăn phổ biến</Text>
                <Text style={styles.cleanSectionSubheading}>
                  Gợi ý món ngon được yêu thích nhất
                </Text>
              </View>

              {/* Right Side: Actions (Create Recipe + Filter/Count) */}
              <View style={styles.cleanHeaderActions}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowCreateRecipeModal(true)}
                  style={styles.cleanCreateRecipeBtn}
                >
                  <Ionicons name="add-circle" size={15} color={BrandColors.primaryDark} />
                  <Text style={styles.cleanCreateRecipeBtnText}>Tạo món</Text>
                </TouchableOpacity>

                {selectedCategory !== "all" ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedCategory("all");
                      setCurrentPage(1);
                    }}
                    style={styles.cleanFilterTextBtn}
                  >
                    <Text style={styles.cleanFilterActiveText}>
                      {categories.find((c) => c.id === selectedCategory)?.label ?? ""} ✕
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowFilterModal(true)}
                    style={styles.cleanCountBtn}
                  >
                    <Text style={styles.cleanCountText}>
                      {displayCount} món
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Empty or Loading State */}
            {isLoadingDishes && displayDishes.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color="#FF5722" />
                <Text style={{ marginTop: 12, color: "#64748B", fontSize: 13, fontWeight: "500" }}>
                  Đang tải danh sách công thức...
                </Text>
              </View>
            ) : displayDishes.length === 0 ? (
              <View style={styles.emptyDishesState}>
                <Ionicons name="restaurant-outline" size={38} color="#CBD5E1" />
                <Text style={styles.emptyDishesTitle}>Không tìm thấy món ăn phù hợp</Text>
                <Text style={styles.emptyDishesSub}>
                  Thử tìm kiếm với từ khóa khác hoặc xóa các bộ lọc
                </Text>
                <TouchableOpacity
                  style={styles.resetFilterBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setFilterTime("all");
                    setFilterCalo("all");
                    setFilterFridgeOnly(false);
                    setCurrentPage(1);
                  }}
                >
                  <Text style={styles.resetFilterText}>Xem tất cả món</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* 2-Column Paginated Dish Cards */
              <View style={styles.popularGrid}>
                {displayDishes.map((dish) => {
                  const isFav = Boolean(favoriteIds[dish.id]);
                  return (
                    <TouchableOpacity
                      key={dish.id}
                      style={[styles.dishCard, { width: (width - 40 - 14) / 2 }]}
                      activeOpacity={0.88}
                      onPress={() => handleOpenRecipe(dish.id)}
                    >
                      {/* Floating Heart Favorite Button */}
                      <TouchableOpacity
                        style={styles.favoriteButton}
                        activeOpacity={0.8}
                        onPress={() => toggleFavorite(dish.id)}
                      >
                        <Ionicons
                          name={isFav ? "heart" : "heart-outline"}
                          size={17}
                          color={isFav ? "#FF4D6D" : "#94A3B8"}
                        />
                      </TouchableOpacity>

                      {/* Centered Food Image */}
                      <View style={styles.dishImageContainer}>
                        <Image
                          source={
                            typeof dish.image === "string"
                              ? { uri: dish.image }
                              : dish.image
                          }
                          style={styles.dishImage}
                          resizeMode="cover"
                        />
                        {/* Small Hot / Popular Badge Button */}
                        <View
                          style={[
                            styles.cardHotPopularBadge,
                            ((dish as any).hotTag === "popular" || dish.id.includes("3") || dish.id.includes("5"))
                              ? styles.badgePopular
                              : styles.badgeHot,
                          ]}
                        >
                          <Text
                            style={[
                              styles.cardHotPopularText,
                              ((dish as any).hotTag === "popular" || dish.id.includes("3") || dish.id.includes("5"))
                                ? styles.badgeTextPopular
                                : styles.badgeTextHot,
                            ]}
                          >
                            {((dish as any).hotTag === "popular" || dish.id.includes("3") || dish.id.includes("5"))
                              ? "⭐ Popular"
                              : "🔥 Hot"}
                          </Text>
                        </View>
                      </View>

                      {/* Dish Details */}
                      <View style={styles.dishDetails}>
                        <View style={styles.badgeRow}>
                          <Text style={styles.dishBadgeText}>{dish.badge}</Text>
                        </View>
                        <Text style={styles.dishTitle} numberOfLines={1}>
                          {dish.title}
                        </Text>
                        <View style={styles.dishFooterRow}>
                          <Text style={styles.dishSubText} numberOfLines={1}>
                            {dish.sub}
                          </Text>
                          <View style={styles.quickDetailChip}>
                            <Text style={styles.quickDetailText}>
                              Xem chi tiết →
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Compact Minimal Pagination Controls */}
            {displayTotalPages > 1 && (
              <View style={styles.compactPaginationRow}>
                {/* Previous Button */}
                <TouchableOpacity
                  style={[
                    styles.compactPageArrow,
                    safeCurrentPage <= 1 && styles.compactPageArrowDisabled,
                  ]}
                  disabled={safeCurrentPage <= 1}
                  activeOpacity={0.7}
                  onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="chevron-back"
                    size={14}
                    color={safeCurrentPage <= 1 ? "#CBD5E1" : "#475569"}
                  />
                </TouchableOpacity>

                {/* Numbered Page Buttons */}
                <View style={styles.compactPageList}>
                  {Array.from({ length: displayTotalPages }, (_, i) => i + 1).map(
                    (pageNum) => {
                      const isActive = pageNum === safeCurrentPage;
                      return (
                        <TouchableOpacity
                          key={pageNum}
                          style={[
                            styles.compactPageBtn,
                            isActive && styles.compactPageBtnActive,
                          ]}
                          activeOpacity={0.75}
                          onPress={() => setCurrentPage(pageNum)}
                        >
                          <Text
                            style={[
                              styles.compactPageText,
                              isActive && styles.compactPageTextActive,
                            ]}
                          >
                            {pageNum}
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </View>

                {/* Next Button */}
                <TouchableOpacity
                  style={[
                    styles.compactPageArrow,
                    safeCurrentPage >= displayTotalPages && styles.compactPageArrowDisabled,
                  ]}
                  disabled={safeCurrentPage >= displayTotalPages}
                  activeOpacity={0.7}
                  onPress={() => setCurrentPage((p) => Math.min(displayTotalPages, p + 1))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={safeCurrentPage >= displayTotalPages ? "#CBD5E1" : "#475569"}
                  />
                </TouchableOpacity>

                {/* Subtle compact counter text */}
                <Text style={styles.compactCounterText}>
                  {safeCurrentPage}/{displayTotalPages}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* 2. Smart Fridge Tab Content (Module 6 & 14) */}
      {activeTab === "fridge" && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: insets.bottom + 90, paddingTop: insets.top + 8 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
        >
          <ShoppingReminderBanner onPress={() => setShowShoppingNote(true)} />
          <FridgeView insetsTop={0} onBack={() => setActiveTab("home")} />
        </ScrollView>
      )}

      {/* 2.5. Weekly Meal Planner Content (SRS Module 15 & 16) */}
      {activeTab === "planner" && (
        <View style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 90 }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8, gap: 10 }}>
            <TouchableOpacity
              onPress={() => setActiveTab("home")}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" }}
            >
              <Ionicons name="arrow-back" size={20} color="#334155" />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A" }}>Thực Đơn & Kế Hoạch Tuần</Text>
          </View>
          <PlannerView
            insetsTop={0}
            initialSubTab={plannerSubTab}
            onXpUpdated={(newXp, newLevel) => updateChefXP(newXp, newLevel)}
          />
        </View>
      )}

      {/* 3. Scan AI Tab Content (Module 7 & 25) */}
      {activeTab === "scan" && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: insets.bottom + 90, paddingTop: insets.top + 8 }}
          showsVerticalScrollIndicator={false}
        >
          <ScanAIView insetsTop={0} />
        </ScrollView>
      )}

      {/* 4. Community Tab Content */}
      {activeTab === "community" && (
        <View style={{ flex: 1 }}>
          <CommunityView insetsTop={insets.top} insetsBottom={insets.bottom} />
        </View>
      )}

      {/* 5. Profile & Personalization Tab Content (Module 2 & 11) */}
      {activeTab === "profile" && (
        <View style={{ flex: 1, paddingBottom: insets.bottom + 90, paddingTop: insets.top + 8 }}>
          <ProfileView insetsTop={0} />
        </View>
      )}

      {/* 6. Docked Floating Bottom Navigation Bar */}
      <View
        style={[
          styles.bottomBarWrapper,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <View style={styles.bottomNavContainer}>
          {/* Tab 1: Home */}
          <TouchableOpacity
            style={styles.tabItem}
            activeOpacity={0.8}
            onPress={() => setActiveTab("home")}
          >
            <Ionicons
              name={activeTab === "home" ? "home" : "home-outline"}
              size={23}
              color={activeTab === "home" ? BrandColors.primary : "#94A3B8"}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === "home" && styles.tabLabelActive,
              ]}
            >
              Khám Phá
            </Text>
          </TouchableOpacity>

          {/* Tab 2: Fridge (Tủ Lạnh) */}
          <TouchableOpacity
            style={styles.tabItem}
            activeOpacity={0.8}
            onPress={() => setActiveTab("fridge")}
          >
            <Ionicons
              name={activeTab === "fridge" ? "restaurant" : "restaurant-outline"}
              size={23}
              color={activeTab === "fridge" ? BrandColors.primary : "#94A3B8"}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === "fridge" && styles.tabLabelActive,
              ]}
            >
              Bếp Của Tôi
            </Text>
          </TouchableOpacity>

          {/* Tab 3: Scan AI (Center Elevated) */}
          <TouchableOpacity
            style={styles.tabItemCenter}
            activeOpacity={0.85}
            onPress={() => setActiveTab("scan")}
          >
            <LinearGradient
              colors={["#FF5722", "#FF7043"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scanCenterGradient}
            >
              <Ionicons name="scan-outline" size={24} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.tabLabel, { marginTop: 2 }]}>Scan AI</Text>
          </TouchableOpacity>

          {/* Tab 4: Community (Cộng Đồng) */}
          <TouchableOpacity
            style={styles.tabItem}
            activeOpacity={0.8}
            onPress={() => setActiveTab("community")}
          >
            <Ionicons
              name={activeTab === "community" ? "people" : "people-outline"}
              size={23}
              color={activeTab === "community" ? BrandColors.primary : "#94A3B8"}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === "community" && styles.tabLabelActive,
              ]}
            >
              Cộng Đồng
            </Text>
          </TouchableOpacity>

          {/* Tab 5: Profile (Cá Nhân) */}
          <TouchableOpacity
            style={styles.tabItem}
            activeOpacity={0.8}
            onPress={() => setActiveTab("profile")}
          >
            <Ionicons
              name={activeTab === "profile" ? "person" : "person-outline"}
              size={23}
              color={activeTab === "profile" ? BrandColors.primary : "#94A3B8"}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === "profile" && styles.tabLabelActive,
              ]}
            >
              Cá nhân
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Smart Search Filter Modal (SRS Module 22) */}
      <Modal visible={showFilterModal} transparent animationType="slide">
        <View style={styles.modalFilterBackdrop}>
          <View style={styles.filterModalCard}>
            <View style={styles.filterHeaderRow}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons name="filter" size={18} color="#FF5722" />
                <Text style={styles.filterModalTitle}>
                  Bộ lọc thông minh SmartCook
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                {(selectedCategory !== "all" ||
                  filterTime !== "all" ||
                  filterCalo !== "all" ||
                  filterFridgeOnly) && (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedCategory("all");
                      setFilterTime("all");
                      setFilterCalo("all");
                      setFilterFridgeOnly(false);
                      setCurrentPage(1);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={{ fontSize: 13, color: "#EA580C", fontWeight: "700" }}>
                      Đặt lại
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setShowFilterModal(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={22} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
            >
              {/* Category Filter (Chuyển vào bộ lọc theo yêu cầu của user) */}
              <Text style={styles.filterSectionLabel}>Danh mục món ăn</Text>
              <View style={styles.filterChipsRow}>
                {categories.map((cat) => {
                  const isCatActive = selectedCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={`modal-cat-${cat.id}`}
                      style={[
                        styles.filterChip,
                        isCatActive && styles.filterChipActive,
                      ]}
                      onPress={() => {
                        setSelectedCategory(cat.id);
                        setCurrentPage(1);
                      }}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={cat.iconName}
                        size={13}
                        color={isCatActive ? BrandColors.primary : cat.color}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.filterChipText,
                          isCatActive && styles.filterChipTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Time Filter */}
              <Text style={styles.filterSectionLabel}>Thời gian nấu</Text>
              <View style={styles.filterChipsRow}>
                {[
                  { id: "all", label: "Tất cả" },
                  { id: "15", label: "⚡ Dưới 15 phút" },
                  { id: "30", label: "⏱ Dưới 30 phút" },
                ].map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.filterChip,
                      filterTime === t.id && styles.filterChipActive,
                    ]}
                    onPress={() => setFilterTime(t.id)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filterTime === t.id && styles.filterChipTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Calories Filter */}
              <Text style={styles.filterSectionLabel}>Mức calo</Text>
              <View style={styles.filterChipsRow}>
                {[
                  { id: "all", label: "Tất cả" },
                  { id: "400", label: "🥗 Dưới 400 kcal" },
                  { id: "600", label: "🔥 Dưới 600 kcal" },
                ].map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.filterChip,
                      filterCalo === c.id && styles.filterChipActive,
                    ]}
                    onPress={() => setFilterCalo(c.id)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filterCalo === c.id && styles.filterChipTextActive,
                      ]}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Fridge Only Toggle */}
              <TouchableOpacity
                style={[
                  styles.fridgeToggleCard,
                  filterFridgeOnly && styles.fridgeToggleActive,
                ]}
                onPress={() => setFilterFridgeOnly(!filterFridgeOnly)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="fridge"
                  size={22}
                  color={filterFridgeOnly ? "#059669" : "#64748B"}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fridgeToggleTitle}>
                    Chỉ hiện món có sẵn trong tủ lạnh
                  </Text>
                  <Text style={styles.fridgeToggleSub}>
                    Độ khớp nguyên liệu &gt;= 80%
                  </Text>
                </View>
                <View
                  style={[
                    styles.toggleSwitch,
                    filterFridgeOnly && styles.toggleSwitchActive,
                  ]}
                >
                  <View
                    style={[
                      styles.toggleKnob,
                      filterFridgeOnly && styles.toggleKnobActive,
                    ]}
                  />
                </View>
              </TouchableOpacity>
            </ScrollView>

            {/* Apply Button */}
            <TouchableOpacity
              style={styles.applyFilterBtn}
              activeOpacity={0.85}
              onPress={() => setShowFilterModal(false)}
            >
              <LinearGradient
                colors={["#FF5722", "#FF7043"]}
                style={styles.applyFilterGradient}
              >
                <Text style={styles.applyFilterText}>
                  Áp dụng bộ lọc ({filteredDishes.length} món)
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Shopping Notepad / Sticky Note Modal (Tờ giấy ghi chú đi chợ) */}
      <ShoppingNoteModal
        visible={showShoppingNote}
        onClose={() => setShowShoppingNote(false)}
      />

      {/* Step-by-Step Recipe Creation Wizard Modal */}
      <CreateRecipeModal
        visible={showCreateRecipeModal}
        onClose={() => setShowCreateRecipeModal(false)}
        onRecipeCreated={handleRecipeCreated}
      />

      {/* Realtime Notification Center Modal */}
      <NotificationModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />

      {/* Daily Check-in & Chef Rewards Center Modal */}
      <GiftRewardsModal
        visible={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        onXpUpdated={(newXp, newLevel) => updateChefXP(newXp, newLevel)}
      />

      {/* Floating Draggable AI Assistant Bubble */}
      <DraggableAIAssistant />

      {/* Floating In-App Realtime Notification Banner */}
      <InAppNotificationBanner
        onPressNotification={() => setShowNotificationModal(true)}
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
  scrollContent: {
    paddingHorizontal: 20,
  },
  topBackdropGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 380,
  },

  /* 1. Header Styles */
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  userProfileLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarBorder: {
    position: "relative",
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
  },
  onlineBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  userInfoCol: {
    justifyContent: "center",
  },
  userNameText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.2,
  },
  premiumTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
    gap: 3,
  },
  premiumText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#E65100",
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  circularIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutBtn: {
    backgroundColor: "#FFF3E0",
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#FF4D6D",
  },
  notifBadgeCircle: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  cartBadgeCircle: {
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
  cartBadgeCircleText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },

  /* 2. Search & Filter */
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: "#1E293B",
    height: "100%",
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  /* 3. Categories Styles */
  categoriesSection: {
    marginBottom: 22,
    marginHorizontal: -20,
  },
  categoriesRow: {
    paddingHorizontal: 20,
    gap: 14,
    alignItems: "flex-start",
  },
  categoryItem: {
    alignItems: "center",
    width: 62,
  },
  categoryCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
    marginBottom: 6,
  },
  categoryCircleActive: {
    borderColor: BrandColors.primary,
    backgroundColor: "#FFF7ED",
    shadowColor: BrandColors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  categoryLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
  },
  categoryLabelActive: {
    color: BrandColors.primary,
    fontWeight: "800",
  },
  categoryActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: BrandColors.primary,
    marginTop: 2,
  },

  /* 4. Hero Highlight Card Carousel */
  heroSection: {
    marginBottom: 24,
  },
  heroHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  heroHeaderTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroSectionHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: 0.2,
  },
  slideCounterBadge: {
    backgroundColor: "#FFF3EB",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  slideCounterText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: BrandColors.primary,
  },
  heroNavButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroNavBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  heroCardOuter: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  heroCardContainer: {
    borderRadius: 24,
    overflow: "hidden",
  },
  heroCardGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 18,
    minHeight: 156,
    height: 156,
  },
  heroCardLeft: {
    flex: 1,
    paddingRight: 8,
    justifyContent: "space-between",
  },
  heroCardTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 21,
    marginBottom: 4,
  },
  heroCardHighlight: {
    fontWeight: "900",
  },
  heroCardSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 14,
    fontWeight: "500",
  },
  heroBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  heroActionButton: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#FF4D6D",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  heroActionGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  heroActionText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  heroBestOfferBadge: {
    fontSize: 11,
    fontWeight: "700",
  },
  heroTagBadgeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  heroTagBadgeHot: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FFEDD5",
  },
  heroTagBadgePopular: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  heroTagBadgeBtnText: {
    fontSize: 11,
    fontWeight: "800",
  },
  heroTagTextHot: {
    color: "#EA580C",
  },
  heroTagTextPopular: {
    color: "#D97706",
  },
  cardHotPopularBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 0.8,
  },
  badgeHot: {
    backgroundColor: "rgba(255, 247, 237, 0.95)",
    borderColor: "#FDBA74",
  },
  badgePopular: {
    backgroundColor: "rgba(254, 243, 199, 0.95)",
    borderColor: "#FCD34D",
  },
  cardHotPopularText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  badgeTextHot: {
    color: "#EA580C",
  },
  badgeTextPopular: {
    color: "#D97706",
  },
  heroImageWrapper: {
    width: 106,
    height: 106,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
  },
  heroDishImage: {
    width: "100%",
    height: "100%",
  },
  heroPaginationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
  },
  paginationDotActive: {
    width: 22,
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandColors.primary,
  },

  /* 4.5. Personalized Section */
  personalizedSection: {
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  personalizedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  personalizedSectionHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  personalizedSparkBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FFEDD5",
    gap: 3,
  },
  personalizedSparkText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#EA580C",
  },
  personalizedSectionSubheading: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  tweakPrefsBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  tweakPrefsText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EA580C",
  },
  personalizedCardsScroll: {
    gap: 10,
    paddingRight: 4,
  },
  personalizedDishCard: {
    width: 155,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  personalizedImageWrap: {
    width: "100%",
    height: 96,
    position: "relative",
  },
  personalizedDishImg: {
    width: "100%",
    height: "100%",
  },
  personalizedMatchPill: {
    position: "absolute",
    bottom: 5,
    left: 5,
    right: 5,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  personalizedMatchPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#15803D",
    flex: 1,
  },
  personalizedDishInfo: {
    padding: 8,
  },
  personalizedDishTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  personalizedDishSub: {
    fontSize: 10,
    color: "#64748B",
    marginBottom: 6,
  },
  personalizedDishBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  personalizedDishPrice: {
    fontSize: 11,
    fontWeight: "800",
    color: "#EA580C",
  },
  cookNowMiniPill: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cookNowMiniText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#EA580C",
  },

  /* 5. Popular Dishes Grid */
  popularSection: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.2,
  },
  seeAllLink: {
    fontSize: 12.5,
    color: "#94A3B8",
    fontWeight: "600",
  },
  popularGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  dishCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  favoriteButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  dishImageContainer: {
    position: "relative",
    width: "100%",
    height: 110,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 10,
    backgroundColor: "#F8FAFC",
  },
  dishImage: {
    width: "100%",
    height: "100%",
  },
  dishDetails: {
    paddingHorizontal: 4,
  },
  badgeRow: {
    marginBottom: 4,
  },
  dishBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: BrandColors.primaryDark,
  },
  dishTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 4,
  },
  dishFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
    gap: 4,
  },
  dishSubText: {
    fontSize: 10.5,
    color: "#64748B",
    fontWeight: "500",
    flex: 1,
    marginRight: 4,
  },
  /* Clean Modern Header (Pure text, no frame, no icon) */
  cleanTextHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  cleanTextHeaderLeft: {
    flex: 1,
  },
  cleanSectionHeading: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  cleanSectionSubheading: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 3,
  },
  cleanCountBtn: {
    paddingBottom: 2,
    paddingLeft: 6,
  },
  cleanCountText: {
    fontSize: 13,
    fontWeight: "700",
    color: BrandColors.primary,
  },
  cleanHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cleanCreateRecipeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  cleanCreateRecipeBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: BrandColors.primaryDark,
  },
  cleanFilterTextBtn: {
    paddingBottom: 2,
    paddingLeft: 12,
  },
  cleanFilterActiveText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: BrandColors.primary,
  },
  /* Empty state */
  emptyDishesState: {
    width: "100%",
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    marginVertical: 4,
  },
  emptyDishesTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#334155",
    marginTop: 10,
    marginBottom: 4,
  },
  emptyDishesSub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  resetFilterBtn: {
    backgroundColor: "#FFF3EB",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  resetFilterText: {
    fontSize: 12,
    fontWeight: "700",
    color: BrandColors.primary,
  },

  /* Compact Minimal Pagination Styles */
  compactPaginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    marginBottom: 4,
    paddingVertical: 2,
  },
  compactPageArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  compactPageArrowDisabled: {
    opacity: 0.35,
    backgroundColor: "#F8FAFC",
  },
  compactPageList: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  compactPageBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  compactPageBtnActive: {
    backgroundColor: BrandColors.primary,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  compactPageText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  compactPageTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  compactCounterText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    marginLeft: 4,
  },

  /* Quick 20-min Section Styles */
  quickSection: {
    marginTop: 20,
    marginBottom: 10,
  },
  quickTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#FFEDD5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  quickTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#EA580C",
  },
  quickRow: {
    gap: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  quickCard: {
    width: 170,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  quickCardImage: {
    width: "100%",
    height: 96,
  },
  quickCardBody: {
    padding: 10,
  },
  quickCardBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#EA580C",
    marginBottom: 3,
  },
  quickCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 6,
  },
  quickCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quickTimeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  quickTimeText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  quickDetailChip: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  quickDetailText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#EA580C",
  },

  /* 6. Docked Bottom Navigation Bar */
  bottomBarWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    alignItems: "center",
  },
  bottomNavContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "92%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  tabItemCenter: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -16,
    flex: 1,
  },
  scanCenterGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  tabLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
    marginTop: 3,
  },
  tabLabelActive: {
    color: BrandColors.primary,
    fontWeight: "800",
  },

  /* Smart Filter Modal Styles */
  modalFilterBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  filterModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 24,
    gap: 12,
  },
  filterHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  filterModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  filterSectionLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#475569",
    marginTop: 4,
  },
  filterChipsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  filterChip: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: "#FFF3E0",
    borderColor: BrandColors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  filterChipTextActive: {
    color: BrandColors.primary,
    fontWeight: "700",
  },
  fridgeToggleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 4,
  },
  fridgeToggleActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  fridgeToggleTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  fridgeToggleSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#CBD5E1",
    padding: 2,
    justifyContent: "center",
  },
  toggleSwitchActive: {
    backgroundColor: "#10B981",
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  toggleKnobActive: {
    alignSelf: "flex-end",
  },
  applyFilterBtn: {
    borderRadius: 18,
    overflow: "hidden",
    marginTop: 8,
  },
  applyFilterGradient: {
    paddingVertical: 13,
    alignItems: "center",
  },
  applyFilterText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
