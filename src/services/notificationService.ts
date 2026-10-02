import apiClient, { ApiResponse } from "./apiClient";
import { AppNotification, NotificationListResponse } from "@/types";
import { socketService } from "./socketService";
import { triggerHaptic } from "@/utils/haptics";

type NotificationListener = (notification: AppNotification) => void;
type UnreadCountListener = (count: number) => void;

class NotificationServiceClass {
  private unreadCount: number = 0;
  private notificationListeners: Set<NotificationListener> = new Set();
  private unreadCountListeners: Set<UnreadCountListener> = new Set();
  private isSocketListening: boolean = false;

  constructor() {
    this.initRealtimeListener();
  }

  /**
   * Khởi tạo lắng nghe sự kiện thông báo realtime từ Socket.io Gateway
   */
  public initRealtimeListener() {
    if (this.isSocketListening) return;
    this.isSocketListening = true;

    socketService.onNewNotification((notif: AppNotification) => {
      console.log("🔔 [NotificationService] Realtime notification received:", notif?.title);
      this.unreadCount += 1;
      this.notifyUnreadCount();
      this.notificationListeners.forEach((listener) => {
        try {
          listener(notif);
        } catch (e) {
          console.error("Error in notification listener:", e);
        }
      });

      // Kích hoạt rung phản hồi xúc giác
      triggerHaptic("medium");
    });
  }

  /**
   * Đăng ký nhận thông báo realtime mới
   */
  subscribeNewNotification(listener: NotificationListener): () => void {
    this.notificationListeners.add(listener);
    this.initRealtimeListener();
    return () => {
      this.notificationListeners.delete(listener);
    };
  }

  /**
   * Đăng ký theo dõi số lượng thông báo chưa đọc
   */
  subscribeUnreadCount(listener: UnreadCountListener): () => void {
    this.unreadCountListeners.add(listener);
    listener(this.unreadCount);
    return () => {
      this.unreadCountListeners.delete(listener);
    };
  }

  private notifyUnreadCount() {
    this.unreadCountListeners.forEach((cb) => {
      try {
        cb(this.unreadCount);
      } catch (e) {
        console.error("Error in unread count callback:", e);
      }
    });
  }

  getUnreadCount(): number {
    return this.unreadCount;
  }

  /**
   * Lấy danh sách thông báo phân trang từ Backend
   */
  async getNotifications(page: number = 1, limit: number = 20): Promise<NotificationListResponse> {
    try {
      this.initRealtimeListener();
      const response = await apiClient.get<ApiResponse<NotificationListResponse>>(
        "/notifications",
        { params: { page, limit } }
      );

      if (response.data?.success && response.data.data) {
        const data = response.data.data;
        const normalizedList: AppNotification[] = (data.notifications || []).map((n: any) => ({
          id: n.id || n._id,
          title: n.title,
          body: n.body,
          type: n.type || "system",
          data: n.data || {},
          isRead: Boolean(n.isRead),
          createdAt: n.createdAt,
        }));

        this.unreadCount = data.unreadCount ?? normalizedList.filter((x) => !x.isRead).length;
        this.notifyUnreadCount();

        return {
          notifications: normalizedList,
          total: data.total || normalizedList.length,
          unreadCount: this.unreadCount,
        };
      }
    } catch (error) {
      console.warn("Lỗi tải thông báo từ Backend, sử dụng danh sách cục bộ:", error);
    }

    return {
      notifications: [],
      total: 0,
      unreadCount: 0,
    };
  }

  /**
   * Đánh dấu 1 thông báo là đã đọc
   */
  async markAsRead(id: string): Promise<boolean> {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      if (this.unreadCount > 0) {
        this.unreadCount -= 1;
        this.notifyUnreadCount();
      }
      return true;
    } catch (error) {
      console.warn(`Lỗi đánh dấu đã đọc thông báo ${id}:`, error);
      return false;
    }
  }

  /**
   * Đánh dấu tất cả thông báo là đã đọc
   */
  async markAllAsRead(): Promise<boolean> {
    try {
      await apiClient.patch("/notifications/read-all");
      this.unreadCount = 0;
      this.notifyUnreadCount();
      return true;
    } catch (error) {
      console.warn("Lỗi đánh dấu đã đọc tất cả thông báo:", error);
      return false;
    }
  }

  /**
   * Xóa một thông báo
   */
  async deleteNotification(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/notifications/${id}`);
      return true;
    } catch (error) {
      console.warn(`Lỗi xóa thông báo ${id}:`, error);
      return false;
    }
  }
}

export const notificationService = new NotificationServiceClass();
export default notificationService;
