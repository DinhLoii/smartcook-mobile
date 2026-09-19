import {
  ChatMessage,
  ChatRoom,
  CommunityAuthor,
  CommunityComment,
  CommunityPost,
  DirectConversation,
} from "@/types";

type Listener = () => void;

export const CURRENT_USER: CommunityAuthor = {
  id: "user-me",
  name: "Bếp Của Tôi",
  avatar: require("@/assets/images/smartcook-auth-bg.jpg"),
  badge: "Đầu Bếp Tại Gia",
  isChef: true,
};

// Initial preset contacts / conversations for Messenger list
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
  {
    id: "chef-dung",
    user: {
      id: "chef-dung",
      name: "Dũng Trần",
      avatar: require("@/assets/images/pasta-bolognese.jpg"),
      badge: "Mê Nấu Ăn",
      isChef: false,
    },
    lastMessage: "Món mỳ Ý sốt bò bằm làm nhanh lắm, hôm nào bạn thử nhé!",
    lastMessageTime: "3 giờ trước",
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: "u-2",
    user: {
      id: "u-2",
      name: "Hoàng Minh",
      avatar: require("@/assets/images/steak-asparagus.jpg"),
      badge: "Yêu Bếp",
      isChef: false,
    },
    lastMessage: "Cảm ơn bạn đã chỉ mình cách nêm nước sốt nhé ❤️",
    lastMessageTime: "Hôm qua",
    unreadCount: 0,
    isOnline: true,
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
      {
        id: "c-2",
        author: {
          id: "chef-lan",
          name: "Lan Anh Nguyễn",
          avatar: require("@/assets/images/hero-teriyaki-bowl.jpg"),
          badge: "Master Chef",
          isChef: true,
        },
        content: "Mình tự pha tỉ lệ: 2 xì dầu Kikkoman + 2 mirin + 1 rượu sake + 1 đường nâu nha @Hoàng Minh! Đun sôi lăn tăn là thơm lừng.",
        createdAt: "5 phút trước",
        likesCount: 5,
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
    comments: [
      {
        id: "c-3",
        author: {
          id: "u-3",
          name: "Thanh Hằng",
          avatar: require("@/assets/images/crispy-chicken.jpg"),
          badge: "Học Nấu Ăn",
        },
        content: "Làm sao để áp chảo cá hồi mà không bị khô bã bên trong vậy bạn?",
        createdAt: "30 phút trước",
        likesCount: 1,
      },
    ],
  },
  {
    id: "post-3",
    author: {
      id: "chef-mai",
      name: "Mai Anh Cooking",
      avatar: require("@/assets/images/steak-asparagus.jpg"),
      badge: "Đầu Bếp Gia Đình",
      isChef: false,
    },
    dishName: "Bít Tết Bò Tenderloin Kèm Măng Tây Nướng",
    content:
      "Kỷ niệm cuối tuần làm món Âu đổi gió cho ông xã. Miếng thịt bò mềm như bơ ăn kèm bơ tỏi hương thảo thơm nức. Măng tây nướng giữ nguyên độ giòn ngọt. Cả nhà chấm điểm 10/10 luôn ạ!",
    images: [require("@/assets/images/steak-asparagus.jpg")],
    tags: ["#KhoeMonNgon", "#MonAu", "#CuoiTuanVaoBep"],
    likesCount: 215,
    isLiked: false,
    isSaved: false,
    commentsCount: 24,
    createdAt: "3 giờ trước",
    comments: [
      {
        id: "c-4",
        author: {
          id: "u-4",
          name: "Văn Đức",
          avatar: require("@/assets/images/pasta-bolognese.jpg"),
          badge: "Yêu Bếp",
        },
        content: "Nhìn màu thịt medium rare chuẩn nhà hàng 5 sao luôn chị ơi!",
        createdAt: "2 giờ trước",
        likesCount: 4,
      },
    ],
  },
  {
    id: "post-4",
    author: {
      id: "chef-dung",
      name: "Dũng Trần",
      avatar: require("@/assets/images/pasta-bolognese.jpg"),
      badge: "Mê Nấu Ăn",
      isChef: false,
    },
    dishName: "Mỳ Ý Sốt Bò Bằm Phô Mai Parmesan",
    content:
      "Món ăn cứu cánh cho những ngày lười chỉ tốn đúng 20 phút chuẩn bị. Nước sốt cà chua hầm thịt bò bằm đậm đà, rắc thêm phô mai béo ngậy ai cũng mê.",
    images: [require("@/assets/images/pasta-bolognese.jpg")],
    tags: ["#MonNhanh", "#CongThucMoi", "#MienPhi"],
    likesCount: 76,
    isLiked: false,
    isSaved: false,
    commentsCount: 9,
    createdAt: "5 giờ trước",
    comments: [],
  },
];

