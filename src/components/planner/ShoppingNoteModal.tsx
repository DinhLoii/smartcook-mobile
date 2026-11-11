import { BrandColors } from "@/constants/brandColors";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CartItem, CartService } from "@/services/cartService";

interface ShoppingNoteModalProps {
  visible: boolean;
  onClose: () => void;
  onFindStore?: () => void;
}

export default function ShoppingNoteModal({
  visible,
  onClose,
}: ShoppingNoteModalProps) {
  const [items, setItems] = useState<CartItem[]>(CartService.getItems());

  useEffect(() => {
    if (visible) {
      CartService.fetchServerItems().catch(() => {});
    }
    const unsubscribe = CartService.subscribe(() => {
      setItems(CartService.getItems());
    });
    return () => {
      unsubscribe();
    };
  }, [visible]);

  const totalCost = items.reduce((sum, item) => sum + (item.price || 0), 0);
  const boughtCount = items.filter((i) => i.bought).length;
  const unboughtCount = items.length - boughtCount;

  const handleToggle = (id: string) => {
    CartService.toggleBought(id);
  };

  const handleDelete = (id: string, name?: string) => {
    setItems((prev) =>
      prev.filter(
        (i) =>
          i.id !== id &&
          (!name || i.name.toLowerCase().trim() !== name.toLowerCase().trim())
      )
    );
    CartService.removeItem(id, name);
  };

  const handleConfirmDone = () => {
    CartService.markAllBought();
    Alert.alert(
      "Đã xác nhận mua xong! 🎉",
      "Tất cả nguyên liệu đã được đánh dấu là mua xong. Băng rôn nhắc nhở sẽ được ẩn."
    );
    onClose();
  };

  const handleClearAll = () => {
    Alert.alert(
      "Xác nhận",
      "Bạn muốn xóa tất cả nguyên liệu trong giỏ hàng đi chợ?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa hết",
          style: "destructive",
          onPress: () => {
            setItems([]);
            CartService.clearAll();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Modal Card bo tròn nhẹ (borderRadius: 12), rộng dài hơn */}
        <View style={styles.noteCard}>
          {/* Header đơn giản */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Ionicons name="cart-outline" size={20} color={BrandColors.textDark} />
              <Text style={styles.headerTitle}>Giỏ hàng đi chợ</Text>
              <View style={styles.countPill}>
                <Text style={styles.countText}>{items.length} món</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color={BrandColors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Danh sách: ô tick, nguyên liệu, giá ước tính, icon xóa */}
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {items.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="basket-outline" size={36} color="#C7C7C7" />
                <Text style={styles.emptyTitle}>Giỏ hàng đi chợ trống</Text>
                <Text style={styles.emptySub}>
                  Hãy bấm &quot;+ Thêm vào giỏ&quot; ở từng nguyên liệu để ghi nhớ món cần mua nhé!
                </Text>
              </View>
            ) : (
              items.map((item) => {
                const isBought = item.bought;
                return (
                  <View key={item.id} style={styles.itemRow}>
                    {/* Ô tick nhỏ gọn */}
                    <TouchableOpacity
                      style={[styles.checkbox, isBought && styles.checkboxChecked]}
                      activeOpacity={0.7}
                      onPress={() => handleToggle(item.id)}
                    >
                      {isBought && (
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>

                    {/* Tên nguyên liệu + khối lượng */}
                    <TouchableOpacity
                      style={styles.nameCol}
                      activeOpacity={0.7}
                      onPress={() => handleToggle(item.id)}
                    >
                      <Text
                        style={[styles.itemName, isBought && styles.itemNameChecked]}
                        numberOfLines={1}
                      >
                        {item.name}
                        {item.amount ? ` • ${item.amount}` : ""}
                      </Text>
                    </TouchableOpacity>

                    {/* Giá ước tính */}
                    <Text style={[styles.itemPrice, isBought && styles.itemPriceChecked]}>
                      ~{item.price.toLocaleString("vi-VN")}đ
                    </Text>

                    {/* Icon xóa to rõ ràng, dễ bấm */}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      activeOpacity={0.6}
                      onPress={() => handleDelete(item.id, item.name)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#242424" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Footer đơn giản */}
          {items.length > 0 && (
            <View style={styles.footerSection}>
              {/* Tổng tiền & tiến độ */}
              <View style={styles.footerSummaryRow}>
                <View>
                  <Text style={styles.footerLabel}>Tổng ước tính:</Text>
                  <Text style={styles.footerPrice}>
                    ~{totalCost.toLocaleString("vi-VN")}đ
                  </Text>
                </View>

                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>
                    {unboughtCount > 0
                      ? `Còn ${unboughtCount} món cần mua`
                      : "Đã mua đủ hết"}
                  </Text>
                </View>
              </View>

              {/* Action Buttons: Xác nhận đã mua xong & Xóa tất cả */}
              <View style={styles.actionButtonsRow}>
                {unboughtCount > 0 && (
                  <TouchableOpacity
                    style={styles.confirmDoneBtn}
                    activeOpacity={0.82}
                    onPress={handleConfirmDone}
                  >
                    <Ionicons name="checkmark-done" size={15} color="#FFFFFF" />
                    <Text style={styles.confirmDoneText}>Xác nhận đã mua xong</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.clearAllBtn}
                  activeOpacity={0.7}
                  onPress={handleClearAll}
                >
                  <Text style={styles.clearAllText}>Xóa tất cả</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(27, 27, 27, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 20,
  },
  noteCard: {
    width: "98%",
    maxWidth: 520,
    height: "80%",
    maxHeight: "88%",
    backgroundColor: BrandColors.surfaceCard,
    borderRadius: 12, // bo tròn khung nhẹ
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    display: "flex",
    flexDirection: "column",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: BrandColors.textDark,
  },
  countPill: {
    backgroundColor: BrandColors.inputBg,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6, // bo tròn nhẹ
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
    color: BrandColors.textBody,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8, // bo tròn nhẹ
    backgroundColor: BrandColors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  divider: {
    height: 1,
    backgroundColor: BrandColors.inputBg,
    marginBottom: 6,
  },
  scrollList: {
    flex: 1, // rộng dài hơn, mở rộng hết chiều dài khung
  },
  scrollContent: {
    paddingVertical: 2,
  },
  emptyBox: {
    paddingVertical: 36,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: BrandColors.textBody,
  },
  emptySub: {
    fontSize: 12,
    color: BrandColors.textPlaceholder,
    textAlign: "center",
    paddingHorizontal: 16,
    lineHeight: 17,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F7F7F7",
    gap: 10,
  },
  checkbox: {
    width: 19,
    height: 19,
    borderRadius: 4, // bo tròn nhẹ
    borderWidth: 1.5,
    borderColor: "#C7C7C7",
    backgroundColor: BrandColors.surfaceCard,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#353535",
    borderColor: "#353535",
  },
  nameCol: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "600",
    color: BrandColors.textDark,
  },
  itemNameChecked: {
    textDecorationLine: "line-through",
    color: BrandColors.textPlaceholder,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: "600",
    color: BrandColors.textDark,
  },
  itemPriceChecked: {
    textDecorationLine: "line-through",
    color: BrandColors.textPlaceholder,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#EEEEEE",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  footerSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BrandColors.borderLight,
    gap: 10,
  },
  footerSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLabel: {
    fontSize: 11.5,
    color: BrandColors.textMuted,
    fontWeight: "600",
  },
  footerPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: BrandColors.textDark,
  },
  statusPill: {
    backgroundColor: BrandColors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  confirmDoneBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#353535",
    paddingVertical: 9,
    borderRadius: 8, // bo tròn nhẹ
    gap: 6,
  },
  confirmDoneText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  clearAllBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  clearAllText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: BrandColors.textPlaceholder,
  },
});
