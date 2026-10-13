import {
  ChatMessage,
  ChatRoom,
  CommunityAuthor,
  CommunityComment,
  CommunityPost,
  DirectConversation,
} from "@/types";
import { apiClient } from "./apiClient";
import { socketService } from "./socketService";
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

// Initial preset contacts / conversations for Messenger list (fallback)
const INITIAL_CONVERSATIONS: DirectConversation[] = [
  {
    id: "chef-lan",
    user: {
      id: "chef-lan",
      name: "Lan Anh Nguyễn",
      avatar: require("@/assets/images/hero-teriyaki-bowl.jpg"),
      badge: "Master Chef",
      isChef: true,
    },
    lastMessage: "Mình tự pha tỉ lệ: 2 xì dầu Kikkoman + 2 mirin + 1 rượu sake...",
    lastMessageTime: "5 phút trước",
    unreadCount: 1,
    isOnline: true,
  },
  {
    id: "chef-quoc",
    user: {
      id: "chef-quoc",
      name: "Quốc Bảo FitLife",
      avatar: require("@/assets/images/salad-salmon.jpg"),
      badge: "Chuyên Gia Eat Clean",
      isChef: false,
    },
    lastMessage: "Cá hồi bạn áp chảo mặt da 3 phút lửa vừa là giòn rụm nha!",
    lastMessageTime: "25 phút trước",
    unreadCount: 0,
    isOnline: true,
  },
  {
    id: "chef-mai",
    user: {
      id: "chef-mai",
      name: "Mai Anh Cooking",
      avatar: require("@/assets/images/steak-asparagus.jpg"),
      badge: "Đầu Bếp Gia Đình",
      isChef: false,
    },
    lastMessage: "Thịt bò Tenderloin mình mua ở WinMart tươi lắm bạn ơi!",
    lastMessageTime: "1 giờ trước",
    unreadCount: 0,
    isOnline: false,
  },
];

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
  private conversations: DirectConversation[] = [...INITIAL_CONVERSATIONS];
  private chatRooms: ChatRoom[] = [...INITIAL_ROOMS];
  private messages: Record<string, ChatMessage[]> = {};
  private listeners: Set<Listener> = new Set();
  private hasFetchedPosts = false;
  private hasFetchedConversations = false;
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
  private handleIncomingRealtimeMessage(msg: any) {
    const convId = msg.conversationId;
    if (!convId) return;

    const chatMsg: ChatMessage = {
      id: msg.id || `msg-${Date.now()}`,
      sender: this.normalizeAuthor(msg.sender),
      text: msg.text || "",
      imageUri: msg.imageUri,
      timestamp: msg.timestamp || new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      isMe: msg.sender?.id === CURRENT_USER.id,
    };

    if (!this.messages[convId]) {
      this.messages[convId] = [];
    }
    // Prevent duplicate messages
    if (!this.messages[convId].some((m) => m.id === chatMsg.id)) {
      this.messages[convId].push(chatMsg);
    }

    // Update conversation in list
    const conv = this.conversations.find((c) => c.id === convId || (c as any).conversationId === convId);
    if (conv) {
      conv.lastMessage = chatMsg.text || "[Hình ảnh]";
      conv.lastMessageTime = "Vừa xong";
      if (!chatMsg.isMe) {
        conv.unreadCount = (conv.unreadCount || 0) + 1;
      }
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

  /**
   * Fetch direct conversations from backend (GET /api/v1/chat/conversations)
   */
  async fetchConversations(): Promise<DirectConversation[]> {
    try {
      const res = await apiClient.get("/chat/conversations");
      const list = res.data?.data;
      if (Array.isArray(list)) {
        this.conversations = list.map((conv: any) => ({
          id: conv.id || conv._id,
          conversationId: conv.conversationId || conv.id || conv._id,
          user: this.normalizeAuthor(conv.user || conv.targetUser),
          lastMessage: conv.lastMessage || "Bắt đầu cuộc trò chuyện...",
          lastMessageTime: conv.lastMessageTime || "Vừa xong",
          unreadCount: conv.unreadCount || 0,
          isOnline: conv.isOnline ?? true,
        }));
        this.hasFetchedConversations = true;
        this.notify();
        return this.conversations;
      }
    } catch (e) {
      console.warn("⚠️ [CommunityService] Lỗi lấy danh sách hội thoại, dùng dữ liệu sẵn có:", e);
    }
    return [...this.conversations];
  }

  /**
   * Synchronous getter for conversations
   */
  getConversations(): DirectConversation[] {
    if (!this.hasFetchedConversations) {
      this.fetchConversations().catch(() => {});
    }
    return [...this.conversations];
  }

  /**
   * Get or create 1-1 conversation with target user (POST /api/v1/chat/direct)
   */
  async getOrCreateDirectChat(targetUserId: string): Promise<{ conversationId: string; user: CommunityAuthor }> {
    try {
      const res = await apiClient.post("/chat/direct", { targetUserId });
      if (res.data?.success && res.data?.data) {
        const conv = res.data.data;
        const convId = conv.conversationId || conv.id || conv._id;
        const targetUser = this.normalizeAuthor(conv.user || conv.targetUser);

        // Join room on Socket.io for realtime messages
        socketService.joinRoom(convId);

        return {
          conversationId: convId,
          user: targetUser,
        };
      }
    } catch (e) {
      console.warn("⚠️ [CommunityService] Lỗi khởi tạo chat 1-1, dùng fallback key:", e);
    }

    const fallbackKey = `direct-${targetUserId}`;
    socketService.joinRoom(fallbackKey);
    const existing = this.conversations.find((c) => c.id === targetUserId);
    return {
      conversationId: fallbackKey,
      user: existing ? existing.user : { id: targetUserId, name: "Đầu Bếp", avatar: require("@/assets/images/salad-salmon.jpg") },
    };
  }

  /**
   * Fetch message history of a room or conversation (GET /api/v1/chat/conversations/:id/messages)
   */
  async fetchMessageHistory(conversationId: string): Promise<ChatMessage[]> {
    try {
      socketService.joinRoom(conversationId);
      const res = await apiClient.get(`/chat/conversations/${conversationId}/messages`);
      const list = res.data?.data;
      if (Array.isArray(list)) {
        const normalized: ChatMessage[] = list.map((m: any) => {
          const sId = m.sender?.id || m.sender?._id || m.user?._id;
          const isSenderMe =
            typeof m.isMe === "boolean"
              ? m.isMe
              : Boolean(sId && (sId === CURRENT_USER.id || sId === "user-me"));

          return {
            id: m.id || m._id || `m-${Date.now()}`,
            sender: this.normalizeAuthor(m.sender || m.user),
            text: m.text || "",
            imageUri: m.imageUri || m.imageUrl,
            timestamp: m.timestamp || new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
            isMe: isSenderMe,
          };
        });

        this.messages[conversationId] = normalized;
        this.notify();
        return normalized;
      }
    } catch (e) {
      console.warn(`⚠️ [CommunityService] Lỗi lấy lịch sử tin nhắn của ${conversationId}:`, e);
    }

    return this.messages[conversationId] || [];
  }

  /**
   * Get direct messages for conversation
   */
  getDirectMessages(targetUserIdOrConvId: string): ChatMessage[] {
    const key = this.messages[targetUserIdOrConvId]
      ? targetUserIdOrConvId
      : `direct-${targetUserIdOrConvId}`;
    return [...(this.messages[key] || this.messages[targetUserIdOrConvId] || [])];
  }

  /**
   * Send a direct message via Socket.io Realtime (with REST API fallback)
   */
  async sendDirectMessage(
    targetUser: CommunityAuthor,
    text: string,
    imageUri?: string,
    explicitConversationId?: string
  ): Promise<ChatMessage> {
    const cleanText = text.trim();
    const convId = explicitConversationId || `direct-${targetUser.id}`;

    const newMsg: ChatMessage = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sender: CURRENT_USER,
      text: cleanText,
      imageUri,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      isMe: true,
    };

    if (!this.messages[convId]) {
      this.messages[convId] = [];
    }
    this.messages[convId].push(newMsg);

    // Update conversation in list
    const existingIndex = this.conversations.findIndex(
      (c) => c.id === targetUser.id || (c as any).conversationId === convId
    );
    const lastMsgText = `Bạn: ${cleanText || "[Hình ảnh]"}`;

    if (existingIndex >= 0) {
      const conv = this.conversations[existingIndex];
      conv.lastMessage = lastMsgText;
      conv.lastMessageTime = "Vừa xong";
      this.conversations.splice(existingIndex, 1);
      this.conversations.unshift(conv);
    } else {
      this.conversations.unshift({
        id: targetUser.id,
        user: targetUser,
        lastMessage: lastMsgText,
        lastMessageTime: "Vừa xong",
        unreadCount: 0,
        isOnline: true,
      });
    }

    this.notify();

    // 1. Try sending via Realtime Socket
    if (socketService.isConnected()) {
      socketService.sendMessage(convId, cleanText, imageUri, (ack) => {
        if (!ack?.success) {
          console.warn("⚠️ [SocketService] ACK trả về false, fallback REST API:", ack?.error);
          this.sendMessageViaRest(convId, cleanText, imageUri);
        }
      });
    } else {
      // 2. Fallback via REST API
      this.sendMessageViaRest(convId, cleanText, imageUri);
    }

    return newMsg;
  }

  /**
   * REST fallback for sending chat message
   */
  private async sendMessageViaRest(conversationId: string, text: string, imageUri?: string) {
    try {
      await apiClient.post(`/chat/conversations/${conversationId}/messages`, {
        text,
        imageUri,
      });
    } catch (e) {
      console.warn("⚠️ [CommunityService] Gửi tin nhắn qua REST API thất bại:", e);
    }
  }

  /**
   * Mark conversation as read
   */
  markConversationAsRead(targetUserId: string): void {
    const conv = this.conversations.find((c) => c.id === targetUserId);
    if (conv && conv.unreadCount > 0) {
      conv.unreadCount = 0;
      this.notify();
    }
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