const INITIAL_DIRECT_MESSAGES: Record<string, ChatMessage[]> = {
  "direct-chef-lan": [
    {
      id: "dm-lan-1",
      sender: {
        id: "chef-lan",
        name: "Lan Anh Nguyễn",
        avatar: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        badge: "Master Chef",
        isChef: true,
      },
      text: "Chào bạn! Mình thấy bạn xem món Cơm Bò Teriyaki. Bạn có thắc mắc gì về công thức không nè?",
      timestamp: "08:10",
      isMe: false,
    },
    {
      id: "dm-lan-2",
      sender: CURRENT_USER,
      text: "Chào chị Lan Anh! Em muốn hỏi mua mirin ở đâu chuẩn vị Nhật ạ?",
      timestamp: "08:12",
      isMe: true,
    },
    {
      id: "dm-lan-3",
      sender: {
        id: "chef-lan",
        name: "Lan Anh Nguyễn",
        avatar: require("@/assets/images/hero-teriyaki-bowl.jpg"),
        badge: "Master Chef",
        isChef: true,
      },
      text: "Mình tự pha tỉ lệ: 2 xì dầu Kikkoman + 2 mirin + 1 rượu sake hoặc bạn ghé Annam Gourmet / WinMart lớn đều có chai Kikkoman Mirin nhé!",
      timestamp: "08:15",
      isMe: false,
    },
  ],
  "direct-chef-quoc": [
    {
      id: "dm-quoc-1",
      sender: {
        id: "chef-quoc",
        name: "Quốc Bảo FitLife",
        avatar: require("@/assets/images/salad-salmon.jpg"),
        badge: "Chuyên Gia Eat Clean",
        isChef: false,
      },
      text: "Cá hồi bạn áp chảo mặt da 3 phút lửa vừa là giòn rụm nha!",
      timestamp: "07:45",
      isMe: false,
    },
  ],
};

class CommunityServiceClass {
  private posts: CommunityPost[] = [...INITIAL_POSTS];
  private conversations: DirectConversation[] = [...INITIAL_CONVERSATIONS];
  private messages: Record<string, ChatMessage[]> = { ...INITIAL_DIRECT_MESSAGES };
  private listeners: Set<Listener> = new Set();

  getPosts(): CommunityPost[] {
    return [...this.posts];
  }

  getConversations(): DirectConversation[] {
    return [...this.conversations];
  }

  getDirectMessages(targetUserId: string): ChatMessage[] {
    const key = `direct-${targetUserId}`;
    return [...(this.messages[key] || [])];
  }

  createPost(data: {
    dishName: string;
    content: string;
    images: any[];
    tags: string[];
  }): CommunityPost {
    const newPost: CommunityPost = {
      id: `post-${Date.now()}`,
      author: CURRENT_USER,
      dishName: data.dishName || "Món Ngon Tự Nấu",
      content: data.content,
      images: data.images.length > 0 ? data.images : [require("@/assets/images/hero-teriyaki-bowl.jpg")],
      tags: data.tags.length > 0 ? data.tags : ["#KhoeMonNgon"],
      likesCount: 1,
      isLiked: true,
      isSaved: false,
      commentsCount: 0,
      createdAt: "Vừa xong",
      comments: [],
    };

    this.posts.unshift(newPost);
    this.notify();
    return newPost;
  }

