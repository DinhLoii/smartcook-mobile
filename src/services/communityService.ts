import {
  ChatMessage,
  ChatRoom,
  CommunityAuthor,
  CommunityComment,
  CommunityPost,
  DirectConversation,
} from "@/types";
import { apiClient, type ApiResponse } from "./apiClient";
import { socketService, type RealtimeMessage } from "./socketService";
import { tokenStorage } from "@/utils/tokenStorage";

type Listener = () => void;

export const CURRENT_USER: CommunityAuthor = {
  id: "user-me",
  name: "Bếp Của Tôi",
  avatar: require("@/assets/images/smartcook-auth-bg.jpg"),
  badge: "Đầu Bếp Tại Gia",
  isChef: true,
};

// Initialize CURRENT_USER with real logged-in user if available
tokenStorage.getUser().then((user) => {
  if (user?.id) {
    CURRENT_USER.id = user.id;
  }
  if (user?.fullName || (user?.firstName && user?.lastName)) {
    CURRENT_USER.name = user.fullName || `${user.firstName} ${user.lastName}`.trim();
  }
}).catch(() => {});

const INITIAL_POSTS: CommunityPost[] = [
  {
    id: "post-1",
    author: {
      id: "chef-lan",
      name: "Lan Anh Nguyễn",
      avatar: require("@/assets/images/hero-teriyaki-bowl.jpg"),
      badge: "Master Chef",
      isChef: true,
    },
    dishName: "Cơm Bò Teriyaki Hảo Hạng",
    content:
      "Hôm nay mình nấu thử công thức Teriyaki sốt mè mới học từ SmartCook! Bí quyết là áp chảo lửa lớn 3 phút mỗi mặt để thịt mềm mọng nước, sau đó rưới sốt đảo đều cho sốt sánh kẹo. Cả nhà ai cũng khen nức nở 😍 Ai muốn công thức chi tiết comment mình gửi nhé!",
    images: [require("@/assets/images/hero-teriyaki-bowl.jpg")],
    tags: ["#KhoeMonNgon", "#BiQuyet", "#MonNhanh"],
    likesCount: 142,
    isLiked: false,
    isSaved: true,
    commentsCount: 18,
    createdAt: "15 phút trước",
    comments: [
      {
        id: "c-1",
        author: {
          id: "u-2",
          name: "Hoàng Minh",
          avatar: require("@/assets/images/steak-asparagus.jpg"),
          badge: "Yêu Bếp",
        },
        content: "Nhìn thèm quá chị ơi! Cho em hỏi sốt Teriyaki chị mua sẵn hay tự pha tỉ lệ xì dầu - mirin thế nào ạ?",
        createdAt: "10 phút trước",
        likesCount: 3,
      },
    ],
  },
  {
    id: "post-2",
    author: {
      id: "chef-quoc",
      name: "Quốc Bảo FitLife",
      avatar: require("@/assets/images/salad-salmon.jpg"),
      badge: "Chuyên Gia Eat Clean",
      isChef: false,
    },
    dishName: "Salad Cá Hồi Áp Chảo Sốt Cam Chanh",
    content:
      "Bữa tối 420 calo siêu healthy cho những ngày muốn thanh lọc cơ thể 🥑🥗 Cá hồi Nauy áp chảo mặt da giòn rụm, kết hợp xà lách romaine và sốt cam chanh chua ngọt giải ngấy tuyệt đối!",
    images: [require("@/assets/images/salad-salmon.jpg")],
    tags: ["#HealthyEatClean", "#MonNgonMoiNgay", "#GiamCanKhoaHoc"],
    likesCount: 98,
    isLiked: true,
    isSaved: false,
    commentsCount: 7,
    createdAt: "1 giờ trước",
    comments: [],
  },
];

