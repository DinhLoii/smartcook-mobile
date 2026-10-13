import { plannerService } from "./plannerService";
import { tokenStorage } from "@/utils/tokenStorage";

export interface CartItem {
  id: string;
  name: string;
  amount: string;
  price: number;
  category?: string;
  recipeTitle?: string;
  recipeId?: string;
  bought: boolean;
  addedAt: string;
}

let cartItems: CartItem[] = [];

type Listener = () => void;
const listeners: Set<Listener> = new Set();
let hasFetchedServer = false;

const notify = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error(e);
    }
  });
};

export const CartService = {
  /**
   * Tải giỏ hàng từ Backend MongoDB (đồng bộ với Web)
   */
  fetchServerItems: async (): Promise<CartItem[]> => {
    try {
      const token = await tokenStorage.getAccessToken();
      if (!token) {
        return [...cartItems];
      }
      const res = await plannerService.getSmartShoppingList();
      if (res && Array.isArray(res.items)) {
        cartItems = res.items.map((i) => ({
          id: i._id || i.id || `cart-${Date.now()}`,
          name: i.name,
          amount: i.amount || "1",
          price: i.price || 0,
          category: i.category || "Rau củ",
          recipeTitle: i.recipeTitle,
          bought: Boolean(i.bought),
          addedAt: "Hôm nay",
        }));
        hasFetchedServer = true;
        notify();
        return cartItems;
      }
    } catch (err) {
      console.warn("⚠️ [CartService] Không thể tải giỏ hàng từ server, dùng cache:", err);
    }
    return [...cartItems];
  },

  reload: async (): Promise<CartItem[]> => {
    return CartService.fetchServerItems();
  },

  getItems: (): CartItem[] => {
    if (!hasFetchedServer) {
      hasFetchedServer = true;
      CartService.fetchServerItems().catch(() => {});
    }
    return [...cartItems];
  },

  addItem: async (item: Omit<CartItem, "id" | "addedAt">) => {
    const tempId = `cart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const existing = cartItems.find(
      (c) => c.name.toLowerCase().trim() === item.name.toLowerCase().trim()
    );

    if (existing) {
      existing.bought = false;
      notify();
    } else {
      const newItem: CartItem = {
        ...item,
        id: tempId,
        addedAt: "Hôm nay",
      };
      cartItems = [newItem, ...cartItems];
      notify();
    }

    // Đồng bộ lên Server MongoDB
    try {
      const serverItem = await plannerService.addCartItem({
        name: item.name,
        amount: item.amount,
        price: item.price,
        category: item.category || "Rau củ",
        recipeTitle: item.recipeTitle,
      });

      if (serverItem && serverItem._id) {
        cartItems = cartItems.map((c) =>
          c.id === tempId ? { ...c, id: serverItem._id } : c
        );
        notify();
      }
    } catch (e) {
      console.warn("⚠️ [CartService] Lỗi lưu item lên server:", e);
    }
  },

  addItems: async (items: Array<Omit<CartItem, "id" | "addedAt">>) => {
    for (const it of items) {
      await CartService.addItem(it);
    }
  },

  toggleBought: async (id: string) => {
    let newBought = false;
    let targetName: string | undefined;
    cartItems = cartItems.map((item) => {
      if (item.id === id) {
        newBought = !item.bought;
        targetName = item.name;
        return { ...item, bought: newBought };
      }
      return item;
    });
    notify();

    const token = await tokenStorage.getAccessToken();
    if (!token) return;

    try {
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);
      const target = isMongoId ? id : (targetName || id);
      if (target) {
        await plannerService.toggleBoughtStatus(target, newBought);
      }
    } catch (e) {
      console.warn(`⚠️ [CartService] Lỗi toggle bought ${id} trên server:`, e);
    }
  },

  removeItem: async (id: string, name?: string) => {
    const itemToDelete = cartItems.find(
      (item) =>
        item.id === id ||
        (name && item.name.toLowerCase().trim() === name.toLowerCase().trim())
    );
    const targetName = name || itemToDelete?.name;
    cartItems = cartItems.filter(
      (item) =>
        item.id !== id &&
        (!targetName || item.name.toLowerCase().trim() !== targetName.toLowerCase().trim())
    );
    notify();

    const token = await tokenStorage.getAccessToken();
    if (!token) return;

    try {
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);
      const target = isMongoId ? id : targetName;
      if (target) {
        await plannerService.removeCartItem(target);
      }
    } catch (e) {
      console.warn(`⚠️ [CartService] Lỗi xóa item ${id} trên server:`, e);
    }
  },

  /**
   * Chỉ dọn dẹp bộ nhớ đệm giỏ hàng cục bộ trên thiết bị (dùng khi đăng xuất / hết phiên).
   * Không gửi request xóa dữ liệu trên server.
   */
  clearLocal: () => {
    cartItems = [];
    hasFetchedServer = false;
    notify();
  },

  /**
   * Người dùng chủ động chọn xóa tất cả nguyên liệu trong giỏ.
   */
  clearAll: async () => {
    cartItems = [];
    notify();

    const token = await tokenStorage.getAccessToken();
    if (!token) return;

    try {
      await plannerService.clearAllCartItems();
    } catch (e) {
      console.warn("⚠️ [CartService] Lỗi xóa tất cả item trên server:", e);
    }
  },

  markAllBought: () => {
    cartItems = cartItems.map((item) => {
      if (!item.bought) {
        CartService.toggleBought(item.id);
      }
      return { ...item, bought: true };
    });
    notify();
  },

  getUnboughtCount: (): number => {
    return cartItems.filter((item) => !item.bought).length;
  },

  hasPendingShopping: (): boolean => {
    return cartItems.length > 0 && cartItems.some((item) => !item.bought);
  },

  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

