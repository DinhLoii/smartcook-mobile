import apiClient from "./apiClient";
import {
  CookingCompletionResult,
  CookingHistoryListResponse,
  CookingHistoryRecord,
  RecordCookingPayload,
} from "@/types";

export interface CookingHistoryItem {
  id: string;
  _id?: string;
  recipeId: string;
  recipeName: string;
  image: string;
  cookedAt: string; // Chuỗi hiển thị thân thiện, ví dụ: "Hôm nay, 12:30"
  durationMinutes: number;
  servings: number;
  usedIngredients: string[];
  calories: number;
  rating?: number;
  xpEarned?: number;
}

function formatDisplayDate(dateStr?: string | Date): string {
  if (!dateStr) return "Gần đây";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);

    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");

    if (isToday) {
      return `Hôm nay, ${hours}:${minutes}`;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return `Hôm qua, ${hours}:${minutes}`;
    }

    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    return `${day}/${month}, ${hours}:${minutes}`;
  } catch {
    return "Gần đây";
  }
}

let historyList: CookingHistoryItem[] = [];

type Listener = (items: CookingHistoryItem[]) => void;
const listeners = new Set<Listener>();

const notify = () => {
  listeners.forEach((fn) => {
    try {
      fn([...historyList]);
    } catch (e) {
      console.error("Lỗi listener cooking history:", e);
    }
  });
};

export const CookingHistoryService = {
  /**
   * Lấy danh sách lịch sử hiện có trong bộ nhớ cache
   */
  getHistory: (): CookingHistoryItem[] => {
    return [...historyList];
  },

  /**
   * Tải lịch sử nấu ăn từ Backend MongoDB
   */
  fetchHistory: async (
    page = 1,
    limit = 20
  ): Promise<CookingHistoryItem[]> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: CookingHistoryListResponse;
        message: string;
      }>("/cooking-history", {
        params: { page, limit },
      });

      if (response.data?.success && response.data.data) {
        const rawItems = response.data.data.items || [];
        const mapped: CookingHistoryItem[] = rawItems.map((item: any) => ({
          id: item._id?.toString() || item.id || `hist-${Date.now()}`,
          _id: item._id?.toString(),
          recipeId: item.recipeId?.toString() || "",
          recipeName: item.recipeName || "Món đã nấu",
          image:
            item.image ||
            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80",
          cookedAt: formatDisplayDate(item.cookedAt || item.createdAt),
          durationMinutes: Number(item.durationMinutes) || 20,
          servings: Number(item.servings) || 2,
          usedIngredients: Array.isArray(item.usedIngredients)
            ? item.usedIngredients
            : [],
          calories: Number(item.calories) || 0,
          rating: item.rating,
          xpEarned: item.xpEarned || 50,
        }));

        historyList = mapped;
        notify();
        return mapped;
      }
    } catch (error) {
      console.warn("Lỗi khi tải lịch sử nấu ăn từ Backend:", error);
    }

    return [...historyList];
  },

  /**
   * Ghi nhận hoàn thành món ăn, nhận +50 XP và cập nhật cấp bậc
   */
  recordCooking: async (
    payload: RecordCookingPayload
  ): Promise<CookingCompletionResult | null> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: CookingCompletionResult;
        message: string;
      }>("/cooking-history", payload);

      if (response.data?.success && response.data.data) {
        const result = response.data.data;
        const item = result.historyItem;

        const newHistoryItem: CookingHistoryItem = {
          id: item._id?.toString() || item.id || `hist-${Date.now()}`,
          _id: item._id?.toString(),
          recipeId: item.recipeId?.toString() || payload.recipeId,
          recipeName: item.recipeName || payload.recipeName,
          image:
            item.image ||
            payload.image ||
            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80",
          cookedAt: formatDisplayDate(item.cookedAt),
          durationMinutes: item.durationMinutes || payload.durationMinutes,
          servings: item.servings || payload.servings || 2,
          usedIngredients: item.usedIngredients || payload.usedIngredients || [],
          calories: item.calories || payload.calories || 0,
          rating: item.rating || payload.rating,
          xpEarned: result.xpEarned || 50,
        };

        historyList = [newHistoryItem, ...historyList];
        notify();
        return result;
      }
    } catch (error) {
      console.error("Lỗi khi lưu lịch sử nấu ăn lên Backend:", error);
      throw error;
    }
    return null;
  },

  /**
   * Xóa một bản ghi lịch sử nấu ăn
   */
  deleteHistoryItem: async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/cooking-history/${id}`);
      historyList = historyList.filter(
        (item) => item.id !== id && item._id !== id
      );
      notify();
      return true;
    } catch (error) {
      console.error(`Lỗi khi xóa lịch sử nấu ăn ${id}:`, error);
      // Vẫn xóa optimistic nếu cần
      historyList = historyList.filter(
        (item) => item.id !== id && item._id !== id
      );
      notify();
      return false;
    }
  },

  /**
   * Xóa toàn bộ lịch sử trong bộ nhớ
   */
  clearHistory: () => {
    historyList = [];
    notify();
  },

  /**
   * Đăng ký lắng nghe thay đổi
   */
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export default CookingHistoryService;