const INITIAL_ROOMS: ChatRoom[] = [
  {
    id: "room-quick-cook",
    title: "Góc Chia Sẻ Mẹo Nấu Nhanh",
    description: "Kinh nghiệm sơ chế nguyên liệu, mẹo nêm nếm và công thức tiết kiệm thời gian",
    iconName: "flash-outline",
    tags: ["Mẹo vặt", "Nấu nhanh", "Bếp gọn"],
    activeMembers: 342,
    lastMessage: "Chị em cho mình hỏi bí quyết luộc lòng heo giòn trắng với ạ!",
    lastMessageTime: "2 phút trước",
    unreadCount: 3,
    isAiBot: false,
  },
  {
    id: "room-eat-clean",
    title: "Hội Ăn Chay & Eat Clean",
    description: "Trao đổi thực đơn lành mạnh, giảm calo, đồ thuần chay đủ chất dinh dưỡng",
    iconName: "leaf-outline",
    tags: ["Eat Clean", "Thuần chay", "Keto"],
    activeMembers: 518,
    lastMessage: "Bữa trưa hôm nay: Đậu hũ sốt cà chua nấm hương và quinoa dẻo thơm.",
    lastMessageTime: "8 phút trước",
    unreadCount: 0,
    isAiBot: false,
  },
  {
    id: "room-ask-chef",
    title: "Hỏi Đáp Cùng Bếp Trưởng",
    description: "Giải đáp kỹ thuật nấu nướng nâng cao, nhiệt độ sous-vide, kỹ năng dùng dao chuyên nghiệp",
    iconName: "school-outline",
    tags: ["Bếp trưởng", "Kỹ thuật", "Hỏi đáp"],
    activeMembers: 189,
    lastMessage: "Bít tết Ribeye nên để nhiệt độ lõi bao nhiêu là Medium Rare chuẩn nhất?",
    lastMessageTime: "15 phút trước",
    unreadCount: 0,
    isAiBot: false,
  },
];

class CommunityServiceClass {
  private posts: CommunityPost[] = [...INITIAL_POSTS];
  private conversations: DirectConversation[] = [];
  private chatUserId: string | undefined;
  private chatSession = 0;
  private activeConversationId = "";
  private chatRooms: ChatRoom[] = [...INITIAL_ROOMS];
  private messages: Record<string, ChatMessage[]> = {};
  private listeners: Set<Listener> = new Set();
  private hasFetchedPosts = false;
  private hasFetchedRooms = false;

  constructor() {
    // Listen for realtime messages from Socket.io to keep active conversations updated
    socketService.onNewMessage((msg) => {
      this.handleIncomingRealtimeMessage(msg);
    });
  }

  /**
   * Helper to format relative friendly time
   */
  private formatRelativeTime(dateInput?: string | Date): string {
    if (!dateInput) return "Vừa xong";
    const now = new Date();
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "Vừa xong";
    const diffMs = now.getTime() - d.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return "Vừa xong";
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Hôm qua";
    return `${diffDays} ngày trước`;
  }

  /**
   * Normalize an image source into React Native format
   */
  private normalizeImage(img: any): any {
    if (!img) return require("@/assets/images/hero-teriyaki-bowl.jpg");
    if (typeof img === "number") return img; // require asset
    if (typeof img === "string") return { uri: img };
    if (typeof img === "object" && img.url) return { uri: img.url };
    if (typeof img === "object" && img.uri) return img;
    return require("@/assets/images/hero-teriyaki-bowl.jpg");
  }

  /**
   * Normalize author object from backend
   */
  private normalizeAuthor(authorData: any): CommunityAuthor {
    if (!authorData) return CURRENT_USER;
    const id = authorData.id || authorData._id || "unknown";
    const name =
      authorData.name ||
      authorData.fullName ||
      `${authorData.firstName || ""} ${authorData.lastName || ""}`.trim() ||
      "Đầu bếp SmartCook";
    const avatar = authorData.avatar
      ? typeof authorData.avatar === "string"
        ? { uri: authorData.avatar }
        : authorData.avatar
      : require("@/assets/images/smartcook-auth-bg.jpg");

    return {
      id,
      name,
      avatar,
      badge: authorData.badge || authorData.level || "Đầu Bếp Tại Gia",
      isChef: authorData.isChef ?? (authorData.level === "Bếp trưởng" || authorData.level === "Đầu bếp tài ba"),
    };
  }

