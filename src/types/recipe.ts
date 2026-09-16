export interface RecipeStep {
  stepNumber: number;
  title: string;
  description: string;
  timerMinutes?: number;
  tip?: string;
}

export interface RecipeIngredient {
  name: string;
  amount: string;
  inFridge: boolean; // SmartCook tủ lạnh: có sẵn hay cần mua
  icon?: string;
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
  title: string;
  author: string;
  calories: number;
  minutes: number;
  stepsCount: number;
  servings: string;
  difficulty: "Dễ" | "Trung bình" | "Nâng cao";
  price: string;
  rating: number;
  reviewCount: number;
  category: string;
  badge: string;
  sub: string;
  tags: string[];
  fridgeMatchPercent: number;
  image: any;
  description: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  nutrition: RecipeNutrition;
}
