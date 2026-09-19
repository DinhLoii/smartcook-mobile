export interface CookingHistoryItem {
  id: string;
  recipeId: string;
  recipeName: string;
  image: string;
  cookedAt: string; // Display string, e.g. "Hôm nay, 12:30"
  durationMinutes: number;
  servings: number;
  usedIngredients: string[];
  calories: number;
  rating?: number;
}

const DEFAULT_HISTORY: CookingHistoryItem[] = [
  {
    id: "hist-1",
    recipeId: "1",
    recipeName: "Gà xào sả ớt cay thơm",
    image:
      "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=400&q=80",
    cookedAt: "Hôm nay, 12:15",
    durationMinutes: 25,
    servings: 3,
    usedIngredients: ["Ức gà", "Sả", "Ớt", "Tỏi", "Nước mắm"],
    calories: 420,
    rating: 5,
  },
  {
    id: "hist-2",
    recipeId: "2",
    recipeName: "Canh chua cá lóc miền Tây",
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=400&q=80",
    cookedAt: "Hôm qua, 18:45",
    durationMinutes: 30,
    servings: 4,
    usedIngredients: ["Cá lóc", "Cà chua", "Dứa", "Bạc hà", "Giá đỗ"],
    calories: 310,
    rating: 5,
  },
  {
    id: "hist-3",
    recipeId: "3",
    recipeName: "Bò lúc lắc sốt tiêu đen",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80",
    cookedAt: "14 Th09, 19:10",
    durationMinutes: 20,
    servings: 2,
    usedIngredients: ["Thịt thăn bò", "Ớt chuông", "Hành tây", "Tiêu đen"],
    calories: 520,
    rating: 4,
  },
  {
    id: "hist-4",
    recipeId: "4",
    recipeName: "Trứng chiên thịt bằm nấm rơm",
    image:
      "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=400&q=80",
    cookedAt: "13 Th09, 11:30",
    durationMinutes: 15,
    servings: 2,
    usedIngredients: ["Trứng gà", "Thịt heo bằm", "Nấm rơm", "Hành lá"],
    calories: 280,
    rating: 5,
  },
  {
    id: "hist-5",
    recipeId: "5",
    recipeName: "Thịt kho tàu nước dừa trứng cút",
    image:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80",
    cookedAt: "11 Th09, 18:00",
    durationMinutes: 45,
    servings: 4,
    usedIngredients: ["Thịt ba chỉ", "Trứng cút", "Nước dừa tươi", "Hành tỏi"],
    calories: 580,
    rating: 5,
  },
];

let historyList: CookingHistoryItem[] = [...DEFAULT_HISTORY];

type Listener = (items: CookingHistoryItem[]) => void;
const listeners = new Set<Listener>();

const notify = () => {
  listeners.forEach((fn) => {
    try {
      fn([...historyList]);
    } catch (e) {
      console.error(e);
    }
  });
};

export const CookingHistoryService = {
  getHistory: (): CookingHistoryItem[] => {
    return [...historyList];
  },

  addHistory: (item: Omit<CookingHistoryItem, "id">) => {
    const newItem: CookingHistoryItem = {
      ...item,
      id: `hist-${Date.now()}`,
    };
    historyList = [newItem, ...historyList];
    notify();
    return newItem;
  },

  deleteHistoryItem: (id: string) => {
    historyList = historyList.filter((item) => item.id !== id);
    notify();
  },

  clearHistory: () => {
    historyList = [];
    notify();
  },

  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
