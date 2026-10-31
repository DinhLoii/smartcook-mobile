import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Clipboard,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BrandColors } from "@/constants/brandColors";
import { RewardCatalogItem, RewardStatus } from "@/types";
import { rewardService } from "@/services/rewardService";
import { triggerHaptic } from "@/utils/haptics";
import { getBrandLogoSource } from "@/utils/brandLogos";

interface GiftRewardsModalProps {
  visible: boolean;
  onClose: () => void;
  onXpUpdated?: (newXp: number, newLevel: string) => void;
}

export const GiftRewardsModal: React.FC<GiftRewardsModalProps> = ({
  visible,
  onClose,
  onXpUpdated,
}) => {
  const [statusData, setStatusData] = useState<RewardStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"redeem" | "my_rewards">("redeem");

  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    rewardService
      .getRewardStatus()
      .then((data) => {
        if (isMounted) {
          setStatusData(data);
          setIsLoading(false);
        }
      })
      .catch((e) => {
        console.error("Lỗi tải thông tin quà thưởng:", e);
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [visible]);

  // Thực hiện điểm danh nhận XP hôm nay
  const handleCheckIn = async () => {
    if (statusData?.hasCheckedInToday || isClaiming) return;
    setIsClaiming(true);
    try {
      const result = await rewardService.checkInToday();
      triggerHaptic("success");

      setStatusData((prev) =>
        prev
          ? {
              ...prev,
              chefExp: result.chefExp,
              level: result.level,
              streakDays: result.streakDays,
              hasCheckedInToday: true,
            }
          : null
      );

      if (onXpUpdated) {
        onXpUpdated(result.chefExp, result.level);
      }

      Alert.alert(
        "🎉 Chúc Mừng!",
        `Bạn đã điểm danh thành công ngày thứ ${result.streakDays} và nhận được +${result.xpGained} XP!\nTổng kinh nghiệm: ${result.chefExp} XP (${result.level}).`
      );
    } catch (err: any) {
      Alert.alert("Thông báo", err.response?.data?.message || err.message || "Điểm danh thất bại");
    } finally {
      setIsClaiming(false);
    }
  };

  // Đổi quà bằng điểm XP
  const handleRedeem = (item: RewardCatalogItem) => {
    if (!statusData) return;

    if (statusData.chefExp < item.xpCost) {
      Alert.alert(
        "Chưa đủ điểm Chef XP",
        `Bạn cần ${item.xpCost} XP để đổi phần quà này (Hiện có: ${statusData.chefExp} XP). Hãy tiếp tục nấu ăn và tích lũy XP nhé!`
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
            setRedeemingId(item.id);
            try {
              const res = await rewardService.redeemReward(item.id);
              triggerHaptic("success");

              setStatusData((prev) =>
                prev
                  ? {
                      ...prev,
                      chefExp: res.remainingExp,
                      claimedRewards: [res.reward, ...prev.claimedRewards],
                    }
                  : null
              );

              if (onXpUpdated && statusData) {
                onXpUpdated(res.remainingExp, statusData.level);
              }

              Alert.alert(
                "🎁 Đổi Quà Thành Công!",
                `Mã ưu đãi của bạn: [${res.reward.code}]. Bạn có thể xem lại mã trong tab 'Quà của tôi'.`,
                [
                  {
                    text: "Xem mã quà",
                    onPress: () => setActiveTab("my_rewards"),
                  },
                  { text: "Đóng" },
                ]
              );
            } catch (err: any) {
              Alert.alert("Lỗi đổi quà", err.response?.data?.message || "Không thể đổi phần quà này.");
            } finally {
              setRedeemingId(null);
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        {/* 1. Header Row */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerEmoji}>🎁</Text>
            <View>
              <Text style={styles.headerTitle}>Hộp Quà & Đổi Thưởng Chef</Text>
              <Text style={styles.headerSub}>Điểm danh nhận quà & đổi voucher siêu thị</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.closeBtn} activeOpacity={0.7} onPress={onClose}>
            <Ionicons name="close" size={22} color="#475569" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={BrandColors.primary} />
            <Text style={styles.loadingText}>Đang tải quà tặng & điểm danh...</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* 2. User XP Banner Card */}
            <View style={styles.xpCard}>
              <View style={styles.xpCardLeft}>
                <Text style={styles.xpCardLevel}>{statusData?.level || "Tập sự"}</Text>
                <View style={styles.xpNumberRow}>
                  <Ionicons name="sparkles" size={20} color="#FBBF24" />
                  <Text style={styles.xpNumberText}>{statusData?.chefExp ?? 0}</Text>
                  <Text style={styles.xpUnitText}>XP Khả dụng</Text>
                </View>
              </View>

              <View style={styles.streakBadgeBox}>
                <Ionicons name="flame" size={20} color="#EA580C" />
                <Text style={styles.streakBadgeNum}>{statusData?.streakDays ?? 0}</Text>
                <Text style={styles.streakBadgeText}>ngày liên tiếp</Text>
              </View>
            </View>

            {/* 3. Daily Check-in Streak Tracker (7 Days) */}
            <View style={styles.streakCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>📅 Chuỗi Điểm Danh 7 Ngày</Text>
                <Text style={styles.sectionSubtitle}>
                  {statusData?.hasCheckedInToday
                    ? "Đã điểm danh hôm nay ✓"
                    : "Chưa điểm danh hôm nay"}
                </Text>
              </View>

              <View style={styles.daysRow}>
                {(statusData?.streakRewards || [15, 20, 25, 30, 40, 50, 100]).map(
                  (xpReward, index) => {
                    const dayNum = index + 1;
                    const streak = statusData?.streakDays ?? 0;
                    const isPassed =
                      statusData?.hasCheckedInToday
                        ? dayNum <= streak
                        : dayNum < streak + 1;
                    const isToday =
                      !statusData?.hasCheckedInToday && dayNum === streak + 1;

                    return (
                      <View
                        key={`day-${dayNum}`}
                        style={[
                          styles.dayBox,
                          isToday && styles.dayBoxToday,
                          isPassed && styles.dayBoxPassed,
                        ]}
                      >
                        <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                          Ngày {dayNum}
                        </Text>
                        <View style={styles.dayIconBox}>
                          {isPassed ? (
                            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                          ) : dayNum === 7 ? (
                            <Ionicons name="gift" size={20} color="#D97706" />
                          ) : (
                            <Ionicons
                              name="sparkles"
                              size={16}
                              color={isToday ? "#EA580C" : "#94A3B8"}
                            />
                          )}
                        </View>
                        <Text style={[styles.dayXpText, isToday && styles.dayXpTextToday]}>
                          +{xpReward} XP
                        </Text>
                      </View>
                    );
                  }
                )}
              </View>

              {/* Check-in Action Button */}
              <TouchableOpacity
                style={[
                  styles.checkInBtn,
                  statusData?.hasCheckedInToday && styles.checkInBtnDisabled,
                ]}
                activeOpacity={0.8}
                disabled={statusData?.hasCheckedInToday || isClaiming}
                onPress={handleCheckIn}
              >
                {isClaiming ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name={
                        statusData?.hasCheckedInToday
                          ? "checkmark-circle-outline"
                          : "gift-outline"
                      }
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.checkInBtnText}>
                      {statusData?.hasCheckedInToday
                        ? "Đã điểm danh hôm nay (Quay lại vào ngày mai)"
                        : "Điểm danh nhận ngay +" +
                          ((statusData?.streakRewards || [])[
                            statusData?.streakDays ?? 0
                          ] || 15) +
                          " XP"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* 4. Tab Switcher (Redeem vs My Rewards) */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === "redeem" && styles.tabBtnActive]}
                onPress={() => setActiveTab("redeem")}
              >
                <Ionicons
                  name="pricetags-outline"
                  size={16}
                  color={activeTab === "redeem" ? "#EA580C" : "#64748B"}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    activeTab === "redeem" && styles.tabBtnTextActive,
                  ]}
                >
                  Đổi Quà Bằng XP ({statusData?.catalog.length || 0})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === "my_rewards" && styles.tabBtnActive]}
                onPress={() => setActiveTab("my_rewards")}
              >
                <Ionicons
                  name="wallet-outline"
                  size={16}
                  color={activeTab === "my_rewards" ? "#EA580C" : "#64748B"}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    activeTab === "my_rewards" && styles.tabBtnTextActive,
                  ]}
                >
                  Quà Của Tôi ({statusData?.claimedRewards.length || 0})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab 1: Redeem Catalog */}
            {activeTab === "redeem" && (
              <View style={styles.catalogList}>
                {(statusData?.catalog || []).map((item) => {
                  const canAfford = (statusData?.chefExp ?? 0) >= item.xpCost;
                  const isRedeeming = redeemingId === item.id;
                  const brandLogo = getBrandLogoSource(
                    item.brand,
                    item.title,
                    item.icon,
                    (item as any).imageUrl
                  );

                  return (
                    <View key={item.id} style={styles.rewardCard}>
                      <View style={styles.rewardIconCircle}>
                        {brandLogo ? (
                          <Image
                            source={brandLogo}
                            style={styles.brandLogoImg}
                            resizeMode="contain"
                          />
                        ) : (
                          <MaterialCommunityIcons
                            name={
                              item.icon === "cart"
                                ? "cart"
                                : item.icon === "basket"
                                ? "basket"
                                : item.icon === "star"
                                ? "star"
                                : "gift"
                            }
                            size={24}
                            color={item.badgeColor}
                          />
                        )}
                      </View>

                      <View style={styles.rewardInfo}>
                        <View style={styles.brandRow}>
                          <Text style={styles.brandText}>{item.brand}</Text>
                          <Text
                            style={[
                              styles.discountBadge,
                              { color: item.badgeColor, borderColor: item.badgeColor },
                            ]}
                          >
                            {item.discountValue}
                          </Text>
                        </View>
                        <Text style={styles.rewardTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.rewardDesc} numberOfLines={2}>
                          {item.description}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.redeemBtn,
                          !canAfford && styles.redeemBtnDisabled,
                        ]}
                        activeOpacity={0.8}
                        disabled={isRedeeming}
                        onPress={() => handleRedeem(item)}
                      >
                        {isRedeeming ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="sparkles" size={13} color="#FFFFFF" />
                            <Text style={styles.redeemBtnText}>{item.xpCost} XP</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Tab 2: My Claimed Rewards */}
            {activeTab === "my_rewards" && (
              <View style={styles.claimedList}>
                {!statusData?.claimedRewards || statusData.claimedRewards.length === 0 ? (
                  <View style={styles.emptyRewardsBox}>
                    <Ionicons name="receipt-outline" size={42} color="#CBD5E1" />
                    <Text style={styles.emptyRewardsTitle}>Bạn chưa có phần quà nào</Text>
                    <Text style={styles.emptyRewardsDesc}>
                      Dùng điểm Chef XP bạn đã tích lũy từ nấu ăn và điểm danh để đổi
                      các voucher siêu thị hấp dẫn nhé!
                    </Text>
                  </View>
                ) : (
                  statusData.claimedRewards.map((reward) => (
                    <View key={reward.id} style={styles.claimedCard}>
                      <View style={styles.claimedHeader}>
                        <View style={styles.couponTag}>
                          <Ionicons name="pricetag" size={13} color="#EA580C" />
                          <Text style={styles.couponTagText}>{reward.discountValue}</Text>
                        </View>
                        <Text style={styles.claimedDate}>
                          HSD: {new Date(reward.expiresAt).toLocaleDateString("vi-VN")}
                        </Text>
                      </View>

                      <Text style={styles.claimedTitle}>{reward.title}</Text>
                      <Text style={styles.claimedDesc}>{reward.description}</Text>

                      {/* Code Box with Copy Button */}
                      <View style={styles.codeRow}>
                        <View style={styles.codeBox}>
                          <Text style={styles.codeText}>{reward.code}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.copyBtn}
                          activeOpacity={0.8}
                          onPress={() => handleCopyCode(reward.code)}
                        >
                          <Ionicons name="copy-outline" size={15} color="#EA580C" />
                          <Text style={styles.copyBtnText}>Sao chép</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

export default GiftRewardsModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerEmoji: {
    fontSize: 26,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#64748B",
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  xpCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 18,
  },
  xpCardLeft: {
    gap: 4,
  },
  xpCardLevel: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  xpNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  xpNumberText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  xpUnitText: {
    fontSize: 14,
    color: "#FBBF24",
    fontWeight: "600",
  },
  streakBadgeBox: {
    alignItems: "center",
    backgroundColor: "#334155",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  streakBadgeNum: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 2,
  },
  streakBadgeText: {
    fontSize: 10,
    color: "#CBD5E1",
  },
  streakCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
  },
  dayBox: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingVertical: 10,
    gap: 4,
  },
  dayBoxToday: {
    borderColor: "#EA580C",
    backgroundColor: "#FFF7ED",
    borderWidth: 2,
  },
  dayBoxPassed: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  dayLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  dayLabelToday: {
    color: "#EA580C",
    fontWeight: "700",
  },
  dayIconBox: {
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  dayXpText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  dayXpTextToday: {
    color: "#EA580C",
  },
  checkInBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EA580C",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  checkInBtnDisabled: {
    backgroundColor: "#94A3B8",
  },
  checkInBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  tabBtnTextActive: {
    color: "#EA580C",
    fontWeight: "700",
  },
  catalogList: {
    gap: 12,
  },
  rewardCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  rewardIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 3,
  },
  brandLogoImg: {
    width: "100%",
    height: "100%",
  },
  rewardInfo: {
    flex: 1,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  brandText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
  },
  discountBadge: {
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderRadius: 4,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  rewardDesc: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
  },
  redeemBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EA580C",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  redeemBtnDisabled: {
    backgroundColor: "#CBD5E1",
  },
  redeemBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  claimedList: {
    gap: 12,
  },
  emptyRewardsBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyRewardsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 10,
    marginBottom: 4,
  },
  emptyRewardsDesc: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  claimedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  claimedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  couponTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  couponTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EA580C",
  },
  claimedDate: {
    fontSize: 11,
    color: "#94A3B8",
  },
  claimedTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  claimedDesc: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  codeBox: {
    flex: 1,
  },
  codeText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 1.5,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EA580C",
  },
});
