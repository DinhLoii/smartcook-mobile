import apiClient from "./apiClient";
import RecipeService from "./recipeService";
import {
  AddFridgeItemPayload,
  FridgeItem,
  MasterIngredient,
  MatchedRecipeItem,
  UpdateFridgeItemPayload,
  UserFridge,
} from "@/types";

type Listener = (items: FridgeItem[]) => void;

class FridgeServiceClass {
  private currentItems: FridgeItem[] = [];
  private masterIngredients: MasterIngredient[] = [];
  private listeners: Set<Listener> = new Set();

  /**
   * Lấy danh sách 58 nguyên liệu chuẩn của hệ thống
   */
  async getMasterIngredients(): Promise<MasterIngredient[]> {
    if (this.masterIngredients.length > 0) {
      return this.masterIngredients;
    }

    try {
      const response = await apiClient.get<{
        success: boolean;
        data: any;
        message: string;
      }>("/ingredients");

      if (response.data?.success && response.data.data) {
        const raw = response.data.data;
        this.masterIngredients = Array.isArray(raw)
          ? raw
          : raw.ingredients || [];
        return this.masterIngredients;
      }
    } catch (error) {
      console.warn("Lỗi khi tải master ingredients từ Backend:", error);
    }

    return this.masterIngredients;
  }

  /**
   * Lấy danh sách nguyên liệu trong tủ lạnh của người dùng hiện tại
   */
  async getMyFridge(): Promise<UserFridge> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: UserFridge;
        message: string;
      }>("/fridge/my-fridge");

      if (response.data?.success && response.data.data) {
        this.currentItems = response.data.data.items || [];
        this.notify();
        return response.data.data;
      }
    } catch (error) {
      console.warn("Lỗi khi tải tủ lạnh từ Backend:", error);
    }

    return {
      _id: "",
      userId: "",
      items: this.currentItems,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Thêm nguyên liệu vào tủ lạnh
   */
  async addItem(payload: AddFridgeItemPayload): Promise<FridgeItem | null> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: UserFridge;
        message: string;
      }>("/fridge/items", payload);

      if (response.data?.success && response.data.data) {
        const fridge = response.data.data;
        this.currentItems = fridge.items || [];
        this.notify();
        const item =
          this.currentItems.find(
            (it) => it.name.toLowerCase() === payload.name.toLowerCase()
          ) || this.currentItems[this.currentItems.length - 1];
        return item || null;
      }
    } catch (error) {
      console.error("Lỗi khi thêm nguyên liệu vào tủ lạnh:", error);
      throw error;
    }
    return null;
  }

  /**
   * Cập nhật thông tin nguyên liệu trong tủ lạnh (số lượng, HSD, vị trí)
   */
  async updateItem(
    itemId: string,
    payload: UpdateFridgeItemPayload
  ): Promise<FridgeItem | null> {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: UserFridge;
        message: string;
      }>(`/fridge/items/${itemId}`, payload);

      if (response.data?.success && response.data.data) {
        const fridge = response.data.data;
        this.currentItems = fridge.items || [];
        this.notify();
        const updated = this.currentItems.find((it) => it._id === itemId);
        return updated || null;
      }
    } catch (error) {
      console.error(`Lỗi khi cập nhật nguyên liệu ${itemId}:`, error);
      throw error;
    }
    return null;
  }

  /**
   * Xóa nguyên liệu khỏi tủ lạnh
   */
  async removeItem(itemId: string): Promise<boolean> {
    try {
      const response = await apiClient.delete<{
        success: boolean;
        data: UserFridge;
        message: string;
      }>(`/fridge/items/${itemId}`);

      if (response.data?.success) {
        if (response.data.data?.items) {
          this.currentItems = response.data.data.items;
        } else {
          this.currentItems = this.currentItems.filter((it) => it._id !== itemId);
        }
        this.notify();
        return true;
      }
    } catch (error) {
      console.error(`Lỗi khi xóa nguyên liệu ${itemId}:`, error);
      throw error;
    }
    return false;
  }

  /**
   * Xóa toàn bộ nguyên liệu khỏi tủ lạnh
   */
  async clearFridge(): Promise<boolean> {
    try {
      const response = await apiClient.delete<{
        success: boolean;
        message: string;
      }>("/fridge/clear");

      if (response.data?.success) {
        this.currentItems = [];
        this.notify();
        return true;
      }
    } catch (error) {
      console.error("Lỗi khi làm sạch tủ lạnh:", error);
      throw error;
    }
    return false;
  }

  /**
   * Lấy danh sách công thức được xếp hạng theo % nguyên liệu khớp trong tủ lạnh
   */
  async getFridgeMatchedRecipes(limit = 10): Promise<MatchedRecipeItem[]> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: any[];
        message: string;
      }>("/recipes/fridge-match", {
        params: { limit },
      });

      if (response.data?.success && Array.isArray(response.data.data)) {
        return response.data.data.map((item: any) => {
          const normalized = RecipeService.normalizeRecipe(item.recipe || item);
          return {
            recipe: normalized,
            fridgeMatchPercent: Number(item.fridgeMatchPercent ?? 0),
            matchedCount: Number(item.matchedCount ?? 0),
            totalIngredients: Number(
              item.totalIngredients ?? normalized.ingredients.length
            ),
            availableIngredients: Array.isArray(item.availableIngredients)
              ? item.availableIngredients
              : [],
            missingIngredients: Array.isArray(item.missingIngredients)
              ? item.missingIngredients
              : [],
            isFavorite: !!item.isFavorite,
          };
        });
      }
    } catch (error) {
      console.warn("Lỗi khi lấy công thức khớp tủ lạnh:", error);
    }

    return [];
  }

  /**
   * Lấy danh sách nguyên liệu hiện tại trong cache
   */
  getItems(): FridgeItem[] {
    return [...this.currentItems];
  }

  /**
   * Đăng ký lắng nghe sự kiện thay đổi của tủ lạnh
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener([...this.currentItems]);
      } catch (e) {
        console.error("Lỗi trong FridgeService listener:", e);
      }
    });
  }
}

export const FridgeService = new FridgeServiceClass();
export default FridgeService;
