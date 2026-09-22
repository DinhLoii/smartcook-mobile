import { Recipe } from "./recipe";

export interface MasterIngredient {
  _id: string;
  name: string;
  normalizedName: string;
  category: string;
  defaultUnit?: string;
  storageLocation?: string;
  shelfLifeDays?: number;
  aliases: string[];
}

export interface FridgeItem {
  _id: string;
  ingredientId?: string;
  name: string;
  normalizedName: string;
  amount?: string;
  category?: string;
  storageLocation?: "chilled" | "frozen" | "pantry";
  expiryDate?: string;
  note?: string;
  addedAt?: string;
}

export interface UserFridge {
  _id: string;
  userId: string;
  items: FridgeItem[];
  updatedAt: string;
}

export interface MatchedRecipeItem {
  recipe: Recipe;
  fridgeMatchPercent: number;
  matchedCount: number;
  totalIngredients: number;
  availableIngredients: string[];
  missingIngredients: string[];
  isFavorite?: boolean;
}

export interface AddFridgeItemPayload {
  name: string;
  ingredientId?: string;
  amount?: string;
  category?: string;
  storageLocation?: "chilled" | "frozen" | "pantry";
  expiryDate?: string;
  note?: string;
}

export interface UpdateFridgeItemPayload {
  name?: string;
  amount?: string;
  category?: string;
  storageLocation?: "chilled" | "frozen" | "pantry";
  expiryDate?: string | null;
  note?: string;
}
