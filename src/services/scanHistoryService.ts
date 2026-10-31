import { aiService } from "./aiService";

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

let scanHistoryList: ScanHistoryItem[] = [];

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

  /**
   * Fetch scan history from backend MongoDB and update list
   */
  fetchBackendHistory: async (limit: number = 30): Promise<ScanHistoryItem[]> => {
    try {
      const backendItems = await aiService.getScanHistory(limit);
      if (backendItems && backendItems.length > 0) {
        const mapped: ScanHistoryItem[] = backendItems.map((item) => ({
          id: item.id || `scan-${Date.now()}-${Math.random()}`,
          title: (item as any).title || "Ảnh quét thực phẩm",
          scannedAt: (item as any).scannedAt || "Vừa xong",
          image: item.imageUrl ? { uri: item.imageUrl } : ((item as any).image ? { uri: (item as any).image } : require("@/assets/images/smartcook-auth-bg.jpg")),
          accuracy: item.accuracy || 95,
          ingredients: (item.ingredients || []).map((ing) => ({
            name: ing.name,
            confidence: ing.confidence || "95%",
            icon: ing.icon || "food-apple",
          })),
          pins: (item.pins || []).map((pin) => ({
            text: pin.text,
            top: pin.top,
            bottom: pin.bottom,
            left: pin.left,
            right: pin.right,
          })),
          suggestedRecipe: {
            id: item.suggestedRecipe?.id || `recipe-${Date.now()}`,
            title: item.suggestedRecipe?.title || "Món ăn từ nguyên liệu quét được",
            desc: item.suggestedRecipe?.desc || "Gợi ý công thức từ AI",
            calories: item.suggestedRecipe?.calories || 450,
            durationMinutes: item.suggestedRecipe?.durationMinutes || 25,
            matchPercent: item.suggestedRecipe?.matchPercent || 95,
          },
        }));

        scanHistoryList = mapped;
        notify();
        return mapped;
      }
    } catch (e) {
      console.warn("ScanHistoryService.fetchBackendHistory failed:", e);
    }
    return [...scanHistoryList];
  },

  addHistory: (item: Omit<ScanHistoryItem, "id"> & { id?: string }): ScanHistoryItem => {
    const newItem: ScanHistoryItem = {
      ...item,
      id: item.id || `scan-${Date.now()}`,
    };
    scanHistoryList = [newItem, ...scanHistoryList];
    notify();
    return newItem;
  },

  deleteHistoryItem: async (id: string): Promise<void> => {
    scanHistoryList = scanHistoryList.filter((item) => item.id !== id);
    notify();

    // If id is a 24-character hex MongoDB ObjectId, delete on backend too
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      try {
        await aiService.deleteScanHistory(id);
      } catch (e) {
        console.warn(`Failed to delete scan ${id} on backend:`, e);
      }
    }
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