  /**
   * Normalize a post from backend DTO
   */
  private normalizePost(raw: any): CommunityPost {
    const rawImages = raw.images || raw.imageUrls || [];
    const images = Array.isArray(rawImages) && rawImages.length > 0
      ? rawImages.map((img: any) => this.normalizeImage(img))
      : [require("@/assets/images/hero-teriyaki-bowl.jpg")];

    const rawComments = raw.comments || [];
    const comments: CommunityComment[] = Array.isArray(rawComments)
      ? rawComments.map((c: any) => ({
          id: c.id || c._id || `c-${Date.now()}`,
          author: this.normalizeAuthor(c.author || c.user),
          content: c.content || "",
          createdAt: this.formatRelativeTime(c.createdAt),
          likesCount: c.likesCount || 0,
        }))
      : [];

    return {
      id: raw.id || raw._id || `post-${Date.now()}`,
      author: this.normalizeAuthor(raw.author || raw.user),
      dishName: raw.dishName || raw.title || "Món Ngon Tự Nấu",
      content: raw.content || raw.caption || "",
      images,
      tags: Array.isArray(raw.tags) && raw.tags.length > 0 ? raw.tags : ["#KhoeMonNgon"],
      likesCount: raw.likesCount ?? (raw.totalReactions || 0),
      isLiked: !!raw.isLiked,
      isSaved: !!raw.isSaved,
      commentsCount: raw.commentsCount ?? comments.length,
      comments,
      createdAt: this.formatRelativeTime(raw.createdAt),
      recipeId: raw.recipeId,
    };
  }

  /**
   * Handle incoming message from Socket.io Gateway
   */
  private handleIncomingRealtimeMessage(msg: RealtimeMessage) {
    if (this.chatUserId && msg.id && msg.conversationId) this.storeChatMessage(msg.conversationId, msg);
  }

  private normalizeChatMessage(message: RealtimeMessage): ChatMessage {
    const sender = this.normalizeAuthor(message.sender);
    return {
      id: message.id,
      sender,
      text: message.text || "",
      imageUri: message.imageUri,
      timestamp: message.timestamp,
      isMe: sender.id === this.chatUserId,
    };
  }

  private storeChatMessage(conversationId: string, message: RealtimeMessage) {
    const messages = this.messages[conversationId] ?? [];
    if (messages.some((item) => item.id === message.id)) return;

    const normalized = this.normalizeChatMessage(message);
    this.messages[conversationId] = [...messages, normalized];
    const conversation = this.conversations.find((item) => item.conversationId === conversationId);
    if (conversation) {
      const incoming = !normalized.isMe && this.activeConversationId !== conversationId;
      this.conversations = [{
        ...conversation,
        lastMessage: normalized.text || "[Hình ảnh]",
        lastMessageTime: "Vừa xong",
        unreadCount: conversation.unreadCount + Number(incoming),
      }, ...this.conversations.filter((item) => item !== conversation)];
    } else {
      void this.fetchConversations().catch(() => {});
    }
    this.notify();
  }

