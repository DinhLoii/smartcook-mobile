import apiClient from "./apiClient";
import { RECIPES_DATA, getRecipeById as getLocalRecipeById } from "@/data/recipesData";
import { Recipe, RecipeFilterParams, RecipeListResponse } from "@/types";

type Listener = () => void;

class RecipeServiceClass {
  private customRecipes: Recipe[] = [];
  private listeners: Set<Listener> = new Set();

  /**
   * Lấy danh sách công thức phân trang và lọc từ Backend
   */
  async getRecipes(params: RecipeFilterParams = {}): Promise<RecipeListResponse> {
    try {
      const queryParams: Record<string, any> = {
        page: params.page || 1,
        limit: params.limit || 10,
      };

      if (params.category && params.category !== "all") {
        queryParams.category = params.category;
      }
      if (params.search && params.search.trim()) {
        queryParams.search = params.search.trim();
      }
      if (params.difficulty && params.difficulty !== "all") {
        queryParams.difficulty = params.difficulty;
      }
      if (params.maxMinutes) {
        queryParams.maxMinutes = params.maxMinutes;
      }
      if (params.maxCalories) {
        queryParams.maxCalories = params.maxCalories;
      }
      if (params.sortField) {
        queryParams.sortField = params.sortField;
      }
      if (params.sortOrder) {
        queryParams.sortOrder = params.sortOrder;
      }

      const response = await apiClient.get<{
        success: boolean;
        data: {
          recipes: any[];
          total: number;
          page: number;
          totalPages: number;
        };
      }>("/recipes", { params: queryParams });

      if (response.data?.success && response.data.data) {
        const rawRecipes = response.data.data.recipes || [];
        const mappedRecipes: Recipe[] = rawRecipes.map(this.normalizeRecipe);

        return {
          recipes: mappedRecipes,
          total: response.data.data.total ?? mappedRecipes.length,
          page: response.data.data.page ?? (params.page || 1),
          totalPages: response.data.data.totalPages ?? 1,
        };
      }
    } catch (error) {
      console.warn("Lỗi tải công thức từ Backend, sử dụng dữ liệu cục bộ:", error);
    }

    // Fallback sang dữ liệu cục bộ khi offline hoặc mất kết nối
    return this.getLocalFilteredRecipes(params);
  }

  /**
   * Lấy chi tiết một món ăn theo ID (từ MongoDB hoặc Fallback)
   */
  async getRecipeById(id: string): Promise<Recipe | undefined> {
    // Nếu là ID mock / local (không phải ObjectId 24 ký tự hex hợp lệ),
    // ưu tiên tìm trong customRecipes và RECIPES_DATA trước để tránh gọi API vô nghĩa và log lỗi
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);
    if (!isMongoId) {
      const local =
        this.customRecipes.find((r) => r.id === id) ||
        getLocalRecipeById(id) ||
        RECIPES_DATA.find((r) => r.id === id);
      if (local) return local;
    }

    try {
      const response = await apiClient.get<{
        success: boolean;
        data: any;
      }>(`/recipes/${id}`);

      if (response.data?.success && response.data.data) {
        return this.normalizeRecipe(response.data.data);
      }
    } catch (error) {
      console.warn(`Lỗi tải chi tiết món ${id} từ Backend, tìm trong dữ liệu cục bộ:`, error);
    }

    // Fallback tìm trong customRecipes hoặc RECIPES_DATA
    const local =
      this.customRecipes.find((r) => r.id === id) ||
      getLocalRecipeById(id) ||
      RECIPES_DATA.find((r) => r.id === id);

