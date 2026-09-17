export interface ScanDetectedIngredient {
  name: string;
  confidence: string;
  icon: string;
}

export interface ScanPin {
  text: string;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export interface ScanSuggestedRecipe {
  id: string;
  title: string;
  desc: string;
  calories: number;
  durationMinutes: number;
  matchPercent: number;
}

export interface ScanHistoryItem {
  id: string;
  title: string;
  scannedAt: string; // e.g. "Hôm nay, 12:30", "Hôm qua, 17:45"
  image: any; // local asset or { uri: string }
  accuracy: number; // e.g. 96
  ingredients: ScanDetectedIngredient[];
  pins: ScanPin[];
  suggestedRecipe: ScanSuggestedRecipe;
}

const DEFAULT_SCAN_HISTORY: ScanHistoryItem[] = [
  {
    id: "scan-1",
    title: "Bàn bếp chuẩn bị trưa nay",
    scannedAt: "Hôm nay, 12:30",
    image: require("@/assets/images/smartcook-auth-bg.jpg"),
    accuracy: 96,
    ingredients: [
      { name: "Thịt ức gà", confidence: "98%", icon: "food-drumstick" },
      { name: "Cà chua bi", confidence: "96%", icon: "fruit-cherries" },
      { name: "Quả bơ sáp", confidence: "94%", icon: "food-apple" },
      { name: "Hành tây & Tỏi", confidence: "91%", icon: "seed" },
    ],
    pins: [
      { text: "🍗 Ức gà (98%)", top: 30, left: 30 },
      { text: "🍅 Cà chua (96%)", top: 75, right: 35 },
      { text: "🥑 Quả bơ (94%)", bottom: 40, left: 50 },
    ],
    suggestedRecipe: {
      id: "dish-3",
      title: "Salad Ức Gà Bơ Sáp Sốt Chanh Leo",
      desc: "Công thức sáng tạo tối ưu từ 100% nguyên liệu vừa quét được. Không cần đi chợ thêm!",
      calories: 380,
      durationMinutes: 20,
      matchPercent: 100,
    },
  },
  {
    id: "scan-2",
    title: "Ngăn mát tủ lạnh sáng nay",
    scannedAt: "Hôm nay, 08:15",
    image: require("@/assets/images/salad-salmon.jpg"),
    accuracy: 98,
    ingredients: [
      { name: "Cá hồi phi lê", confidence: "99%", icon: "fish" },
      { name: "Xà lách Romaine", confidence: "97%", icon: "leaf" },
      { name: "Quả bơ sáp", confidence: "95%", icon: "food-apple" },
      { name: "Chanh vàng & Olive", confidence: "92%", icon: "fruit-citrus" },
    ],
    pins: [
      { text: "🐟 Cá hồi (99%)", top: 40, right: 40 },
      { text: "🥬 Xà lách (97%)", bottom: 50, left: 35 },
      { text: "🥑 Quả bơ (95%)", top: 60, left: 45 },
    ],
    suggestedRecipe: {
      id: "dish-3",
      title: "Salad Cá Hồi Bơ Sáp Healthy",
      desc: "Dồi dào Omega-3 và chất béo lành mạnh, tốt cho tim mạch và duy trì vóc dáng.",
      calories: 380,
      durationMinutes: 15,
      matchPercent: 95,
    },
  },
  {
    id: "scan-3",
    title: "Thực phẩm tươi đi chợ chiều",
    scannedAt: "Hôm qua, 17:45",
    image: require("@/assets/images/steak-asparagus.jpg"),
    accuracy: 95,
    ingredients: [
      { name: "Thịt thăn bò", confidence: "98%", icon: "food-steak" },
      { name: "Măng tây tươi", confidence: "95%", icon: "leaf" },
      { name: "Bơ lạt Anchor", confidence: "93%", icon: "seed" },
      { name: "Tỏi củ & Tiêu đen", confidence: "90%", icon: "shaker" },
    ],
    pins: [
      { text: "🥩 Thăn bò (98%)", top: 35, left: 40 },
      { text: "🌿 Măng tây (95%)", bottom: 45, right: 40 },
    ],
    suggestedRecipe: {
      id: "dish-2",
      title: "Bò Bít Tết Măng Tây Sốt Tiêu",
      desc: "Thịt bò mềm mọng nước thơm mùi bơ tỏi, kèm măng tây giòn ngọt chuẩn phong cách nhà hàng.",
      calories: 520,
      durationMinutes: 20,
      matchPercent: 100,
    },
  },
  {
    id: "scan-4",
    title: "Nguyên liệu bữa tối gia đình",
    scannedAt: "14 Th09, 16:30",
    image: require("@/assets/images/crispy-chicken.jpg"),
    accuracy: 94,
    ingredients: [
      { name: "Đùi gà tươi", confidence: "97%", icon: "food-drumstick" },
      { name: "Sả cây & Ớt hiểm", confidence: "95%", icon: "leaf" },
      { name: "Gừng & Tỏi băm", confidence: "93%", icon: "seed" },
      { name: "Nước mắm truyền thống", confidence: "91%", icon: "bottle-tonic" },
    ],
    pins: [
      { text: "🍗 Đùi gà (97%)", top: 45, left: 50 },
      { text: "🌶 Sả & Ớt (95%)", bottom: 35, right: 45 },
    ],
    suggestedRecipe: {
      id: "dish-1",
      title: "Cơm Gà Xào Sả Ớt Cay Thơm",
      desc: "Thịt gà ngấm sốt sả ớt đậm đà thơm cay kích thích vị giác, hao cơm cho cả gia đình.",
      calories: 540,
      durationMinutes: 25,
      matchPercent: 92,
    },
  },
];

let scanHistoryList: ScanHistoryItem[] = [...DEFAULT_SCAN_HISTORY];

type Listener = (items: ScanHistoryItem[]) => void;
const listeners = new Set<Listener>();

const notify = () => {
  listeners.forEach((fn) => {
    try {
      fn([...scanHistoryList]);
    } catch (e) {
      console.error(e);
    }
  });
};

export const ScanHistoryService = {
  getHistory: (): ScanHistoryItem[] => {
    return [...scanHistoryList];
  },

  getHistoryItem: (id: string): ScanHistoryItem | undefined => {
    return scanHistoryList.find((item) => item.id === id);
  },

  addHistory: (item: Omit<ScanHistoryItem, "id">): ScanHistoryItem => {
    const newItem: ScanHistoryItem = {
      ...item,
      id: `scan-${Date.now()}`,
    };
    scanHistoryList = [newItem, ...scanHistoryList];
    notify();
    return newItem;
  },

  deleteHistoryItem: (id: string) => {
    scanHistoryList = scanHistoryList.filter((item) => item.id !== id);
    notify();
  },

  clearHistory: () => {
    scanHistoryList = [];
    notify();
  },

  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
