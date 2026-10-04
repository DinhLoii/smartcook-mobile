export type NotificationType =
  | "system"
  | "community"
  | "fridge_expiry"
  | "reward"
  | "planner";

export interface AppNotification {
  id: string;
  _id?: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: AppNotification[];
  total: number;
  unreadCount: number;
}