  /**
   * Fetch posts from backend API (GET /api/v1/community/posts)
   */
  async fetchPosts(filter?: { page?: number; limit?: number; tag?: string; search?: string }): Promise<CommunityPost[]> {
    try {
      const params: any = {
        page: filter?.page || 1,
        limit: filter?.limit || 20,
      };
      if (filter?.tag && filter.tag !== "Tất cả") {
        params.tag = filter.tag.replace(/^#/, "");
      }
      if (filter?.search) {
        params.search = filter.search;
      }

      const res = await apiClient.get("/community/posts", { params });
      const data = res.data?.data;
      const rawPosts = Array.isArray(data) ? data : data?.posts;

      if (Array.isArray(rawPosts)) {
        const normalized = rawPosts.map((p: any) => this.normalizePost(p));
        this.posts = normalized;
        this.hasFetchedPosts = true;
        this.notify();
        return normalized;
      }
    } catch (e) {
      console.warn("⚠️ [CommunityService] Không thể tải bài viết từ API, dùng dữ liệu sẵn có:", e);
    }

    return [...this.posts];
  }

  /**
   * Synchronous getter for posts (for UI subscription)
   */
  getPosts(): CommunityPost[] {
    if (!this.hasFetchedPosts) {
      this.fetchPosts().catch(() => {});
    }
    return [...this.posts];
  }

  /**
   * Create a new community post (POST /api/v1/community/posts) -> User receives +20 XP
   */
  async createPost(data: {
    dishName: string;
    content: string;
    images: any[];
    tags: string[];
    recipeId?: string;
  }): Promise<CommunityPost> {
    const finalContent =
      data.content?.trim() ||
      data.dishName?.trim() ||
      "Món ngon tự nấu chia sẻ cùng cả nhà! 🍲";
    const finalDishName = data.dishName?.trim() || "Món Ngon Tự Nấu";
    const finalTags =
      data.tags && data.tags.length > 0 ? data.tags : ["#KhoeMonNgon"];

    try {
      // Extract pure string URLs if available
      const imageUrls: string[] = [];
      data.images.forEach((img) => {
        if (typeof img === "string" && img.startsWith("http")) {
          imageUrls.push(img);
        } else if (img?.url && typeof img.url === "string" && img.url.startsWith("http")) {
          imageUrls.push(img.url);
        } else if (img?.uri && typeof img.uri === "string" && img.uri.startsWith("http")) {
          imageUrls.push(img.uri);
        }
      });

      const payload: any = {
        dishName: finalDishName,
        caption: finalContent,
        content: finalContent,
        tags: finalTags,
        images:
          imageUrls.length > 0
            ? imageUrls
            : [
                "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
              ],
      };
      if (data.recipeId) {
        payload.recipeId = data.recipeId;
      }

      const res = await apiClient.post("/community/posts", payload);
      if (res.data?.success && res.data?.data) {
        const created = this.normalizePost(res.data.data);
        this.posts.unshift(created);
        this.notify();
        return created;
      }
    } catch (e: any) {
      console.warn(
        "⚠️ [CommunityService] Lỗi tạo bài đăng qua API, fallback lưu tạm:",
        e?.response?.data || e?.message || e
      );
    }

    // Local optimistic fallback
    const newPost: CommunityPost = {
      id: `post-${Date.now()}`,
      author: CURRENT_USER,
      dishName: finalDishName,
      content: finalContent,
      images:
        data.images.length > 0
          ? data.images
          : [require("@/assets/images/hero-teriyaki-bowl.jpg")],
      tags: finalTags,
      likesCount: 1,
      isLiked: true,
      isSaved: false,
      commentsCount: 0,
      createdAt: "Vừa xong",
      comments: [],
      recipeId: data.recipeId,
    };

    this.posts.unshift(newPost);
    this.notify();
    return newPost;
  }

  /**
   * Toggle like post with Optimistic Update (POST /api/v1/community/posts/:id/like)
   */
  async toggleLikePost(postId: string): Promise<void> {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) return;

    const previousLiked = post.isLiked;
    const previousLikesCount = post.likesCount;

    // 1. Optimistic Update
    post.isLiked = !previousLiked;
    post.likesCount = post.isLiked ? previousLikesCount + 1 : Math.max(0, previousLikesCount - 1);
    this.notify();

    // 2. Sync with Backend
    try {
      const res = await apiClient.post(`/community/posts/${postId}/like`);
      if (res.data?.success && res.data?.data) {
        const backendData = res.data.data;
        post.isLiked = backendData.isLiked ?? post.isLiked;
        post.likesCount = backendData.likesCount ?? backendData.totalReactions ?? post.likesCount;
        this.notify();
      }
    } catch (e) {
      console.warn("⚠️ [CommunityService] Lỗi toggle like qua API, rollback:", e);
      post.isLiked = previousLiked;
      post.likesCount = previousLikesCount;
      this.notify();
    }
  }

  /**
   * React to post with specific emotion type (POST /api/v1/community/posts/:id/react)
   */
  async reactToPost(
    postId: string,
    reactionType: "like" | "love" | "haha" | "wow" | "sad" | "angry"
  ): Promise<void> {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) return;

    post.isLiked = true;
    (post as any).userReaction = reactionType;
    this.notify();

