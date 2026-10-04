import { io, Socket } from "socket.io-client";
import { ENV } from "@/config/env";
import { tokenStorage } from "@/utils/tokenStorage";

export interface RealtimeMessage {
  id: string;
  conversationId: string;
  sender: {
    id: string;
    name: string;
    avatar: string;
    badge?: string;
    isChef?: boolean;
  };
  text: string;
  imageUri?: string;
  timestamp: string;
  isMe?: boolean;
}

export interface TypingData {
  conversationId: string;
  userId: string;
  userName: string;
}

type MessageListener = (message: RealtimeMessage) => void;
type TypingListener = (data: TypingData) => void;
type StopTypingListener = (data: { conversationId: string; userId: string }) => void;
type NotificationListener = (notification: any) => void;

class SocketService {
  private socket: Socket | null = null;
  private messageListeners = new Set<MessageListener>();
  private typingListeners = new Set<TypingListener>();
  private stopTypingListeners = new Set<StopTypingListener>();
  private notificationListeners = new Set<NotificationListener>();
  private currentJoinedRooms = new Set<string>();

  /**
   * Connect to Socket.io Gateway with JWT authentication
   */
  async connect(explicitToken?: string): Promise<Socket | null> {
    try {
      const token = explicitToken || (await tokenStorage.getAccessToken());
      if (!token) {
        console.warn("⚠️ [SocketService] Không có AccessToken để kết nối WebSocket.");
        return null;
      }

      if (this.socket && this.socket.connected) {
        return this.socket;
      }

      const socketUrl = ENV.SOCKET_BASE_URL;
      console.log(`🔌 [SocketService] Đang kết nối tới ${socketUrl}...`);

      this.socket = io(socketUrl, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
      });

      this.socket.on("connect", () => {
        console.log(`✅ [SocketService] Đã kết nối WebSocket thành công (ID: ${this.socket?.id})`);
        // Rejoin any previously tracked active rooms
        this.currentJoinedRooms.forEach((roomId) => {
          this.socket?.emit("join_room", { conversationId: roomId });
        });
      });

      this.socket.on("connect_error", (err) => {
        console.warn("⚠️ [SocketService] Lỗi kết nối WebSocket:", err.message);
      });

      this.socket.on("disconnect", (reason) => {
        console.log("ℹ️ [SocketService] Đã ngắt kết nối WebSocket:", reason);
      });

      // Global message listener
      this.socket.on("new_message", (data: any) => {
        const msg: RealtimeMessage = {
          id: data.id || data._id || `msg-${Date.now()}`,
          conversationId: data.conversationId,
          sender: data.sender || {
            id: "unknown",
            name: "Người dùng",
            avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
          },
          text: data.text || "",
          imageUri: data.imageUri || data.imageUrl,
          timestamp: data.timestamp || new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
          isMe: false,
        };

        this.messageListeners.forEach((listener) => {
          try {
            listener(msg);
          } catch (e) {
            console.error("Lỗi khi xử lý messageListener:", e);
          }
        });
      });

      // Typing indicators
      this.socket.on("user_typing", (data: TypingData) => {
        this.typingListeners.forEach((listener) => {
          try {
            listener(data);
          } catch (e) {
            console.error("Lỗi khi xử lý typingListener:", e);
          }
        });
      });

      this.socket.on("user_stop_typing", (data: { conversationId: string; userId: string }) => {
        this.stopTypingListeners.forEach((listener) => {
          try {
            listener(data);
          } catch (e) {
            console.error("Lỗi khi xử lý stopTypingListener:", e);
          }
        });
      });

      // Notification listener
      this.socket.on("new_notification", (notif: any) => {
        this.notificationListeners.forEach((listener) => {
          try {
            listener(notif);
          } catch (e) {
            console.error("Lỗi khi xử lý notificationListener:", e);
          }
        });
      });

      return this.socket;
    } catch (e) {
      console.error("❌ [SocketService] Lỗi khởi tạo socket:", e);
      return null;
    }
  }

  /**
   * Disconnect socket cleanly
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentJoinedRooms.clear();
      console.log("🔌 [SocketService] Đã ngắt kết nối socket.");
    }
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return !!(this.socket && this.socket.connected);
  }

  /**
   * Get underlying Socket.io instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Join a room or conversation
   */
  joinRoom(conversationId: string) {
    if (!conversationId) return;
    if (this.currentJoinedRooms.has(conversationId)) {
      return;
    }
    this.currentJoinedRooms.add(conversationId);
    if (this.socket && this.socket.connected) {
      this.socket.emit("join_room", { conversationId });
      console.log(`👥 [SocketService] Đã tham gia phòng: ${conversationId}`);
    }
  }

  /**
   * Leave a room or conversation
   */
  leaveRoom(conversationId: string) {
    if (!conversationId) return;
    this.currentJoinedRooms.delete(conversationId);
    if (this.socket && this.socket.connected) {
      this.socket.emit("leave_room", { conversationId });
      console.log(`👋 [SocketService] Đã rời phòng: ${conversationId}`);
    }
  }

  /**
   * Send realtime message via Socket
   */
  sendMessage(
    conversationId: string,
    text: string,
    imageUri?: string,
    callback?: (res: { success: boolean; data?: any; error?: string }) => void
  ) {
    if (!this.socket || !this.socket.connected) {
      console.warn("⚠️ [SocketService] Socket chưa kết nối, không thể gửi tin nhắn realtime.");
      if (callback) callback({ success: false, error: "Socket not connected" });
      return;
    }

    this.socket.emit(
      "send_message",
      { conversationId, text: text.trim(), imageUri },
      (res: any) => {
        if (callback) callback(res);
      }
    );
  }

  /**
   * Emit typing indicator
   */
  sendTyping(conversationId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit("typing", { conversationId });
    }
  }

  /**
   * Emit stop typing indicator
   */
  sendStopTyping(conversationId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit("stop_typing", { conversationId });
    }
  }

  /**
   * Subscribe to new incoming messages
   */
  onNewMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  /**
   * Subscribe to user typing indicators
   */
  onUserTyping(listener: TypingListener): () => void {
    this.typingListeners.add(listener);
    return () => {
      this.typingListeners.delete(listener);
    };
  }

  /**
   * Subscribe to user stop typing indicators
   */
  onUserStopTyping(listener: StopTypingListener): () => void {
    this.stopTypingListeners.add(listener);
    return () => {
      this.stopTypingListeners.delete(listener);
    };
  }

  /**
   * Subscribe to new incoming realtime notifications
   */
  onNewNotification(listener: NotificationListener): () => void {
    this.notificationListeners.add(listener);
    return () => {
      this.notificationListeners.delete(listener);
    };
  }
}

export const socketService = new SocketService();
export default socketService;
