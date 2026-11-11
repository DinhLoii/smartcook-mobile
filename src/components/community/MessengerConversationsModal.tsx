import { BrandColors } from "@/constants/brandColors";
import DismissKeyboard from "@/components/common/DismissKeyboard";
import { CommunityAuthor, DirectConversation } from "@/types";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  ActivityIndicator,
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
  contacts: CommunityAuthor[];
  loading: boolean;
  loadError: boolean;
  onRetry: () => void;
  onClose: () => void;
  onSelectConversation: (user: CommunityAuthor, conversationId?: string) => void;
}

type FilterTab = "all" | "friends" | "groups" | "favorites";

export default function MessengerConversationsModal({
  visible,
  conversations,
  contacts,
  loading,
  loadError,
  onRetry,
  onClose,
  onSelectConversation,
}: MessengerConversationsModalProps) {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    if (visible) return;
    setComposing(false);
    setSearch("");
    setShowSearch(false);
  }, [visible]);

  const filteredContacts = contacts.filter((author) =>
    author.name.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")));

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
      onPress={() => onSelectConversation(item.user, item.conversationId)}
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
              onPress={composing ? () => { setComposing(false); setSearch(""); } : onClose}
            >
              <Ionicons name="chevron-back" size={24} color={BrandColors.textDark} />
            </TouchableOpacity>
            <View>
              <Text style={styles.mainTitle} accessibilityRole="header">
                {composing ? "Tin nhắn mới" : "Tin nhắn"}
              </Text>
              {composing && <Text style={styles.subtitleText}>Chọn người đăng trong Cộng đồng</Text>}
            </View>
          </View>

          {!composing && <View style={styles.headerRight}>
            {/* Search Icon */}
            <TouchableOpacity
              style={styles.actionCircleBtn}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={showSearch ? "Đóng tìm kiếm" : "Tìm tin nhắn"}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Ionicons name={showSearch ? "close-outline" : "search-outline"} size={22} color={BrandColors.textDark} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.newMessageBtn}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Soạn tin nhắn mới"
              onPress={() => {
                setSearch("");
                setComposing(true);
              }}
            >
              <Ionicons name="create-outline" size={21} color={BrandColors.surfaceCard} />
            </TouchableOpacity>
          </View>}
        </View>

        {/* Collapsible Search Input */}
        {(showSearch || composing) && (
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search" size={16} color={BrandColors.textPlaceholder} />
            <TextInput
              style={styles.searchInput}
              placeholder={composing ? "Tìm theo tên người đăng" : "Tìm kiếm tin nhắn..."}
              placeholderTextColor={BrandColors.textPlaceholder}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={16} color={BrandColors.textPlaceholder} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {!composing && <View style={styles.filterPillsRow}>
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
        </View>}

        {/* Conversations List - Clean & Compact like image 1 */}
        {composing ? (
          <FlatList
            key="contacts"
            data={filteredContacts}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.conversationRow} onPress={() => onSelectConversation(item)}>
                <Image source={item.avatar} style={styles.avatar} />
                <View style={styles.convContent}><Text style={styles.userName}>{item.name}</Text></View>
                <Ionicons name="chevron-forward" size={17} color={BrandColors.textMuted} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={<View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Chưa tìm thấy người phù hợp</Text>
              <Text style={styles.emptySubtitle}>Bạn cũng có thể nhắn tin từ bài viết của người đó.</Text>
            </View>}
          />
        ) : <FlatList
          key="conversations"
          data={filteredConversations}
          keyExtractor={(item) => item.conversationId}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.conversationsList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onRefresh={onRetry}
          refreshing={loading}
          ListHeaderComponent={loadError ? (
            <TouchableOpacity onPress={onRetry} style={styles.emptyContainer} accessibilityRole="button">
              <Text style={styles.emptyTitle}>Không tải được hộp thư</Text>
              <Text style={styles.emptySubtitle}>Chạm để thử lại</Text>
            </TouchableOpacity>
          ) : null}
          ListEmptyComponent={
            loading ? <ActivityIndicator color={BrandColors.primary} /> : loadError ? null : <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={44} color="#C7C7C7" />
              <Text style={styles.emptyTitle}>Không có tin nhắn nào</Text>
              <Text style={styles.emptySubtitle}>
                Chưa có đoạn chat trong mục này.
              </Text>
            </View>
          }
        />}
      </View>
      </KeyboardAvoidingView>
      </DismissKeyboard>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.surfaceCard,
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
    color: BrandColors.textDark,
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 12,
    color: BrandColors.textMuted,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionCircleBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  newMessageBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: BrandColors.primary,
  },
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.inputBg,
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
    color: BrandColors.textDark,
    paddingVertical: Platform.OS === "android" ? 4 : 0,
  },
  filterPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: BrandColors.inputBg,
  },
  filterPillActive: {
    backgroundColor: BrandColors.primary,
  },
  filterPillText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: BrandColors.textMuted,
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
    backgroundColor: BrandColors.inputBg,
  },
  onlineBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#363636",
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
    color: BrandColors.textDark,
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 11.5,
    color: BrandColors.textPlaceholder,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lastMessageText: {
    fontSize: 13,
    color: BrandColors.textMuted,
    flex: 1,
    marginRight: 8,
  },
  lastMessageUnread: {
    color: BrandColors.textDark,
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
    color: BrandColors.textBody,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: BrandColors.textPlaceholder,
    textAlign: "center",
    marginTop: 4,
  },
});
