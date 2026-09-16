export interface UserPreferences {
  hasCompletedSurvey: boolean;
  portion: "1" | "2" | "3-4" | "5+";
  cuisines: string[]; // e.g. ["vietnamese", "asian", "healthy", "quick", "western", "budget", "vegetarian"]
  healthGoal: "healthy" | "loss" | "muscle" | "budget";
  restrictions: string[]; // e.g. ["no-spicy", "peanut", "seafood", "lactose", "vegetarian"]
  tasteProfile?: string[]; // e.g. ["dam-da", "thanh-dam", "cay-nong", "chua-cay"]
  cookingTime?: "quick" | "medium" | "standard" | "slow"; // e.g. "< 15p", "15-30p", "30-45p", "> 45p"
  updatedAt: string;
}

export const PORTION_OPTIONS: Array<{
  id: UserPreferences["portion"];
  title: string;
  subtitle: string;
  badge: string;
  icon: string;
  servingsCount: number;
}> = [
  {
    id: "1",
    title: "1 người",
    subtitle: "Độc thân, nhanh gọn & tiện lợi",
    badge: "👤 Độc thân",
    icon: "person",
    servingsCount: 1,
  },
  {
    id: "2",
    title: "2 người",
    subtitle: "Cặp đôi, vợ chồng hoặc bạn chung phòng",
    badge: "👥 Cặp đôi",
    icon: "people",
    servingsCount: 2,
  },
  {
    id: "3-4",
    title: "3 - 4 người",
    subtitle: "Gia đình nhỏ tiêu chuẩn, đủ món mặn canh",
    badge: "👨‍👩‍👧 Gia đình nhỏ",
    icon: "home",
    servingsCount: 4,
  },
  {
    id: "5+",
    title: "5+ người",
    subtitle: "Đại gia đình nhiều thế hệ, nấu nồi lớn",
    badge: "👨‍👩‍👧‍👦 Gia đình lớn",
    icon: "restaurant",
    servingsCount: 6,
  },
];

export const CUISINE_OPTIONS = [
  { id: "vietnamese", label: "Món Việt", icon: "restaurant", emoji: "🇻🇳", desc: "Đậm đà, chuẩn vị quê hương" },
  { id: "asian", label: "Món Á", icon: "fast-food", emoji: "🥢", desc: "Hàn Quốc, Nhật Bản, Thái Lan" },
  { id: "healthy", label: "Eat Clean", icon: "leaf", emoji: "🥗", desc: "Ít dầu mỡ, tươi mát, giữ dáng" },
  { id: "western", label: "Món Âu", icon: "pizza", emoji: "🍝", desc: "Steak, Mỳ Ý, Sốt kem phô mai" },
  { id: "quick", label: "Nấu < 20p", icon: "flash", emoji: "⚡", desc: "Siêu tốc cho người bận rộn" },
  { id: "budget", label: "Tiết kiệm", icon: "wallet", emoji: "💰", desc: "Chi phí dưới 50.000đ/bữa" },
  { id: "vegetarian", label: "Ăn chay", icon: "nutrition", emoji: "🥦", desc: "Thuần chay hoặc thanh đạm" },
  { id: "dessert", label: "Tráng miệng", icon: "ice-cream", emoji: "🍧", desc: "Chè, bánh ngọt, nước mát" },
];

export const GOAL_OPTIONS = [
  { id: "healthy", label: "Ăn Healthy & Cân bằng", desc: "Đầy đủ dưỡng chất, bảo vệ sức khỏe tim mạch", icon: "heart-circle" },
  { id: "loss", label: "Giảm cân & Đốt mỡ", desc: "Kiểm soát lượng calo (< 500 kcal/bữa), nhiều rau xanh", icon: "flame" },
  { id: "muscle", label: "Tăng cơ & Giàu đạm", desc: "Hàm lượng Protein cao (> 35g/bữa), phục hồi năng lượng", icon: "barbell" },
  { id: "budget", label: "Tối ưu ngân sách", desc: "Công thức bình dân, nguyên liệu dễ mua tại chợ & siêu thị", icon: "wallet" },
];

export const RESTRICTION_OPTIONS = [
  { id: "no-spicy", label: "Không ăn cay", emoji: "🚫🌶️" },
  { id: "peanut", label: "Dị ứng đậu phộng", emoji: "🥜" },
  { id: "seafood", label: "Dị ứng hải sản vỏ cứng", emoji: "🦐" },
  { id: "lactose", label: "Không nạp lactose (Sữa)", emoji: "🥛" },
  { id: "vegetarian", label: "Ăn chay (Không thịt cá)", emoji: "🥬" },
];

// Default preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  hasCompletedSurvey: false,
  portion: "3-4",
  cuisines: ["vietnamese", "healthy"],
  healthGoal: "healthy",
  restrictions: [],
  updatedAt: new Date().toISOString(),
};

let currentPreferences: UserPreferences = { ...DEFAULT_PREFERENCES };

type Listener = (prefs: UserPreferences) => void;
const listeners = new Set<Listener>();

const notify = () => {
  listeners.forEach((fn) => {
    try {
      fn({ ...currentPreferences });
    } catch (e) {
      console.error(e);
    }
  });
};

export const PreferenceService = {
  getPreferences: (): UserPreferences => {
    return { ...currentPreferences };
  },

  hasCompletedSurvey: (): boolean => {
    return currentPreferences.hasCompletedSurvey;
  },

  savePreferences: (updates: Partial<Omit<UserPreferences, "updatedAt">>) => {
    currentPreferences = {
      ...currentPreferences,
      ...updates,
      hasCompletedSurvey: true,
      updatedAt: new Date().toISOString(),
    };
    notify();
    return { ...currentPreferences };
  },

  skipSurvey: () => {
    currentPreferences = {
      ...currentPreferences,
      hasCompletedSurvey: true,
      updatedAt: new Date().toISOString(),
    };
    notify();
    return { ...currentPreferences };
  },

  resetSurvey: () => {
    currentPreferences = {
      ...DEFAULT_PREFERENCES,
      hasCompletedSurvey: false,
    };
    notify();
  },

  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getPortionDisplay: (portion: UserPreferences["portion"]): string => {
    const found = PORTION_OPTIONS.find((p) => p.id === portion);
    return found ? found.badge : `${portion} người`;
  },

  getCuisineDisplayNames: (cuisineIds: string[]): string[] => {
    return cuisineIds
      .map((id) => CUISINE_OPTIONS.find((c) => c.id === id)?.label)
      .filter((l): l is string => Boolean(l));
  },
};
