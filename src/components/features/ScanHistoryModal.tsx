import { BrandColors } from "@/constants/brandColors";
import {
  ScanHistoryItem,
  ScanHistoryService,
} from "@/services/scanHistoryService";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ScanHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectScan?: (item: ScanHistoryItem) => void;
}

export default function ScanHistoryModal({
  visible,
  onClose,
  onSelectScan,
}: ScanHistoryModalProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [history, setHistory] = useState<ScanHistoryItem[]>(() =>
    ScanHistoryService.getHistory()
  );
  const [activeFilter, setActiveFilter] = useState<"all" | "today" | "week">(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const unsub = ScanHistoryService.subscribe((list) => {
      setHistory(list);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (visible) {
      ScanHistoryService.fetchBackendHistory();
    }
  }, [visible]);

  const handleClearAll = () => {
    Alert.alert(
      "Xóa lịch sử phân tích",
      "Bạn có chắc chắn muốn xóa toàn bộ lịch sử các ảnh đã quét và phân tích không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa tất cả",
          style: "destructive",
          onPress: () => ScanHistoryService.clearHistory(),
        },
      ]
    );
  };

  const handleDeleteItem = (id: string, title: string) => {
    Alert.alert("Xóa phiên quét", `Bạn muốn xóa lịch sử "${title}"?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => ScanHistoryService.deleteHistoryItem(id),
      },
    ]);
  };

  const handleViewRecipe = (recipeId: string) => {
    onClose();
    router.push({
      pathname: "/recipe-detail",
      params: { id: recipeId },
    });
  };

  const handleApplyScan = (item: ScanHistoryItem) => {
    if (onSelectScan) {
      onSelectScan(item);
    }
    onClose();
  };

  // Filter and search
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      // Time filter
      if (activeFilter === "today" && !item.scannedAt.includes("Hôm nay")) {
        return false;
      }
      if (
        activeFilter === "week" &&
        !(
          item.scannedAt.includes("Hôm nay") ||
          item.scannedAt.includes("Hôm qua") ||
          item.scannedAt.includes("ngày trước") ||
          item.scannedAt.includes("Vừa xong")
        )
      ) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchRecipe = item.suggestedRecipe.title
          .toLowerCase()
          .includes(query);
        const matchIngredients = item.ingredients.some((ing) =>
          ing.name.toLowerCase().includes(query)
        );
        return matchTitle || matchRecipe || matchIngredients;
      }

      return true;
    });
  }, [history, activeFilter, searchQuery]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={[
                styles.modalContainer,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              {/* Sheet Drag Handle */}
              <View style={styles.sheetHandle} />

              {/* Header */}
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Ionicons name="time" size={20} color="#FF5722" />
                    <Text style={styles.headerTitle}>Lịch Sử Phân Tích Ảnh</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>
                        {history.length} lần
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.headerSub}>
                    Xem lại kết quả nhận diện nguyên liệu & món ăn AI đã sáng tạo
                  </Text>
                </View>

                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  {history.length > 0 && (
                    <TouchableOpacity
                      onPress={handleClearAll}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.clearBtn}
                    >
                      <Text style={styles.clearBtnText}>Xóa tất cả</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={onClose}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.closeBtn}
                  >
                    <Ionicons name="close" size={22} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Search input */}
              <View style={styles.searchBarContainer}>
                <Ionicons name="search-outline" size={17} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm theo nguyên liệu (ức gà, cá hồi...) hoặc món ăn..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery("")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={17} color="#94A3B8" />
                  </TouchableOpacity>
                )}
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
                keyboardShouldPersistTaps="handled"
              >
                {filteredHistory.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="scan-outline" size={48} color="#CBD5E1" />
                    <Text style={styles.emptyTitle}>
                      {searchQuery
                        ? "Không tìm thấy kết quả phù hợp"
                        : "Chưa có lịch sử phân tích ảnh nào"}
                    </Text>
                    <Text style={styles.emptyDesc}>
                      {searchQuery
                        ? "Thử tìm với tên nguyên liệu khác như gà, bò, cá, rau..."
                        : "Khi bạn chụp hoặc tải ảnh lên để AI phân tích nguyên liệu, phiên quét sẽ tự động lưu lại ở đây."}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.itemsWrap}>
                    {filteredHistory.map((item) => (
                      <View key={item.id} style={styles.scanCard}>
                        {/* Top Card Info: Title + Accuracy + Delete */}
                        <View style={styles.cardHeaderRow}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.cardTitle} numberOfLines={1}>
                              {item.title}
                            </Text>
                            <View style={styles.timeTagRow}>
                              <Ionicons
                                name="time-outline"
                                size={12}
                                color="#EA580C"
                              />
                              <Text style={styles.timeTagText}>
                                {item.scannedAt}
                              </Text>
                            </View>
                          </View>

                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <View style={styles.accuracyBadge}>
                              <Ionicons
                                name="sparkles"
                                size={11}
                                color="#059669"
                              />
                              <Text style={styles.accuracyText}>
                                {item.accuracy}% chính xác
                              </Text>
                            </View>

                            <TouchableOpacity
                              onPress={() =>
                                handleDeleteItem(item.id, item.title)
                              }
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={styles.deleteIconBtn}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={17}
                                color="#94A3B8"
                              />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Mid Section: Scanned Photo Thumbnail + Ingredients */}
                        <View style={styles.cardBodyRow}>
                          <View style={styles.thumbnailWrapper}>
                            <Image
                              source={
                                typeof item.image === "string"
                                  ? { uri: item.image }
                                  : item.image
                              }
                              style={styles.scanThumbnail}
                              resizeMode="cover"
                            />
                            <View style={styles.thumbOverlayTag}>
                              <Text style={styles.thumbCountText}>
                                {item.ingredients.length} món
                              </Text>
                            </View>
                          </View>

                          <View style={styles.ingredientsCol}>
                            <Text style={styles.ingredientsLabel}>
                              Nguyên liệu phát hiện:
                            </Text>
                            <View style={styles.ingChipsWrap}>
                              {item.ingredients.map((ing, idx) => (
                                <View key={idx} style={styles.ingChipItem}>
                                  <MaterialCommunityIcons
                                    name={ing.icon as any}
                                    size={13}
                                    color="#E65100"
                                  />
                                  <Text
                                    style={styles.ingChipName}
                                    numberOfLines={1}
                                  >
                                    {ing.name}
                                  </Text>
                                  <Text style={styles.ingChipConf}>
                                    {ing.confidence}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        </View>

                        {/* Bottom AI Recipe Recommendation Box */}
                        <View style={styles.suggestedRecipeBox}>
                          <View style={styles.sugHeader}>
                            <View style={styles.sugBadge}>
                              <Ionicons
                                name="hardware-chip-outline"
                                size={12}
                                color="#059669"
                              />
                              <Text style={styles.sugBadgeText}>
                                Công thức AI gợi ý
                              </Text>
                            </View>
                            <Text style={styles.sugCalo}>
                              {item.suggestedRecipe.calories} kcal •{" "}
                              {item.suggestedRecipe.durationMinutes} phút
                            </Text>
                          </View>

                          <Text style={styles.sugTitle} numberOfLines={1}>
                            {item.suggestedRecipe.title}
                          </Text>
                          <Text style={styles.sugDesc} numberOfLines={2}>
                            {item.suggestedRecipe.desc}
                          </Text>

                          {/* Action Buttons */}
                          <View style={styles.actionsRow}>
                            {onSelectScan && (
                              <TouchableOpacity
                                style={styles.restoreBtn}
                                activeOpacity={0.8}
                                onPress={() => handleApplyScan(item)}
                              >
                                <Ionicons
                                  name="refresh-outline"
                                  size={15}
                                  color="#FF5722"
                                />
                                <Text style={styles.restoreBtnText}>
                                  Nạp lại quét này
                                </Text>
                              </TouchableOpacity>
                            )}

                            <TouchableOpacity
                              style={styles.viewRecipeBtn}
                              activeOpacity={0.85}
                              onPress={() =>
                                handleViewRecipe(item.suggestedRecipe.id)
                              }
                            >
                              <LinearGradient
                                colors={["#FF5722", "#FF7043"]}
                                style={styles.viewRecipeGradient}
                              >
                                <Text style={styles.viewRecipeText}>
                                  Xem công thức →
                                </Text>
                              </LinearGradient>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: "88%",
  },
  sheetHandle: {
    width: 38,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EA580C",
  },
  headerSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearBtnText: {
    fontSize: 12.5,
    color: "#EF4444",
    fontWeight: "600",
  },
  closeBtn: {
    padding: 3,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: "#1E293B",
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  filterPill: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterPillActive: {
    backgroundColor: "#FF5722",
    borderColor: "#FF5722",
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  filterTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scrollList: {
    maxHeight: 520,
  },
  itemsWrap: {
    gap: 14,
    paddingBottom: 16,
  },
  scanCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 3,
  },
  timeTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeTagText: {
    fontSize: 11,
    color: "#EA580C",
    fontWeight: "600",
  },
  accuracyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: "#A7F3D0",
  },
  accuracyText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#059669",
  },
  deleteIconBtn: {
    padding: 2,
  },
  cardBodyRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  thumbnailWrapper: {
    position: "relative",
    width: 84,
    height: 84,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  scanThumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbOverlayTag: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  thumbCountText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  ingredientsCol: {
    flex: 1,
  },
  ingredientsLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },
  ingChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  ingChipItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  ingChipName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1E293B",
  },
  ingChipConf: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  suggestedRecipeBox: {
    backgroundColor: "#FFFBF7",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  sugHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  sugBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sugBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
  },
  sugCalo: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  sugTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  sugDesc: {
    fontSize: 11.5,
    color: "#64748B",
    lineHeight: 16,
    marginBottom: 10,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  restoreBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#FF5722",
    borderRadius: 10,
    paddingVertical: 8,
  },
  restoreBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#FF5722",
  },
  viewRecipeBtn: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  viewRecipeGradient: {
    paddingVertical: 8.5,
    alignItems: "center",
  },
  viewRecipeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 45,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#475569",
    marginTop: 10,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 18,
  },
});
