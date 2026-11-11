import { BrandColors } from "@/constants/brandColors";
import {
  CookingHistoryItem,
  CookingHistoryService,
} from "@/services/cookingHistoryService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CookingHistoryModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CookingHistoryModal({
  visible,
  onClose,
}: CookingHistoryModalProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<CookingHistoryItem[]>(() =>
    CookingHistoryService.getHistory()
  );
  const [activeFilter, setActiveFilter] = useState<"all" | "today" | "week">(
    "all"
  );

  useEffect(() => {
    const unsub = CookingHistoryService.subscribe((list) => {
      setHistory(list);
    });
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      CookingHistoryService.fetchHistory().catch(() => {});
    }
  }, [visible]);

  const handleDeleteItem = (item: CookingHistoryItem) => {
    Alert.alert(
      "Xóa món",
      `Bạn có chắc muốn xóa "${item.recipeName}" khỏi lịch sử không?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            CookingHistoryService.deleteHistoryItem(item._id || item.id);
          },
        },
      ]
    );
  };

  const handleClear = () => {
    Alert.alert(
      "Xóa lịch sử",
      "Bạn có chắc muốn xóa toàn bộ lịch sử các món đã nấu không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa tất cả",
          style: "destructive",
          onPress: () => CookingHistoryService.clearHistory(),
        },
      ]
    );
  };

  const handleCookAgain = (item: CookingHistoryItem) => {
    onClose();
    router.push({
      pathname: "/recipe-detail",
      params: { id: item.recipeId },
    });
  };

  const filteredHistory = history.filter((item) => {
    if (activeFilter === "today") return item.cookedAt.includes("Hôm nay");
    if (activeFilter === "week")
      return (
        item.cookedAt.includes("Hôm nay") ||
        item.cookedAt.includes("Hôm qua") ||
        item.cookedAt.includes("Th09")
      );
    return true;
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.modalContainer,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              {/* Sheet Handle */}
              <View style={styles.sheetHandle} />

              {/* Header */}
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.headerTitle}>Lịch Sử Đã Nấu</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>
                        {history.length} món
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.headerSub}>
                    Ghi nhận các món bạn đã thực hiện và nguyên liệu đã dùng
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {history.length > 0 && (
                    <TouchableOpacity
                      onPress={handleClear}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.clearBtn}
                    >
                      <Text style={styles.clearBtnText}>Xóa</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={onClose}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.closeBtn}
                  >
                    <Ionicons name="close" size={20} color={BrandColors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Filter Pills */}
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={[
                    styles.filterPill,
                    activeFilter === "all" && styles.filterPillActive,
                  ]}
                  onPress={() => setActiveFilter("all")}
                >
                  <Text
                    style={[
                      styles.filterText,
                      activeFilter === "all" && styles.filterTextActive,
                    ]}
                  >
                    Tất cả ({history.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterPill,
                    activeFilter === "today" && styles.filterPillActive,
                  ]}
                  onPress={() => setActiveFilter("today")}
                >
                  <Text
                    style={[
                      styles.filterText,
                      activeFilter === "today" && styles.filterTextActive,
                    ]}
                  >
                    Hôm nay
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterPill,
                    activeFilter === "week" && styles.filterPillActive,
                  ]}
                  onPress={() => setActiveFilter("week")}
                >
                  <Text
                    style={[
                      styles.filterText,
                      activeFilter === "week" && styles.filterTextActive,
                    ]}
                  >
                    Tuần này
                  </Text>
                </TouchableOpacity>
              </View>

              {/* History List */}
              <ScrollView
                style={styles.scrollList}
                showsVerticalScrollIndicator={false}
              >
                {filteredHistory.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons
                      name="restaurant-outline"
                      size={44}
                      color="#C7C7C7"
                    />
                    <Text style={styles.emptyTitle}>Chưa có món nào đã nấu</Text>
                    <Text style={styles.emptyDesc}>
                      Khi bạn hoàn thành bước nấu ăn, món ăn sẽ tự động lưu vào
                      lịch sử tại đây.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.itemsWrap}>
                    {filteredHistory.map((item) => (
                      <View key={item.id} style={styles.historyCard}>
                        {/* Dish Image */}
                        <Image
                          source={{ uri: item.image }}
                          style={styles.dishImg}
                          resizeMode="cover"
                        />

                        {/* Middle Info */}
                        <View style={styles.dishInfo}>
                          <Text style={styles.dishName} numberOfLines={1}>
                            {item.recipeName}
                          </Text>

                          <View style={styles.metaRow}>
                            <Text style={styles.metaTime}>{item.cookedAt}</Text>
                            <Text style={styles.metaDot}>•</Text>
                            <Text style={styles.metaDuration}>
                              {item.durationMinutes}p
                            </Text>
                            <Text style={styles.metaDot}>•</Text>
                            <Text style={styles.metaServings}>
                              {item.servings} người
                            </Text>
                          </View>

                          {/* Consumed Ingredients pills */}
                          <View style={styles.ingWrap}>
                            <Text style={styles.ingPrefix}>Đã dùng: </Text>
                            {item.usedIngredients.slice(0, 3).map((ing, idx) => (
                              <View key={idx} style={styles.ingChip}>
                                <Text style={styles.ingChipText}>{ing}</Text>
                              </View>
                            ))}
                            {item.usedIngredients.length > 3 && (
                              <Text style={styles.ingMoreText}>
                                +{item.usedIngredients.length - 3}
                              </Text>
                            )}
                          </View>
                        </View>

                        {/* Right: Actions */}
                        <View style={{ alignItems: "center", gap: 6 }}>
                          <TouchableOpacity
                            style={styles.cookAgainBtn}
                            onPress={() => handleCookAgain(item)}
                            activeOpacity={0.75}
                          >
                            <Text style={styles.cookAgainText}>Nấu lại</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleDeleteItem(item)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={16} color={BrandColors.textPlaceholder} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(27, 27, 27, 0.45)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: BrandColors.surfaceCard,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: "82%",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#E5E5E5",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: BrandColors.textDark,
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: BrandColors.surfaceMuted,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
  headerSub: {
    fontSize: 12,
    color: BrandColors.textMuted,
    marginTop: 2,
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearBtnText: {
    fontSize: 12.5,
    color: BrandColors.textPlaceholder,
    fontWeight: "500",
  },
  closeBtn: {
    padding: 3,
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  filterPill: {
    backgroundColor: BrandColors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  filterPillActive: {
    backgroundColor: "#171717",
    borderColor: "#171717",
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: BrandColors.textBody,
  },
  filterTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scrollList: {
    maxHeight: 460,
  },
  itemsWrap: {
    gap: 8,
    paddingBottom: 10,
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.background,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  dishImg: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: "#E5E5E5",
  },
  dishInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
  },
  dishName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: BrandColors.textDark,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  metaTime: {
    fontSize: 11,
    color: BrandColors.textDark,
    fontWeight: "600",
  },
  metaDot: {
    fontSize: 10,
    color: "#C7C7C7",
  },
  metaDuration: {
    fontSize: 11,
    color: BrandColors.textMuted,
  },
  metaServings: {
    fontSize: 11,
    color: BrandColors.textMuted,
  },
  ingWrap: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  ingPrefix: {
    fontSize: 10.5,
    color: BrandColors.textPlaceholder,
  },
  ingChip: {
    backgroundColor: BrandColors.surfaceCard,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 0.8,
    borderColor: BrandColors.borderLight,
  },
  ingChipText: {
    fontSize: 10,
    color: BrandColors.textBody,
    fontWeight: "500",
  },
  ingMoreText: {
    fontSize: 10,
    color: BrandColors.textPlaceholder,
    fontWeight: "600",
  },
  cookAgainBtn: {
    backgroundColor: BrandColors.surfaceCard,
    borderWidth: 1.2,
    borderColor: "#171717",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  cookAgainText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: BrandColors.textBody,
    marginTop: 10,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: BrandColors.textPlaceholder,
    textAlign: "center",
    lineHeight: 18,
  },
});
