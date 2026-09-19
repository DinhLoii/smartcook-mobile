import { RECIPES_DATA } from "@/data/recipesData";
import { Recipe } from "@/types";

type Listener = () => void;

class RecipeServiceClass {
  private customRecipes: Recipe[] = [];
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.customRecipes = [];
  }

  getCustomRecipes(): Recipe[] {
    return [...this.customRecipes];
  }

  getAllRecipes(): Recipe[] {
    return [...this.customRecipes, ...RECIPES_DATA];
  }

  getRecipeById(id: string): Recipe | undefined {
    return (
      this.customRecipes.find((r) => r.id === id) ||
      RECIPES_DATA.find((r) => r.id === id)
    );
  }

  addRecipe(recipe: Recipe): Recipe {
    this.customRecipes.unshift(recipe);
    // Also push to RECIPES_DATA directly for global availability
    RECIPES_DATA.unshift(recipe);
    this.notify();
    return recipe;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error("Error in RecipeService listener", e);
      }
    });
  }
}

export const RecipeService = new RecipeServiceClass();
