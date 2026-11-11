export interface RecipeStep {
  stepNumber: number;
  title: string;
  description: string;
  timerMinutes?: number;
  tip?: string;
  instruction?: string;
}

export interface RecipeIngredient {
  name: string;
  amount: string;
  inFridge: boolean; // SmartCook tủ lạnh: có sẵn hay cần mua
  icon?: string;
  unit?: string;
  isOptional?: boolean;
}

export interface RecipeNutrition {
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  sodium?: string;
  advice: string;
}

export interface Recipe {
  id: string;
  _id?: string;
  title: string;
  author: string;
  authorId?: string;
  calories: number;
  minutes: number;
  stepsCount: number;
  servings: string;
  servingsCount?: number;
  difficulty: "Dễ" | "Trung bình" | "Nâng cao";
  price: string;
  rating: number;
  reviewCount: number;
  category: string;
  categoryCode?: string;
  badge: string;
  sub: string;
  tags: string[];
  fridgeMatchPercent: number;
  image: any;
  description: string;
  ingredients: RecipeIngredient[];
  youtubeVideoId?: string | null;
  steps: RecipeStep[];
  nutrition: RecipeNutrition;
  cookingNutrition?: import("../utils/cookingScope").CookingNutrition | null;
  isFavorite?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RecipeListResponse {
  recipes: Recipe[];
  total: number;
  page: number;
  totalPages: number;
}

export interface RecipeFilterParams {
  category?: string;
  search?: string;
  difficulty?: string;
  maxMinutes?: number;
  maxCalories?: number;
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}
