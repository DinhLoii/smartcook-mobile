export interface CartItem {
  id: string;
  name: string;
  amount: string;
  price: number;
  recipeTitle?: string;
  recipeId?: string;
  bought: boolean;
  addedAt: string;
}

// Initial sample shopping list items matching popular dishes
let cartItems: CartItem[] = [
  {
    id: "cart-item-1",
    name: "Thịt bò thăn",
    amount: "400g",
    price: 85000,
    recipeTitle: "Bò Bít Tết Sốt Tiêu",
    recipeId: "dish-2",
    bought: false,
    addedAt: "Hôm nay",
  },
  {
    id: "cart-item-2",
    name: "Măng tây tươi",
    amount: "200g",
    price: 35000,
    recipeTitle: "Bò Bít Tết Sốt Tiêu",
    recipeId: "dish-2",
    bought: false,
    addedAt: "Hôm nay",
  },
  {
    id: "cart-item-3",
    name: "Bơ lạt Anchor",
    amount: "1 viên (50g)",
    price: 15000,
    recipeTitle: "Bò Bít Tết Sốt Tiêu",
    recipeId: "dish-2",
    bought: true,
    addedAt: "Hôm nay",
  },
  {
    id: "cart-item-4",
    name: "Cà chua bi",
    amount: "150g",
    price: 12000,
    recipeTitle: "Salad Cá Hồi Áp Chảo",
    recipeId: "dish-3",
    bought: false,
    addedAt: "Hôm nay",
  },
];

type Listener = () => void;
const listeners: Set<Listener> = new Set();

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
  getItems: (): CartItem[] => {
    return [...cartItems];
  },

  addItem: (item: Omit<CartItem, "id" | "addedAt">) => {
    const existing = cartItems.find(
      (c) => c.name.toLowerCase().trim() === item.name.toLowerCase().trim()
    );
    if (existing) {
      // If already exists, mark unbought so it shows in shopping list
      existing.bought = false;
      notify();
      return;
    }
    const newItem: CartItem = {
      ...item,
      id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      addedAt: "Hôm nay",
    };
    cartItems = [newItem, ...cartItems];
    notify();
  },

  addItems: (items: Array<Omit<CartItem, "id" | "addedAt">>) => {
    let changed = false;
    items.forEach((item) => {
      const existing = cartItems.find(
        (c) => c.name.toLowerCase().trim() === item.name.toLowerCase().trim()
      );
      if (!existing) {
        cartItems.push({
          ...item,
          id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          addedAt: "Hôm nay",
        });
        changed = true;
      } else {
        existing.bought = false;
        changed = true;
      }
    });
    if (changed) {
      notify();
    }
  },

  toggleBought: (id: string) => {
    cartItems = cartItems.map((item) =>
      item.id === id ? { ...item, bought: !item.bought } : item
    );
    notify();
  },

  removeItem: (id: string) => {
    cartItems = cartItems.filter((item) => item.id !== id);
    notify();
  },

  clearAll: () => {
    cartItems = [];
    notify();
  },

  markAllBought: () => {
    cartItems = cartItems.map((item) => ({ ...item, bought: true }));
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
