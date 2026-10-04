import ChatRoomModal from "@/components/community/ChatRoomModal";
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
  ChatRoom,
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
  StatusBar,
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
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>(() =>
    CommunityService.getChatRooms(),
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

  // Community Chat Room
  const [activeChatRoom, setActiveChatRoom] = useState<ChatRoom | null>(null);
  const [roomMessages, setRoomMessages] = useState<ChatMessage[]>([]);

  // Calculate total unread messages
  const totalUnread = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [conversations]);

  // Initial connect & fetch from backend
  useEffect(() => {
    socketService.connect();
    CommunityService.fetchPosts({ tag: selectedTag, search: searchQuery });
    CommunityService.fetchConversations();
    CommunityService.fetchChatRooms().then((rooms) => {
      if (rooms && rooms.length > 0) setChatRooms(rooms);
    });
  }, []);

  // Subscribe to service updates
  useEffect(() => {
    const unsub = CommunityService.subscribe(() => {
      setPosts(CommunityService.getPosts());
      setConversations(CommunityService.getConversations());
      setChatRooms(CommunityService.getChatRooms());
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
      // If message belongs to active chat room
      if (activeChatRoom && msg.conversationId === activeChatRoom.id) {
        setRoomMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [
            ...prev,
            {
              id: msg.id,
              sender: msg.sender as any,
              text: msg.text,
              imageUri: msg.imageUri,
              timestamp: msg.timestamp,
              isMe:
                msg.isMe !== undefined
                  ? Boolean(msg.isMe)
                  : msg.sender?.id === CURRENT_USER.id,
            },
          ];
        });
      }

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
  }, [activeChatRoom, directChatTarget, activeConvId]);

  // On refresh with full backend synchronization
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        CommunityService.fetchPosts({ tag: selectedTag, search: searchQuery }),
        CommunityService.fetchConversations(),
        CommunityService.fetchChatRooms(),
      ]);
      setPosts(CommunityService.getPosts());
      setConversations(CommunityService.getConversations());
      setChatRooms(CommunityService.getChatRooms());
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

  // Open community chat room
  const handleOpenChatRoom = async (room: ChatRoom) => {
    setActiveChatRoom(room);
    socketService.joinRoom(room.id);
    const history = await CommunityService.fetchMessageHistory(room.id);
    setRoomMessages(history);
  };

  const handleSendRoomMessage = (text: string, imageUri?: string) => {
    if (!activeChatRoom) return;
    const cleanText = text.trim();
    if (!cleanText && !imageUri) return;

    socketService.sendMessage(activeChatRoom.id, cleanText, imageUri, (res) => {
      if (res?.success && res.data) {
        const msgId =
          res.data.id ||
          res.data._id ||
          `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setRoomMessages((prev) => {
          if (prev.some((m) => m.id === msgId)) return prev;
          return [
            ...prev,
            {
              id: msgId,
              sender: CURRENT_USER,
              text: cleanText,
              imageUri,
              timestamp: new Date().toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              isMe: true,
            },
          ];
        });
      }
    });
  };

  return (
    <View style={styles.container}>
      {/* 1. Header with Title, Search Icon, Messenger Icon & Avatar */}
      <View
        style={[
          styles.header,
          {
            paddingTop:
              Math.max(
                insetsTop,
                Platform.OS === "android" ? (StatusBar.currentHeight || 28) : 20,
              ) + 8,
          },
        ]}
      >
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

        {/* Realtime Community Chat Rooms Carousel */}
        <View style={styles.roomsSection}>
          <View style={styles.roomsHeaderRow}>
            <View style={styles.liveIndicatorRow}>
              <View style={styles.livePulseDot} />
              <Text style={styles.roomsHeaderTitle}>PHÒNG CHAT ẨM THỰC REALTIME</Text>
            </View>
            <Text style={styles.roomsCount}>{chatRooms.length} phòng</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.roomsScrollContent}
          >
            {chatRooms.map((room) => (
              <TouchableOpacity
                key={room.id}
                style={styles.roomCard}
                activeOpacity={0.85}
                onPress={() => handleOpenChatRoom(room)}
              >
                <View style={styles.roomTopRow}>
                  <View style={styles.roomIconBadge}>
                    {room.iconName === "chef-hat" ? (
                      <MaterialCommunityIcons
                        name="chef-hat"
                        size={18}
                        color={BrandColors.primary}
                      />
                    ) : (
                      <Ionicons
                        name={(room.iconName || "chatbubbles") as any}
                        size={18}
                        color={BrandColors.primary}
                      />
                    )}
                  </View>
                  <View style={styles.onlineBadge}>
                    <Ionicons name="people" size={10} color="#059669" />
                    <Text style={styles.onlineBadgeText}>{room.activeMembers}</Text>
                  </View>
                </View>

                <Text style={styles.roomTitle} numberOfLines={1}>
                  {room.title}
                </Text>
                <Text style={styles.roomDesc} numberOfLines={1}>
                  {room.description}
                </Text>

                <View style={styles.roomBottomRow}>
                  <Text style={styles.roomLastMsg} numberOfLines={1}>
                    💬 {room.lastMessage}
                  </Text>
                  <Text style={styles.joinText}>Vào chat →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
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

      {/* Community Realtime Chat Room Window */}
      <ChatRoomModal
        visible={!!activeChatRoom}
        room={activeChatRoom}
        messages={roomMessages}
        onClose={() => {
          if (activeChatRoom) {
            socketService.leaveRoom(activeChatRoom.id);
          }
          setActiveChatRoom(null);
        }}
        onSendMessage={handleSendRoomMessage}
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
    paddingHorizontal: 20,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 10,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 10.5,
    fontWeight: "800",
    color: BrandColors.primary,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
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
  myAvatarBtn: {
    position: "relative",
  },
  myAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: BrandColors.primary,
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
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

  /* Realtime Community Rooms Section */
  roomsSection: {
    marginBottom: 14,
  },
  roomsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  liveIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10B981",
  },
  roomsHeaderTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.5,
  },
  roomsCount: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
  },
  roomsScrollContent: {
    gap: 10,
    paddingVertical: 2,
  },
  roomCard: {
    width: 220,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  roomTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  roomIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
  },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  onlineBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  roomTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  roomDesc: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 8,
  },
  roomBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 6,
  },
  roomLastMsg: {
    fontSize: 10,
    color: "#94A3B8",
    flex: 1,
    marginRight: 6,
  },
  joinText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: BrandColors.primary,
  },

  filterSection: {
    marginBottom: 12,
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
