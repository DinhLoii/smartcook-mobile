import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BrandColors } from "@/constants/brandColors";
import { AppNotification, NotificationType } from "@/types";
import { notificationService } from "@/services/notificationService";
import { triggerHaptic } from "@/utils/haptics";

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateAction?: (route: string, data?: any) => void;
}

type TabKey = "all" | "community" | "fridge_expiry" | "reward";

const formatNotificationTime = (isoString?: string, now?: number): string => {
  if (!isoString || !now) return "Vừa xong";
  const diffMs = now - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return new Date(isoString).toLocaleDateString("vi-VN");
};

export const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onClose,
  onNavigateAction,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [nowTime, setNowTime] = useState<number>(0);

  const loadNotifications = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await notificationService.getNotifications(1, 50);
      setNotifications(res.notifications);
      setNowTime(Date.now());
    } catch (e) {
      console.error("Lỗi tải thông báo:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    notificationService
      .getNotifications(1, 50)
      .then((res) => {
        if (isMounted) {
          setNotifications(res.notifications);
          setNowTime(Date.now());
          setIsLoading(false);
          setIsRefreshing(false);
        }
      })
      .catch((e) => {
        console.error("Lỗi tải thông báo:", e);
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [visible]);

  // Lắng nghe sự kiện thông báo mới realtime
  useEffect(() => {
    const unsubscribe = notificationService.subscribeNewNotification((newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
    });
    return unsubscribe;
  }, []);

  const handleMarkAsRead = async (item: AppNotification) => {
    if (!item.isRead) {
      triggerHaptic("selection");
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      await notificationService.markAsRead(item.id);
    }

    if (item.data?.route && onNavigateAction) {
      onClose();
      onNavigateAction(item.data.route, item.data);
    }
  };

  const handleMarkAllRead = async () => {
    triggerHaptic("medium");
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await notificationService.markAllAsRead();
  };

  const handleDelete = async (id: string) => {
    triggerHaptic("selection");
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await notificationService.deleteNotification(id);
  };

  const filteredNotifications = useMemo(() => {
    if (activeTab === "all") return notifications;
    if (activeTab === "community") {
      return notifications.filter((n) => n.type === "community");
    }
    if (activeTab === "fridge_expiry") {
      return notifications.filter((n) => n.type === "fridge_expiry");
    }
    if (activeTab === "reward") {
      return notifications.filter((n) => n.type === "reward");
    }
    return notifications;
  }, [notifications, activeTab]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const renderIcon = (type: NotificationType) => {
    switch (type) {
      case "community":
        return (
          <View style={[styles.iconBox, { backgroundColor: "#FEE2E2" }]}>
            <Ionicons name="heart" size={20} color="#EF4444" />
          </View>
        );
      case "fridge_expiry":
        return (
          <View style={[styles.iconBox, { backgroundColor: "#FEF3C7" }]}>
            <MaterialCommunityIcons name="fridge-alert" size={20} color="#D97706" />
          </View>
        );
      case "reward":
        return (
          <View style={[styles.iconBox, { backgroundColor: "#FEF9C3" }]}>
            <Ionicons name="gift" size={20} color="#CA8A04" />
          </View>
        );
      case "planner":
        return (
          <View style={[styles.iconBox, { backgroundColor: "#E0F2FE" }]}>
            <Ionicons name="calendar" size={20} color="#0284C7" />
          </View>
        );
      default:
        return (
          <View style={[styles.iconBox, { backgroundColor: "#F1F5F9" }]}>
            <Ionicons name="notifications" size={20} color="#64748B" />
          </View>
        );
    }
  };

  const formatTime = (isoString?: string) =>
    formatNotificationTime(isoString, nowTime || undefined);

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
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Thông báo</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>

          <View style={styles.headerRight}>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={styles.markAllBtn}
                activeOpacity={0.7}
                onPress={handleMarkAllRead}
              >
                <Ionicons name="checkmark-done-outline" size={17} color="#EA580C" />
                <Text style={styles.markAllText}>Đọc tất cả</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.closeBtn}
              activeOpacity={0.7}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Filter Tabs */}
        <View style={styles.tabsRow}>
          {[
            { key: "all", label: `Tất cả (${notifications.length})` },
            { key: "community", label: "Cộng đồng" },
            { key: "fridge_expiry", label: "Tủ lạnh" },
            { key: "reward", label: "Phần thưởng" },
          ].map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabItem, isSelected && styles.tabItemActive]}
                onPress={() => {
                  triggerHaptic("selection");
                  setActiveTab(tab.key as TabKey);
                }}
              >
                <Text
                  style={[
                    styles.tabItemText,
                    isSelected && styles.tabItemTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 3. Notifications List */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={BrandColors.primary} />
            <Text style={styles.loadingText}>Đang tải thông báo...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredNotifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => {
                  setIsRefreshing(true);
                  loadNotifications(false);
                }}
                colors={[BrandColors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons
                    name="notifications-off-outline"
                    size={38}
                    color="#94A3B8"
                  />
                </View>
                <Text style={styles.emptyTitle}>Chưa có thông báo nào</Text>
                <Text style={styles.emptyDesc}>
                  Các thông báo về bình luận, lượt thích, cảnh báo hạn dùng thực phẩm
                  và điểm thưởng sẽ hiển thị tại đây.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              return (
                <TouchableOpacity
                  style={[
                    styles.notifCard,
                    !item.isRead && styles.notifCardUnread,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => handleMarkAsRead(item)}
                >
                  {renderIcon(item.type)}

                  <View style={styles.notifBody}>
                    <View style={styles.notifHeaderRow}>
                      <Text
                        style={[
                          styles.notifTitle,
                          !item.isRead && styles.notifTitleUnread,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.notifTime}>
                        {formatTime(item.createdAt)}
                      </Text>
                    </View>

                    <Text style={styles.notifDesc} numberOfLines={2}>
                      {item.body}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Ionicons name="trash-outline" size={15} color="#94A3B8" />
                  </TouchableOpacity>

                  {!item.isRead && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

export default NotificationModal;

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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  badge: {
    backgroundColor: "#EA580C",
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
  },
  markAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EA580C",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tabItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  tabItemActive: {
    backgroundColor: "#EA580C",
  },
  tabItemText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  tabItemTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 40,
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
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
  },
  notifCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
    position: "relative",
  },
  notifCardUnread: {
    backgroundColor: "#FFFBF7",
    borderColor: "#FDBA74",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  notifBody: {
    flex: 1,
  },
  notifHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    paddingRight: 10,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
    marginRight: 6,
  },
  notifTitleUnread: {
    fontWeight: "700",
    color: "#0F172A",
  },
  notifTime: {
    fontSize: 11,
    color: "#94A3B8",
  },
  notifDesc: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  deleteBtn: {
    padding: 6,
  },
  unreadDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EA580C",
  },
});
