import CommentsModal from "@/components/community/CommentsModal";
import CreatePostModal from "@/components/community/CreatePostModal";
import DirectChatModal from "@/components/community/DirectChatModal";
import MessengerConversationsModal from "@/components/community/MessengerConversationsModal";
import PostCard from "@/components/community/PostCard";
import { BrandColors } from "@/constants/brandColors";
import { CommunityService, CURRENT_USER } from "@/services/communityService";
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
    Platform,
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

export default function CommunityView({ insetsTop }: { insetsTop: number }) {
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
  const [directMessages, setDirectMessages] = useState<ChatMessage[]>([]);

  // Calculate total unread messages
  const totalUnread = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [conversations]);

  // Subscribe to service updates
  useEffect(() => {
    const unsub = CommunityService.subscribe(() => {
      setPosts(CommunityService.getPosts());
      setConversations(CommunityService.getConversations());
      if (directChatTarget) {
        setDirectMessages(
          CommunityService.getDirectMessages(directChatTarget.id),
        );
      }
    });
    return unsub;
  }, [directChatTarget]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setPosts(CommunityService.getPosts());
      setConversations(CommunityService.getConversations());
      setRefreshing(false);
    }, 500);
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

  const handleCreatePost = (data: {
    dishName: string;
    content: string;
    images: any[];
    tags: string[];
  }) => {
    CommunityService.createPost(data);
    Alert.alert("Thành công", "Bài viết của bạn đã được đăng lên cộng đồng!");
  };

  const handleAddComment = (postId: string, text: string) => {
    CommunityService.addComment(postId, text);
    const updatedPost = CommunityService.getPosts().find(
      (p) => p.id === postId,
    );
    if (updatedPost) {
      setActiveCommentPost(updatedPost);
    }
  };

  // Open direct 1-1 chat with a user
  const handleOpenDirectChat = (author: CommunityAuthor) => {
    CommunityService.markConversationAsRead(author.id);
    setDirectChatTarget(author);
    setDirectMessages(CommunityService.getDirectMessages(author.id));
  };

  const handleSendDirectMessage = (text: string, imageUri?: string) => {
    if (!directChatTarget) return;
    CommunityService.sendDirectMessage(directChatTarget, text, imageUri);
  };

  return (
    <View style={styles.container}>
      {/* 1. Header with Title, Search Icon, Messenger Icon & Avatar */}
      <View style={[styles.header, { paddingTop: insetsTop + 8 }]}>
        <View style={styles.headerTop}>
          <View>
            <View style={styles.subtitleRow}>
              <MaterialCommunityIcons
                name="account-group"
                size={14}
                color={BrandColors.primary}
              />
              <Text style={styles.headerSubtitle}>CỘNG ĐỒNG BẾP SMARTCOOK</Text>
            </View>
            <Text style={styles.headerTitle}>Giao Lưu &amp; Học Hỏi</Text>
          </View>

          {/* Right Action Buttons: Search Icon + Messenger Icon + User Avatar */}
          <View style={styles.headerActionsRight}>
            {/* Search Icon Button */}
            <TouchableOpacity
              style={[
                styles.headerActionBtn,
                isSearchOpen && styles.headerActionBtnActive,
              ]}
              activeOpacity={0.75}
              onPress={() => {
                setIsSearchOpen(!isSearchOpen);
                if (isSearchOpen) {
                  setSearchQuery("");
                }
              }}
            >
              <Ionicons
                name={isSearchOpen ? "close" : "search"}
                size={20}
                color={isSearchOpen ? BrandColors.primary : "#0F172A"}
              />
            </TouchableOpacity>

            {/* Messenger Icon Button */}
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

            {/* User Avatar */}
            <TouchableOpacity
              style={styles.myAvatarBtn}
              activeOpacity={0.8}
              onPress={() => setShowCreateModal(true)}
            >
              <Image source={CURRENT_USER.avatar} style={styles.myAvatar} />
              <View style={styles.onlineDot} />
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

      {/* 2. Community Feed Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[BrandColors.primary]}
          />
        }
        contentContainerStyle={styles.scrollContent}
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
            <View style={styles.createPostInputPlaceholder}>
              <Text style={styles.createPostPlaceholderText}>
                Hôm nay bạn nấu món gì? Khoe ngay...
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.createPostDivider} />

          {/* Quick Action Buttons: Khoe ảnh món & Nút Đăng Bài */}
          <View style={styles.createPostActionsRow}>
            <TouchableOpacity
              style={styles.actionPill}
              activeOpacity={0.7}
              onPress={() => setShowCreateModal(true)}
            >
              <View
                style={[
                  styles.actionIconCircle,
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
                  onPress={() => setSelectedTag(tag)}
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
              onTagPress={(tag) => setSelectedTag(tag)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Chưa tìm thấy bài viết</Text>
            <Text style={styles.emptySubtitle}>
              Thử tìm với từ khóa khác hoặc hãy là người đầu tiên đăng tải món
              này nhé!
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
        onClose={() => setDirectChatTarget(null)}
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
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 10.5,
    fontWeight: "700",
    color: BrandColors.primary,
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerActionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  headerActionBtnActive: {
    backgroundColor: "#FFF3E0",
    borderWidth: 1,
    borderColor: BrandColors.primaryLight,
  },
  headerSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 10,
    height: 40,
  },
  messengerBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  messengerBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  myAvatarBtn: {
    position: "relative",
  },
  myAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: BrandColors.primaryLight,
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  createPostCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  createPostTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  createPostAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: "#FFF3E0",
  },
  createPostInputPlaceholder: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  createPostPlaceholderText: {
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
    paddingHorizontal: 6,
  },
  actionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPillText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#475569",
  },
  publishPostBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 5,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  publishPostBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  filterSection: {
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    paddingVertical: Platform.OS === "android" ? 4 : 0,
    fontWeight: "500",
  },
  clearBtn: {
    padding: 4,
    marginLeft: 4,
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
