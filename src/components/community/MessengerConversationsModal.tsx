import { BrandColors } from "@/constants/brandColors";
import DismissKeyboard from "@/components/common/DismissKeyboard";
import { CommunityAuthor, DirectConversation } from "@/types";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface MessengerConversationsModalProps {
  visible: boolean;
  conversations: DirectConversation[];
  onClose: () => void;
  onSelectConversation: (user: CommunityAuthor) => void;
}

type FilterTab = "all" | "friends" | "groups" | "favorites";

export default function MessengerConversationsModal({
  visible,
  conversations,
  onClose,
  onSelectConversation,
}: MessengerConversationsModalProps) {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const matchSearch =
      !search.trim() ||
      c.user.name.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;
    if (activeFilter === "friends") return !c.user.isChef;
    if (activeFilter === "groups") return c.user.isChef;
    if (activeFilter === "favorites") return c.unreadCount > 0 || c.isOnline;
    return true;
  });

  const renderConversationItem = ({ item }: { item: DirectConversation }) => (
    <TouchableOpacity
      style={styles.conversationRow}
      activeOpacity={0.65}
      onPress={() => onSelectConversation(item.user)}
    >
      {/* User Avatar with Green Online Indicator */}
      <View style={styles.avatarWrap}>
        <Image source={item.user.avatar} style={styles.avatar} />
        {item.isOnline && <View style={styles.onlineBadge} />}
      </View>

      {/* Conversation Info */}
      <View style={styles.convContent}>
        <View style={styles.topRow}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.user.name}
          </Text>
          <Text style={styles.timeText}>{item.lastMessageTime}</Text>
        </View>

        <View style={styles.bottomRow}>
          <Text
            style={[
              styles.lastMessageText,
              item.unreadCount > 0 && styles.lastMessageUnread,
            ]}
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>

          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <DismissKeyboard>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
      <View
        style={[
          styles.container,
          { paddingTop: Math.max(insets.top, 10), paddingBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        {/* Top Header - Exact match to image 1 */}
        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backBtn}
              activeOpacity={0.7}
              onPress={onClose}
            >
              <Ionicons name="chevron-back" size={24} color="#0F172A" />
            </TouchableOpacity>
            <View>
              <Text style={styles.mainTitle}>Tin nhắn</Text>
              <Text style={styles.subtitleText}>Kết nối với mọi người</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            {/* Search Icon */}
            <TouchableOpacity
              style={styles.actionCircleBtn}
              activeOpacity={0.75}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Ionicons name="search" size={20} color="#0F172A" />
            </TouchableOpacity>

            {/* New Message Icon (Square with pen in brand orange) */}
            <TouchableOpacity
              style={styles.newMessageBtn}
              activeOpacity={0.8}
              onPress={() => {
                if (conversations.length > 0) {
                  onSelectConversation(conversations[0].user);
                }
              }}
            >
              <LinearGradient
                colors={BrandColors.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.newMessageGradient}
              >
                <Ionicons name="create-outline" size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Collapsible Search Input */}
        {showSearch && (
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search" size={16} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm tin nhắn..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Filter Pills Row - Exact match to image 1 with brand primary color */}
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              activeFilter === "all" && styles.filterPillActive,
            ]}
            activeOpacity={0.8}
            onPress={() => setActiveFilter("all")}
          >
            <Text
              style={[
                styles.filterPillText,
                activeFilter === "all" && styles.filterPillTextActive,
              ]}
            >
              Tất cả
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              activeFilter === "friends" && styles.filterPillActive,
            ]}
            activeOpacity={0.8}
            onPress={() => setActiveFilter("friends")}
          >
            <Text
              style={[
                styles.filterPillText,
                activeFilter === "friends" && styles.filterPillTextActive,
              ]}
            >
              Bạn bè
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              activeFilter === "groups" && styles.filterPillActive,
            ]}
            activeOpacity={0.8}
            onPress={() => setActiveFilter("groups")}
          >
            <Text
              style={[
                styles.filterPillText,
                activeFilter === "groups" && styles.filterPillTextActive,
              ]}
            >
              Nhóm
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              activeFilter === "favorites" && styles.filterPillActive,
            ]}
            activeOpacity={0.8}
            onPress={() => setActiveFilter("favorites")}
          >
            <Text
              style={[
                styles.filterPillText,
                activeFilter === "favorites" && styles.filterPillTextActive,
              ]}
            >
              Yêu thích
            </Text>
          </TouchableOpacity>
        </View>

        {/* Conversations List - Clean & Compact like image 1 */}
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.conversationsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={44} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Không có tin nhắn nào</Text>
              <Text style={styles.emptySubtitle}>
                Chưa có đoạn chat trong mục này.
              </Text>
            </View>
          }
        />
      </View>
      </KeyboardAvoidingView>
      </DismissKeyboard>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
    marginLeft: -4,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  newMessageBtn: {
    borderRadius: 10,
    overflow: "hidden",
  },
  newMessageGradient: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    paddingVertical: Platform.OS === "android" ? 4 : 0,
  },
  filterPillsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
  },
  filterPillActive: {
    backgroundColor: BrandColors.primary,
  },
  filterPillText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#64748B",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  conversationsList: {
    paddingTop: 4,
    paddingBottom: 24,
  },
  conversationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatarWrap: {
    position: "relative",
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F1F5F9",
  },
  onlineBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  convContent: {
    flex: 1,
    justifyContent: "center",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  userName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 11.5,
    color: "#94A3B8",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lastMessageText: {
    fontSize: 13,
    color: "#64748B",
    flex: 1,
    marginRight: 8,
  },
  lastMessageUnread: {
    color: "#0F172A",
    fontWeight: "600",
  },
  unreadBadge: {
    backgroundColor: BrandColors.primary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
  },
});