    return local;
  }

  /**
   * Toggle yêu thích món ăn (Lưu vào User.favoriteRecipeIds trên MongoDB)
   */
  async toggleFavorite(id: string): Promise<{ isFavorite: boolean }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: { isFavorite: boolean };
        message: string;
      }>(`/recipes/${id}/favorite`);

      if (response.data?.success && response.data.data) {
        return response.data.data;
      }
    } catch (error) {
      console.warn(`Lỗi toggle favorite món ${id} trên Backend:`, error);
    }

    return { isFavorite: false };
  }

  /**
   * Tạo công thức mới tải ảnh lên Cloudinary và lưu MongoDB
   */
  async createRecipe(formData: FormData): Promise<Recipe> {
    const response = await apiClient.post<{
      success: boolean;
      data: any;
      message: string;
    }>("/recipes", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 30000, // Cho phép upload ảnh Cloudinary
    });

    if (response.data?.success && response.data.data) {
      const newRecipe = this.normalizeRecipe(response.data.data);
      this.customRecipes.unshift(newRecipe);
      this.notify();
      return newRecipe;
    }

    throw new Error(response.data?.message || "Không thể tạo công thức món ăn");
  }

  /**
   * Lấy danh sách món tự tạo offline/cục bộ
   */
  getCustomRecipes(): Recipe[] {
    return [...this.customRecipes];
  }

  /**
   * Thêm món ăn cục bộ
   */
  addRecipe(recipe: Recipe): Recipe {
    this.customRecipes.unshift(recipe);
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

  /**
   * Chuẩn hóa Recipe DTO từ Backend về Interface Recipe của Mobile
   */
  public normalizeRecipe(raw: any): Recipe {
    const id = raw._id?.toString() || raw.id || `dish-${Date.now()}`;
    const category = raw.categoryCode || raw.category || "family";

    return {
      id,
      _id: id,
      title: raw.title || "Món ăn chưa đặt tên",
      author: raw.author || "Đầu bếp SmartCook",
      authorId: raw.authorId?.toString(),
      calories: Number(raw.calories) || 450,
      minutes: Number(raw.minutes || raw.cookingTimeMinutes) || 25,
      stepsCount: Array.isArray(raw.steps) ? raw.steps.length : (raw.stepsCount || 3),
      servings: raw.servings || `${raw.servingsCount || 2} phần`,
      servingsCount: Number(raw.servingsCount) || 2,
      difficulty: raw.difficulty || "Dễ",
      price: raw.price || "~45.000đ",
      rating: Number(raw.rating || raw.ratingAverage) || 5.0,
      reviewCount: Number(raw.reviewCount || raw.ratingsCount) || 1,
      category,
      categoryCode: category,
      badge: raw.badge || "✨ Mới",
      sub: raw.sub || raw.description?.slice(0, 30) || "Món ngon gia đình",
      tags: Array.isArray(raw.tags) ? raw.tags : ["Món ngon"],
      fridgeMatchPercent: Number(raw.fridgeMatchPercent ?? 85),
      image: raw.image || require("@/assets/images/hero-teriyaki-bowl.jpg"),
      description: raw.description || "",
      ingredients: Array.isArray(raw.ingredients)
        ? raw.ingredients.map((ing: any) => ({
            name: ing.name || "",
            amount: ing.amount || "1 phần",
            inFridge: ing.inFridge !== false,
            icon: ing.icon,
            unit: ing.unit,
          }))
        : [],
      steps: Array.isArray(raw.steps)
        ? raw.steps.map((step: any, idx: number) => ({
            stepNumber: step.stepNumber || idx + 1,
            title: step.title || `Bước ${idx + 1}`,
            description: step.description || step.instruction || "",
            timerMinutes: step.timerMinutes,
            tip: step.tip,
          }))
        : [],
      nutrition: raw.nutrition || {
        calories: Number(raw.calories) || 450,
        protein: "25g",
        carbs: "45g",
        fat: "12g",
        fiber: "6g",
        advice: "Món ăn cân bằng dinh dưỡng, tốt cho sức khỏe.",
      },
      isFavorite: !!raw.isFavorite,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  /**
   * Bộ lọc dữ liệu cục bộ khi không có kết nối mạng
   */
  private getLocalFilteredRecipes(params: RecipeFilterParams): RecipeListResponse {
    let list = [...this.customRecipes, ...RECIPES_DATA];

    if (params.category && params.category !== "all") {
      list = list.filter((r) => r.category === params.category);
    }

    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.sub.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (params.difficulty && params.difficulty !== "all") {
      list = list.filter((r) => r.difficulty === params.difficulty);
    }

    if (params.maxMinutes) {
      list = list.filter((r) => r.minutes <= params.maxMinutes!);
    }

    if (params.maxCalories) {
      list = list.filter((r) => r.calories <= params.maxCalories!);
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paginated = list.slice((page - 1) * limit, page * limit);

    return {
      recipes: paginated,
      total,
      page,
      totalPages,
    };
  }
}

export const RecipeService = new RecipeServiceClass();
export default RecipeService;