    try {
      const res = await apiClient.post(`/community/posts/${postId}/react`, {
        type: reactionType,
      });
      if (res.data?.success && res.data?.data) {
        const backendData = res.data.data;
        post.likesCount = backendData.totalReactions ?? post.likesCount;
        this.notify();
      }
    } catch (e) {
      console.warn("⚠️ [CommunityService] Lỗi react qua API:", e);
    }
  }


  /**
   * Toggle saved state of post
   */
  toggleSavePost(postId: string): void {
    const post = this.posts.find((p) => p.id === postId);
    if (post) {
      post.isSaved = !post.isSaved;
      this.notify();
    }
  }

  /**
   * Add a comment to post (POST /api/v1/community/posts/:id/comments) -> User receives +5 XP
   */
  async addComment(postId: string, content: string, parentCommentId?: string): Promise<CommunityComment | null> {
    const text = content.trim();
    if (!text) return null;

    const post = this.posts.find((p) => p.id === postId);
    if (!post) return null;

    try {
      const res = await apiClient.post(`/community/posts/${postId}/comments`, {
        content: text,
        parentCommentId,
      });

      if (res.data?.success && res.data?.data) {
        const c = res.data.data;
        const newComment: CommunityComment = {
          id: c.id || c._id || `c-${Date.now()}`,
          author: this.normalizeAuthor(c.author || c.user),
          content: c.content || text,
          createdAt: "Vừa xong",
          likesCount: 0,
        };

        post.comments.push(newComment);
        post.commentsCount += 1;
        this.notify();
        return newComment;
      }
    } catch (e) {
      console.warn("⚠️ [CommunityService] Lỗi gửi bình luận qua API, fallback lưu tạm:", e);
    }

    // Local optimistic fallback
    const newComment: CommunityComment = {
      id: `c-${Date.now()}`,
      author: CURRENT_USER,
      content: text,
      createdAt: "Vừa xong",
      likesCount: 0,
    };

    post.comments.push(newComment);
    post.commentsCount += 1;
    this.notify();
    return newComment;
  }

  /**
   * Fetch comments for a post (GET /api/v1/community/posts/:id/comments)
   */
  async fetchComments(postId: string): Promise<CommunityComment[]> {
    try {
      const res = await apiClient.get(`/community/posts/${postId}/comments`);
      const data = res.data?.data;
      const rawComments = Array.isArray(data) ? data : data?.comments;

      if (Array.isArray(rawComments)) {
        const comments = rawComments.map((c: any) => ({
          id: c.id || c._id,
          author: this.normalizeAuthor(c.author || c.user),
          content: c.content || "",
          createdAt: this.formatRelativeTime(c.createdAt),
          likesCount: c.likesCount || 0,
        }));

        const post = this.posts.find((p) => p.id === postId);
        if (post) {
          post.comments = comments;
          post.commentsCount = comments.length;
          this.notify();
        }

        return comments;
      }
    } catch (e) {
      console.warn("⚠️ [CommunityService] Lỗi lấy danh sách bình luận:", e);
    }

    const post = this.posts.find((p) => p.id === postId);
    return post ? post.comments : [];
  }

  /**
   * Delete post (DELETE /api/v1/community/posts/:id)
   */
  async deletePost(postId: string): Promise<boolean> {
    try {
      const res = await apiClient.delete(`/community/posts/${postId}`);
      if (res.data?.success) {
        this.posts = this.posts.filter((p) => p.id !== postId);
        this.notify();
        return true;
      }
    } catch (e) {
      console.warn("⚠️ [CommunityService] Lỗi xoá bài đăng:", e);
    }
    return false;
  }

  /**
   * Fetch community chat rooms from backend (GET /api/v1/chat/rooms)
   */
  async fetchChatRooms(): Promise<ChatRoom[]> {
    try {
      const res = await apiClient.get("/chat/rooms");
      const list = res.data?.data;
      if (Array.isArray(list) && list.length > 0) {
        this.chatRooms = list.map((r: any) => ({
          id: r.id || r._id || `room-${Date.now()}`,
          title: r.title || "Phòng Chat Ẩm Thực",
          description: r.description || "",
          iconName: r.iconName || "chatbubbles-outline",
          activeMembers: r.activeMembers || 150,
          lastMessage: r.lastMessage || "Tham gia thảo luận cùng mọi người!",
          lastMessageTime: r.lastMessageTime || "Vừa xong",
          unreadCount: r.unreadCount || 0,
          isAiBot: r.isAiBot || false,
          tags: Array.isArray(r.tags) ? r.tags : ["Cộng đồng"],
        }));
        this.hasFetchedRooms = true;
        this.notify();
        return this.chatRooms;
      }
    } catch (e) {
      console.warn("⚠️ [CommunityService] Lỗi lấy danh sách phòng chat, dùng dữ liệu mặc định:", e);
    }
    return [...this.chatRooms];
  }

  /**
   * Synchronous getter for chat rooms
   */
  getChatRooms(): ChatRoom[] {
    if (!this.hasFetchedRooms) {
      this.fetchChatRooms().catch(() => {});
    }
    return [...this.chatRooms];
  }

  setChatUser(userId?: string) {
    if (this.chatUserId === userId) return;
    this.setActiveConversation("");
    this.chatUserId = userId;
    this.chatSession++;
    this.conversations = [];
    this.messages = {};
  }

  setActiveConversation(conversationId: string) {
    if (this.activeConversationId === conversationId) return;
    if (this.activeConversationId) socketService.leaveRoom(this.activeConversationId);
    this.activeConversationId = conversationId;
    if (!conversationId) return;
    socketService.joinRoom(conversationId);
    this.conversations = this.conversations.map((conversation) =>
      conversation.conversationId === conversationId ? { ...conversation, unreadCount: 0 } : conversation);
    this.notify();
  }

  async fetchConversations(): Promise<DirectConversation[]> {
    const session = this.chatSession;
    const { data } = await apiClient.get<ApiResponse<DirectConversation[]>>("/chat/conversations");
    if (session !== this.chatSession) return [];
    if (!data?.success || !Array.isArray(data.data)) throw new Error("Không tải được hộp thư.");
    const uniqueConversations = new Map<string, DirectConversation>();
    for (const conversation of data.data) {
      if (conversation.conversationId && !uniqueConversations.has(conversation.conversationId)) {
        uniqueConversations.set(conversation.conversationId, conversation);
      }
    }
    this.conversations = Array.from(uniqueConversations.values(), (conversation) => ({
      ...conversation,
      user: this.normalizeAuthor(conversation.user),
      unreadCount: conversation.conversationId === this.activeConversationId ? 0
        : this.conversations.find((item) => item.conversationId === conversation.conversationId)?.unreadCount
          ?? (this.messages[conversation.conversationId]?.filter((message) => !message.isMe).length || conversation.unreadCount),
    }));
    this.notify();
    return this.getConversations();
  }

  getConversations(): DirectConversation[] {
    return [...this.conversations];
  }

  async getOrCreateDirectChat(targetUserId: string): Promise<DirectConversation> {
    const session = this.chatSession;
    const { data } = await apiClient.post<ApiResponse<DirectConversation>>("/chat/direct", { targetUserId });
    if (session !== this.chatSession || !data?.success || !data.data?.conversationId) {
      throw new Error("Không mở được cuộc trò chuyện.");
    }
    const existing = this.conversations.find((item) => item.conversationId === data.data.conversationId);
    if (existing) return existing;
    const conversation = { ...data.data, user: this.normalizeAuthor(data.data.user), unreadCount: 0, isOnline: false };
    this.conversations = [conversation, ...this.conversations];
    this.notify();
    return conversation;
  }

  async fetchMessageHistory(conversationId: string): Promise<ChatMessage[]> {
    const session = this.chatSession;
    const previousIds = new Set(this.messages[conversationId]?.map((message) => message.id));
    const { data } = await apiClient.get<ApiResponse<RealtimeMessage[]>>("/chat/conversations/" + conversationId + "/messages");
    if (session !== this.chatSession) return [];
    if (!data?.success || !Array.isArray(data.data)) throw new Error("Không tải được tin nhắn.");
    const history = data.data.map((message) => this.normalizeChatMessage(message));
    const historyIds = new Set(history.map((message) => message.id));
    const arrived = (this.messages[conversationId] ?? []).filter((message) =>
      !previousIds.has(message.id) && !historyIds.has(message.id));
    this.messages[conversationId] = [...history, ...arrived];
    this.notify();
    return this.getDirectMessages(conversationId);
  }

  getDirectMessages(conversationId: string): ChatMessage[] {
    return [...(this.messages[conversationId] ?? [])];
  }

  async sendDirectMessage(conversationId: string, text: string, imageUri?: string): Promise<void> {
    const session = this.chatSession;
    const { data } = await apiClient.post<ApiResponse<RealtimeMessage>>(
      "/chat/conversations/" + conversationId + "/messages", { text: text.trim(), imageUri });
    if (session !== this.chatSession || !data?.success || !data.data?.id) {
      throw new Error("Chưa gửi được tin nhắn.");
    }
    this.storeChatMessage(conversationId, data.data);
  }

  /**
   * Observer pattern subscription
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        console.error("CommunityService listener error:", e);
      }
    });
  }
}

export const CommunityService = new CommunityServiceClass();
export default CommunityService;
