export interface CookingHistoryRecord {
  _id: string;
  id?: string;
  userId: string;
  recipeId: string;
  recipeName: string;
  image?: string;
  durationMinutes: number;
  servings?: number;
  usedIngredients?: string[];
  calories?: number;
  rating?: number;
  cookedAt: string;
  xpEarned: number;
  createdAt?: string;
}

export interface RecordCookingPayload {
  recipeId: string;
  recipeName: string;
  image?: string;
  durationMinutes: number;
  servings?: number;
  usedIngredients?: string[];
  calories?: number;
  rating?: number;
  cookedAt?: Date | string;
}

export interface CookingCompletionResult {
  historyItem: CookingHistoryRecord;
  xpEarned: number;
  chefExp: number;
  level: string;
  leveledUp: boolean;
}

export interface CookingHistoryListResponse {
  items: CookingHistoryRecord[];
  total: number;
  page: number;
  totalPages: number;
  chefExp: number;
  level: string;
}