  toggleLikePost(postId: string): void {
    const post = this.posts.find((p) => p.id === postId);
    if (post) {
      if (post.isLiked) {
        post.isLiked = false;
        post.likesCount = Math.max(0, post.likesCount - 1);
      } else {
        post.isLiked = true;
        post.likesCount += 1;
      }
      this.notify();
    }
  }

  toggleSavePost(postId: string): void {
    const post = this.posts.find((p) => p.id === postId);
    if (post) {
      post.isSaved = !post.isSaved;
      this.notify();
    }
  }

  addComment(postId: string, content: string): CommunityComment | null {
    if (!content.trim()) return null;
    const post = this.posts.find((p) => p.id === postId);
    if (!post) return null;

    const newComment: CommunityComment = {
      id: `c-${Date.now()}`,
      author: CURRENT_USER,
      content: content.trim(),
      createdAt: "Vừa xong",
      likesCount: 0,
    };

    post.comments.push(newComment);
    post.commentsCount += 1;
    this.notify();
    return newComment;
  }

  sendDirectMessage(targetUser: CommunityAuthor, text: string, imageUri?: string): ChatMessage {
    const key = `direct-${targetUser.id}`;
    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: CURRENT_USER,
      text: text.trim(),
      imageUri,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      isMe: true,
    };

    if (!this.messages[key]) {
      this.messages[key] = [];
    }
    this.messages[key].push(newMsg);

    // Update or insert conversation into conversation list
    const existingIndex = this.conversations.findIndex((c) => c.id === targetUser.id);
    const lastMsgText = `Bạn: ${text.trim() || "[Hình ảnh]"}`;

    if (existingIndex >= 0) {
      const conv = this.conversations[existingIndex];
      conv.lastMessage = lastMsgText;
      conv.lastMessageTime = "Vừa xong";
      // Move to top
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

    // Auto reply simulation after 1.5s from the other cook
    setTimeout(() => {
      let reply = `Chào bạn! Cảm ơn bạn đã nhắn tin trao đổi về món ăn nhé ❤️ Mình rất vui được chia sẻ kinh nghiệm nấu nướng cùng bạn!`;
      const queryLower = text.toLowerCase();
      if (queryLower.includes("công thức") || queryLower.includes("gia vị")) {
        reply = `Công thức này mình nêm vừa miệng theo khẩu vị gia đình, bạn có thể gia giảm tiêu hoặc ớt theo ý thích nha!`;
      } else if (queryLower.includes("mua ở đâu") || queryLower.includes("nguyên liệu")) {
        reply = `Nguyên liệu này mình hay ghé siêu thị WinMart hoặc Co.opmart mua buổi sáng rất tươi ngon đó bạn!`;
      } else if (queryLower.includes("nấu") || queryLower.includes("lửa")) {
        reply = `Khi nấu bạn nhớ để lửa vừa để ngấm gia vị, không nên đun lửa quá to nước sốt sẽ dễ bị cạn nhanh nhé!`;
      }

      const replyMsg: ChatMessage = {
        id: `m-reply-${Date.now()}`,
        sender: targetUser,
        text: reply,
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        isMe: false,
      };

      if (!this.messages[key]) {
        this.messages[key] = [];
      }
      this.messages[key].push(replyMsg);

      // Update conversation in list
      const conv = this.conversations.find((c) => c.id === targetUser.id);
      if (conv) {
        conv.lastMessage = reply;
        conv.lastMessageTime = "Vừa xong";
        conv.unreadCount += 1;
      }

      this.notify();
    }, 1500);

    return newMsg;
  }

  markConversationAsRead(targetUserId: string): void {
    const conv = this.conversations.find((c) => c.id === targetUserId);
    if (conv && conv.unreadCount > 0) {
      conv.unreadCount = 0;
      this.notify();
    }
  }

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
