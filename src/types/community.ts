export interface CommunityAuthor {
  id: string;
  name: string;
  avatar: any; // local require or { uri: string }
  badge?: string; // e.g. "Đầu Bếp Tại Gia", "Chuyên Gia Eat Clean", "Master Chef"
  isChef?: boolean;
}

export interface CommunityComment {
  id: string;
  author: CommunityAuthor;
  content: string;
  createdAt: string;
  likesCount?: number;
}

export interface CommunityPost {
  id: string;
  author: CommunityAuthor;
  dishName: string;
  content: string;
  images: any[]; // local require or { uri: string }
  tags: string[];
  likesCount: number;
  isLiked: boolean;
  isSaved: boolean;
  commentsCount: number;
  comments: CommunityComment[];
  createdAt: string;
  recipeId?: string;
}

export interface ChatMessage {
  id: string;
  sender: CommunityAuthor;
  text: string;
  imageUri?: string;
  timestamp: string;
  isMe: boolean;
}

export interface DirectConversation {
  id: string; // target user id
  conversationId: string;
  user: CommunityAuthor;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
}

export interface ChatRoom {
  id: string;
  title: string;
  description: string;
  iconName: string;
  activeMembers: number;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isAiBot?: boolean;
  tags: string[];
}
