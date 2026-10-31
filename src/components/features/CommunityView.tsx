import CommentsModal from "@/components/community/CommentsModal";
import CreatePostModal from "@/components/community/CreatePostModal";
import DirectChatModal from "@/components/community/DirectChatModal";
import MessengerConversationsModal from "@/components/community/MessengerConversationsModal";
import PostCard from "@/components/community/PostCard";
import { BrandColors } from "@/constants/brandColors";
import { CommunityService, CURRENT_USER } from "@/services/communityService";
import { socketService } from "@/services/socketService";
import {
  ChatMessage,
  CommunityAuthor,
  CommunityPost,
  DirectConversation,
} from "@/types";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
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
}: {
  insetsTop: number;
  insetsBottom?: number;
}) {
  // State from CommunityService
  const [posts, setPosts] = useState<CommunityPost[]>(() =>
    CommunityService.getPosts(),
  );
  const [conversations, setConversations] = useState<DirectConversation[]>(() =>
    CommunityService.getConversations(),
  );
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [selectedTag, setSelectedTag] = useState<string>("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConversationsModal, setShowConversationsModal] = useState(false);
  const [activeCommentPost, setActiveCommentPost] =
    useState<CommunityPost | null>(null);

  // 1-1 Direct Messenger Chat
  const [directChatTarget, setDirectChatTarget] =
    useState<CommunityAuthor | null>(null);
  const [activeConvId, setActiveConvId] = useState<string>("");
  const [directMessages, setDirectMessages] = useState<ChatMessage[]>([]);

  // Calculate total unread messages
  const totalUnread = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [conversations]);

  // Initial connect & fetch from backend
  useEffect(() => {
    socketService.connect();
    CommunityService.fetchPosts({ tag: selectedTag, search: searchQuery });
    CommunityService.fetchConversations();
  }, []);

  // Subscribe to service updates
  useEffect(() => {
    const unsub = CommunityService.subscribe(() => {
      setPosts(CommunityService.getPosts());
      setConversations(CommunityService.getConversations());
      if (directChatTarget) {
        setDirectMessages(
          CommunityService.getDirectMessages(activeConvId || directChatTarget.id),
        );
      }
    });
    return unsub;
  }, [directChatTarget, activeConvId]);

  // Realtime Socket listener for incoming messages
  useEffect(() => {
    const unsubSocket = socketService.onNewMessage((msg) => {
      // If message belongs to active direct chat
      if (
        directChatTarget &&
        (msg.conversationId === activeConvId ||
          msg.sender?.id === directChatTarget.id ||
          (msg.sender as any)?._id === directChatTarget.id)
      ) {
        setDirectMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          const isSenderTarget =
            msg.sender?.id === directChatTarget.id ||
            (msg.sender as any)?._id === directChatTarget.id ||
            msg.sender?.name === directChatTarget.name;
          const isMe = msg.isMe !== undefined ? Boolean(msg.isMe) : !isSenderTarget;

          return [
            ...prev,
            {
              id: msg.id,
              sender: msg.sender as any,
              text: msg.text,
              imageUri: msg.imageUri,
              timestamp: msg.timestamp,
              isMe,
            },
          ];
        });
      }
    });

    return unsubSocket;
  }, [directChatTarget, activeConvId]);

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

  // Open direct 1-1 chat with a user
  const handleOpenDirectChat = async (author: CommunityAuthor) => {
    // Leave previous room if any
    if (activeConvId) {
      socketService.leaveRoom(activeConvId);
    }

    // Instantly clear/load cache for the new target so previous chat never persists
    setActiveConvId("");
    setDirectChatTarget(author);
    const cached = CommunityService.getDirectMessages(author.id);
    setDirectMessages(cached);
    CommunityService.markConversationAsRead(author.id);

    try {
      const directInfo = await CommunityService.getOrCreateDirectChat(author.id);
      setActiveConvId(directInfo.conversationId);
      const history = await CommunityService.fetchMessageHistory(directInfo.conversationId);
      setDirectMessages(history);
    } catch (e) {
      console.warn("Lỗi tải lịch sử chat:", e);
    }
  };

  const handleCloseDirectChat = () => {
    if (activeConvId) {
      socketService.leaveRoom(activeConvId);
    }
    setDirectChatTarget(null);
    setActiveConvId("");
    setDirectMessages([]);
  };

  const handleSendDirectMessage = async (text: string, imageUri?: string) => {
    if (!directChatTarget) return;
    const sent = await CommunityService.sendDirectMessage(
      directChatTarget,
      text,
      imageUri,
      activeConvId,
    );
    setDirectMessages((prev) => {
      if (prev.some((m) => m.id === sent.id)) return prev;
      return [...prev, sent];
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insetsTop + 8 }]}>
        <View style={styles.headerTop}>
          <View style={styles.communityLeft}>
            <View style={styles.communityIconBadge}>
              <MaterialCommunityIcons
                name="account-group"
                size={22}
                color={BrandColors.primary}
              />
            </View>
            <Text style={styles.communityLabel}>Cộng đồng</Text>
          </View>

          <View style={styles.headerActionsRight}>
            {/* Search Icon Button */}
            <TouchableOpacity
              style={[
                styles.headerActionBtn,
                isSearchOpen && styles.headerActionBtnActive,
              ]}
              activeOpacity={0.75}
              onPress={() => setIsSearchOpen((prev) => !prev)}
            >
              <Ionicons
                name={isSearchOpen ? "close" : "search-outline"}
                size={20}
                color={isSearchOpen ? BrandColors.primary : "#0F172A"}
              />
            </TouchableOpacity>

            {/* Messenger Icon Button with Unread Badge */}
            <TouchableOpacity
              style={styles.headerActionBtn}
              activeOpacity={0.75}
              onPress={() => setShowConversationsModal(true)}
            >
              <MaterialCommunityIcons
                name="message-processing-outline"
                size={22}
                color="#0F172A"
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
              placeholderTextColor="#94A3B8"
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
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
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
        {/* Modern Create Post Banner / Action Card */}
        <View style={styles.createPostCard}>
          <TouchableOpacity
            style={styles.createPostTopRow}
            activeOpacity={0.85}
            onPress={() => setShowCreateModal(true)}
          >
            <Image
              source={CURRENT_USER.avatar}
              style={styles.createPostAvatar}
            />
            <View style={styles.fakeInput}>
              <Text style={styles.fakeInputPlaceholder}>
                Hôm nay bạn nấu món gì ngon? Chia sẻ nhé...
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.createPostDivider} />

          <View style={styles.createPostActionsRow}>
            {/* Quick action: Image */}
            <TouchableOpacity
              style={styles.actionPill}
              activeOpacity={0.75}
              onPress={() => setShowCreateModal(true)}
            >
              <View
                style={[
                  styles.actionPillIconWrap,
                  { backgroundColor: "#FEF2F2" },
                ]}
              >
                <Ionicons name="images" size={16} color="#EF4444" />
              </View>
              <Text style={styles.actionPillText}>Ảnh món ăn</Text>
            </TouchableOpacity>

            {/* Primary "Đăng bài" Button */}
            <TouchableOpacity
              style={styles.publishPostBtn}
              activeOpacity={0.85}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add-circle" size={16} color="#FFFFFF" />
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
            <Ionicons name="restaurant-outline" size={48} color="#CBD5E1" />
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
        onClose={() => setShowConversationsModal(false)}
        onSelectConversation={(user) => {
          setShowConversationsModal(false);
          handleOpenDirectChat(user);
        }}
      />

      {/* 1-1 Direct Messenger Chat Window */}
      <DirectChatModal
        visible={!!directChatTarget}
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
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  communityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  communityIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
  },
  communityLabel: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  headerActionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  headerActionBtnActive: {
    backgroundColor: "#FFF3E0",
    borderColor: BrandColors.primary,
  },
  messengerBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: "#EF4444",
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
    backgroundColor: "#F1F5F9",
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
    color: "#0F172A",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
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
    backgroundColor: "#E2E8F0",
  },
  fakeInput: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  fakeInputPlaceholder: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  createPostDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 10,
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
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionPillIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  actionPillText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#475569",
  },
  publishPostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tagChipActive: {
    backgroundColor: "#FFF3E0",
    borderColor: BrandColors.primary,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
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
    color: "#334155",
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: "#94A3B8",
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
