import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { BrandColors } from "@/constants/brandColors";
import { RecipeService } from "@/services/recipeService";
import { Recipe } from "@/types";

interface FavoriteRecipesModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectRecipe: (recipeId: string) => void;
}

export default function FavoriteRecipesModal({
  visible,
  onClose,
  onSelectRecipe,
}: FavoriteRecipesModalProps) {
  const insets = useSafeAreaInsets();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const loadFavorites = async () => {
    setIsLoading(true);
    try {
      const items = await RecipeService.getFavoriteRecipes();
      setRecipes(items);
    } catch (e) {
      console.warn("Lỗi tải công thức yêu thích:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadFavorites();
      setSearchQuery("");
    }
  }, [visible]);

  const handleRemoveFavorite = async (recipeId: string) => {
    try {
      await RecipeService.toggleFavorite(recipeId);
      setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    } catch (e) {
      console.warn("Lỗi bỏ yêu thích:", e);
    }
  };

  const filteredRecipes = recipes.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      r.title.toLowerCase().includes(q) ||
      (r.sub && r.sub.toLowerCase().includes(q)) ||
      (r.category && r.category.toLowerCase().includes(q))
    );
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconCircle}>
              <Ionicons name="heart" size={20} color="#242424" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Công thức đã lưu</Text>
              <Text style={styles.headerSubtitle}>
                {recipes.length} món ăn trong bộ sưu tập
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={22} color={BrandColors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={BrandColors.textPlaceholder} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm trong danh sách đã lưu..."
            placeholderTextColor={BrandColors.textPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color={BrandColors.textPlaceholder} />
            </TouchableOpacity>
          )}
        </View>

        {/* Content List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BrandColors.primary} />
            <Text style={styles.loadingText}>Đang tải bộ sưu tập...</Text>
          </View>
        ) : filteredRecipes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-dislike-outline" size={54} color="#C7C7C7" />
            <Text style={styles.emptyTitle}>
              {searchQuery ? "Không tìm thấy món ăn phù hợp" : "Chưa có công thức đã lưu"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? "Thử tìm kiếm với từ khóa khác xem nhé."
                : "Khám phá các món ngon trên trang chủ và bấm biểu tượng trái tim để lưu lại nấu sau!"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredRecipes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 20 },
            ]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.recipeCard}
                activeOpacity={0.8}
                onPress={() => {
                  onClose();
                  onSelectRecipe(item.id);
                }}
              >
                <ExpoImage
                  source={
                    typeof item.image === "string" ? { uri: item.image } : item.image
                  }
                  style={styles.recipeImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={150}
                />
                <View style={styles.recipeInfo}>
                  <Text style={styles.recipeTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.recipeSub} numberOfLines={1}>
                    {item.sub || item.description || "Công thức thơm ngon"}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={styles.metaBadge}>
                      <Ionicons name="time-outline" size={12} color={BrandColors.textMuted} />
                      <Text style={styles.metaText}>{item.minutes}p</Text>
                    </View>
                    <View style={styles.metaBadge}>
                      <Ionicons name="flame-outline" size={12} color="#363636" />
                      <Text style={styles.metaText}>{item.calories} kcal</Text>
                    </View>
                    <View style={styles.metaBadge}>
                      <Ionicons name="star" size={11} color="#404040" />
                      <Text style={styles.metaText}>{item.rating.toFixed(1)}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemoveFavorite(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="heart" size={22} color="#242424" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: BrandColors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.borderLight,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F4F4F4",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
  headerSubtitle: {
    fontSize: 12,
    color: BrandColors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: BrandColors.inputBg,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.surfaceCard,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: BrandColors.textDark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: BrandColors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: BrandColors.textBody,
    marginTop: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: BrandColors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  recipeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.surfaceCard,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  recipeImage: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: BrandColors.inputBg,
  },
  recipeInfo: {
    flex: 1,
  },
  recipeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
  recipeSub: {
    fontSize: 12,
    color: BrandColors.textMuted,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: BrandColors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metaText: {
    fontSize: 11,
    fontWeight: "600",
    color: BrandColors.textBody,
  },
  removeBtn: {
    padding: 8,
  },
});
