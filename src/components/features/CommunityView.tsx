import CommentsModal from "@/components/community/CommentsModal";
import CreatePostModal from "@/components/community/CreatePostModal";
import DirectChatModal from "@/components/community/DirectChatModal";
import MessengerConversationsModal from "@/components/community/MessengerConversationsModal";
import PostCard from "@/components/community/PostCard";
import { useAuth } from "@/contexts/AuthContext";
import { BrandColors } from "@/constants/brandColors";
import { CommunityService, CURRENT_USER } from "@/services/communityService";
import {
  ChatMessage,
  CommunityAuthor,
  CommunityPost,
  DirectConversation,
} from "@/types";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const COMMUNITY_TAGS = [
  "Tất cả",
  "#KhoeMonNgon",
  "#HoiDapBep",
  "#HealthyEatClean",
  "#MonNhanh",
  "#BiQuyet",
];

export default function CommunityView({
  insetsTop,
  insetsBottom,
  openInboxOnMount = false,
  onInboxOpened,
  onOpenAssistant,
}: {
  insetsTop: number;
  insetsBottom?: number;
  openInboxOnMount?: boolean;
  onInboxOpened?: () => void;
  onOpenAssistant: () => void;
}) {
  const { user } = useAuth();
  // State from CommunityService
  const [posts, setPosts] = useState<CommunityPost[]>(() =>
    CommunityService.getPosts(),
  );
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [selectedTag, setSelectedTag] = useState<string>("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConversationsModal, setShowConversationsModal] = useState(openInboxOnMount);
  const [activeCommentPost, setActiveCommentPost] =
    useState<CommunityPost | null>(null);

  // 1-1 Direct Messenger Chat
  const [directChatTarget, setDirectChatTarget] =
    useState<CommunityAuthor | null>(null);
  const [activeConvId, setActiveConvId] = useState<string>("");
  const [directMessages, setDirectMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(false);
  const chatRequest = useRef(0);
  const activeRoom = useRef("");
  const returnToInbox = useRef(false);

  // Calculate total unread messages
  const totalUnread = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [conversations]);

  const refreshInbox = useCallback(async () => {
    setInboxLoading(true);
    setInboxError(false);
    try {
      await CommunityService.fetchConversations();
    } catch {
      setInboxError(true);
    } finally {
      setInboxLoading(false);
    }
  }, []);

  useEffect(() => {
    if (openInboxOnMount) onInboxOpened?.();
  }, [openInboxOnMount, onInboxOpened]);

  useEffect(() => {
    CommunityService.setChatUser(user?.id);
    setConversations(CommunityService.getConversations());
    const unsubscribe = CommunityService.subscribe(() => {
      setPosts(CommunityService.getPosts());
      setConversations(CommunityService.getConversations());
      if (activeRoom.current) setDirectMessages(CommunityService.getDirectMessages(activeRoom.current));
    });
    void CommunityService.fetchPosts();
    if (user?.id) void refreshInbox();
    return () => {
      chatRequest.current++;
      activeRoom.current = "";
      unsubscribe();
      CommunityService.setActiveConversation("");
    };
  }, [user?.id, refreshInbox]);

  const chatContacts = useMemo(() => {
    const authors = posts.map((post) => post.author)
      .filter((author) => /^[a-f0-9]{24}$/i.test(author.id) && author.id !== user?.id);
    return [...new Map(authors.map((author) => [author.id, author])).values()];
  }, [posts, user?.id]);

  // On refresh with full backend synchronization
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        CommunityService.fetchPosts({ tag: selectedTag, search: searchQuery }),
        CommunityService.fetchConversations(),
      ]);
      setPosts(CommunityService.getPosts());
      setConversations(CommunityService.getConversations());
    } catch (e) {
      console.warn("Lỗi refresh community:", e);
    } finally {
      setRefreshing(false);
    }
  };

  // Filtered posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchTag =
        selectedTag === "Tất cả" ||
        post.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase());
      const matchQuery =
        !searchQuery.trim() ||
        post.dishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTag && matchQuery;
    });
  }, [posts, selectedTag, searchQuery]);

  // Handlers
  const handleLike = (postId: string) => {
    CommunityService.toggleLikePost(postId);
  };

  const handleSave = (postId: string) => {
    CommunityService.toggleSavePost(postId);
  };

  const handleShare = (post: CommunityPost) => {
    Alert.alert(
      "Chia sẻ món ăn",
      `Đã sao chép liên kết bài viết "${post.dishName || post.author.name}" vào bộ nhớ tạm!`,
    );
  };

  const handleCreatePost = async (data: {
    dishName: string;
    content: string;
    images: any[];
    tags: string[];
  }) => {
    await CommunityService.createPost(data);
    Alert.alert("🎉 Thành công", "Bài viết của bạn đã được đăng lên cộng đồng! Bạn nhận được +20 XP Đầu Bếp.");
  };

  const handleAddComment = async (postId: string, text: string) => {
    await CommunityService.addComment(postId, text);
    const updatedPost = CommunityService.getPosts().find(
      (p) => p.id === postId,
    );
    if (updatedPost) {
      setActiveCommentPost(updatedPost);
    }
  };

  const handleOpenDirectChat = async (author: CommunityAuthor, conversationId?: string) => {
    if (author.id === user?.id) return;
    if (!/^[a-f0-9]{24}$/i.test(author.id)) {
      Alert.alert("Tin nhắn", "Tài khoản này chưa có trên SmartCook.");
      return;
    }

    const request = ++chatRequest.current;
    activeRoom.current = "";
    CommunityService.setActiveConversation("");
    setActiveConvId("");
    setDirectChatTarget(author);
    setDirectMessages([]);
    setChatLoading(true);
    setChatError(false);
    try {
      const id = conversationId ?? (await CommunityService.getOrCreateDirectChat(author.id)).conversationId;
      if (request !== chatRequest.current) return;
      activeRoom.current = id;
      CommunityService.setActiveConversation(id);
      setActiveConvId(id);
      setDirectMessages(CommunityService.getDirectMessages(id));
      await CommunityService.fetchMessageHistory(id);
    } catch {
      if (request === chatRequest.current) setChatError(true);
    } finally {
      if (request === chatRequest.current) setChatLoading(false);
    }
  };

  const handleCloseDirectChat = () => {
    chatRequest.current++;
    activeRoom.current = "";
    CommunityService.setActiveConversation("");
    setDirectChatTarget(null);
    setActiveConvId("");
    setDirectMessages([]);
    if (returnToInbox.current) setShowConversationsModal(true);
    returnToInbox.current = false;
  };

  const handleSendDirectMessage = async (text: string, imageUri?: string) => {
    if (!activeConvId) throw new Error("Hội thoại chưa sẵn sàng.");
    await CommunityService.sendDirectMessage(activeConvId, text, imageUri);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insetsTop + 8 }]}>
        <View style={styles.headerTop}>
          <Text style={styles.communityLabel} accessibilityRole="header">Cộng đồng</Text>

          <View style={styles.headerActionsRight}>
            <TouchableOpacity
              style={styles.headerActionBtn}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Mở trợ lý SmartCook"
              onPress={onOpenAssistant}
            >
              <Ionicons name="sparkles-outline" size={20} color={BrandColors.textDark} />
            </TouchableOpacity>
            {/* Search Icon Button */}
            <TouchableOpacity
              style={[
                styles.headerActionBtn,
                isSearchOpen && styles.headerActionBtnActive,
              ]}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={isSearchOpen ? "Đóng tìm kiếm" : "Tìm bài viết"}
              onPress={() => setIsSearchOpen((prev) => !prev)}
            >
              <Ionicons
                name={isSearchOpen ? "close" : "search-outline"}
                size={20}
                color={isSearchOpen ? BrandColors.primary : "#171717"}
              />
            </TouchableOpacity>

            {/* Messenger Icon Button with Unread Badge */}
            <TouchableOpacity
              style={styles.headerActionBtn}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Tin nhắn"
              onPress={() => { setShowConversationsModal(true); void refreshInbox(); }}
            >
              <MaterialCommunityIcons
                name="message-processing-outline"
                size={22}
                color={BrandColors.textDark}
              />
              {totalUnread > 0 && (
                <View style={styles.messengerBadge}>
                  <Text style={styles.messengerBadgeText}>{totalUnread}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Expandable Search Bar in Header */}
        {isSearchOpen && (
          <View style={styles.headerSearchBar}>
            <Ionicons
              name="search"
              size={17}
              color={BrandColors.primary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm món ngon, thành viên, bí quyết..."
              placeholderTextColor={BrandColors.textPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.clearBtn}
              >
                <Ionicons name="close-circle" size={16} color={BrandColors.textPlaceholder} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Community Feed Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[BrandColors.primary]}
          />
        }
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 110 + (insetsBottom || 0) },
        ]}
      >
        {/* Composer */}
        <View style={styles.createPostCard}>
          <TouchableOpacity
            style={styles.createPostTopRow}
            activeOpacity={0.85}
            accessibilityRole="button"
            onPress={() => setShowCreateModal(true)}
          >
            <Image
              source={CURRENT_USER.avatar}
              style={styles.createPostAvatar}
            />
            <View style={styles.fakeInput}>
              <Text style={styles.fakeInputPlaceholder}>
                Hôm nay bạn nấu món gì?
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.createPostActionsRow}>
            {/* Quick action: Image */}
            <TouchableOpacity
              style={styles.actionPill}
              activeOpacity={0.75}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="images-outline" size={18} color={BrandColors.textDark} />
              <Text style={styles.actionPillText}>Ảnh món ăn</Text>
            </TouchableOpacity>

            {/* Primary "Đăng bài" Button */}
            <TouchableOpacity
              style={styles.publishPostBtn}
              activeOpacity={0.85}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add" size={18} color={BrandColors.surfaceCard} />
              <Text style={styles.publishPostBtnText}>Đăng bài</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tag Filter Pills */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagChipsScroll}
          >
            {COMMUNITY_TAGS.map((tag) => {
              const isSelected = selectedTag === tag;
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagChip, isSelected && styles.tagChipActive]}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    setSelectedTag(tag);
                    CommunityService.fetchPosts({
                      tag,
                      search: searchQuery,
                    });
                  }}
                >
                  <Text
                    style={[
                      styles.tagChipText,
                      isSelected && styles.tagChipTextActive,
                    ]}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Feed Posts List */}
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={handleLike}
              onComment={(p) => setActiveCommentPost(p)}
              onOpenDirectChat={handleOpenDirectChat}
              onSave={handleSave}
              onShare={handleShare}
              onTagPress={(t) => {
                setSelectedTag(t);
                CommunityService.fetchPosts({ tag: t, search: searchQuery });
              }}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color="#C7C7C7" />
            <Text style={styles.emptyTitle}>Chưa có bài viết nào phù hợp</Text>
            <Text style={styles.emptySubtitle}>
              Hãy là người đầu tiên chia sẻ công thức hoặc mẹo nấu ăn hữu ích này nhé!
            </Text>
            <TouchableOpacity
              style={styles.emptyCreateBtn}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.emptyCreateText}>Đăng Bài Ngay</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* 3. Modals */}
      {/* Create Post Modal */}
      <CreatePostModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePost}
      />

      {/* Comments Modal */}
      <CommentsModal
        visible={!!activeCommentPost}
        post={activeCommentPost}
        onClose={() => setActiveCommentPost(null)}
        onAddComment={handleAddComment}
        onOpenDirectChat={(author) => {
          setActiveCommentPost(null);
          handleOpenDirectChat(author);
        }}
      />

      {/* Messenger Conversations List Modal */}
      <MessengerConversationsModal
        visible={showConversationsModal}
        conversations={conversations}
        contacts={chatContacts}
        loading={inboxLoading}
        loadError={inboxError}
        onRetry={refreshInbox}
        onClose={() => setShowConversationsModal(false)}
        onSelectConversation={(author, conversationId) => {
          returnToInbox.current = true;
          setShowConversationsModal(false);
          void handleOpenDirectChat(author, conversationId);
        }}
      />

      {/* 1-1 Direct Messenger Chat Window */}
      <DirectChatModal
        key={directChatTarget?.id ?? "closed"}
        visible={!!directChatTarget}
        loading={chatLoading}
        loadError={chatError}
        canSend={!!activeConvId}
        onRetry={() => { if (directChatTarget) void handleOpenDirectChat(directChatTarget, activeConvId || undefined); }}
        targetUser={directChatTarget}
        messages={directMessages}
        onClose={handleCloseDirectChat}
        onSendMessage={handleSendDirectMessage}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    marginBottom: 8,
    backgroundColor: BrandColors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.borderLight,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  communityLabel: {
    fontSize: 24,
    fontWeight: "800",
    color: BrandColors.textDark,
    letterSpacing: -0.6,
  },
  headerActionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  headerActionBtnActive: {
    backgroundColor: BrandColors.inputBg,
    borderColor: BrandColors.primary,
  },
  messengerBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: "#242424",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  messengerBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: BrandColors.textDark,
    paddingVertical: 4,
    fontWeight: "500",
  },
  clearBtn: {
    padding: 4,
    marginLeft: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
  },
  createPostCard: {
    gap: 10,
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.borderLight,
  },
  createPostTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  createPostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E5E5",
  },
  fakeInput: {
    flex: 1,
    backgroundColor: BrandColors.background,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  fakeInputPlaceholder: {
    fontSize: 13,
    color: BrandColors.textPlaceholder,
    fontWeight: "500",
  },
  createPostActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 8,
  },
  actionPillText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: BrandColors.textBody,
  },
  publishPostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 16,
    minHeight: 44,
    borderRadius: 11,
  },
  publishPostBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  filterSection: {
    marginBottom: 12,
  },
  tagChipsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  tagChip: {
    backgroundColor: BrandColors.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  tagChipActive: {
    backgroundColor: BrandColors.inputBg,
    borderColor: BrandColors.primary,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: BrandColors.textMuted,
  },
  tagChipTextActive: {
    color: BrandColors.primaryDark,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
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
    lineHeight: 18,
  },
  emptyCreateBtn: {
    marginTop: 14,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
  },
  emptyCreateText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
