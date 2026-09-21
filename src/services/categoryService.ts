import apiClient from "./apiClient";
import { CategoryItem } from "@/types";

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  {
    id: "all",
    code: "all",
    name: "Tất cả",
    icon: "grid-outline",
    color: "#FF5722",
    order: 0,
  },
  {
    id: "quick",
    code: "quick",
    name: "Nấu nhanh < 20p",
    icon: "flash-outline",
    color: "#F59E0B",
    order: 1,
  },
  {
    id: "family",
    code: "family",
    name: "Gia đình",
    icon: "people-outline",
    color: "#FF6B35",
    order: 2,
  },
  {
    id: "healthy",
    code: "healthy",
    name: "Healthy",
    icon: "leaf-outline",
    color: "#10B981",
    order: 3,
  },
  {
    id: "budget",
    code: "budget",
    name: "Tiết kiệm",
    icon: "wallet-outline",
    color: "#3B82F6",
    order: 4,
  },
  {
    id: "kids",
    code: "kids",
    name: "Trẻ em",
    icon: "happy-outline",
    color: "#EC4899",
    order: 5,
  },
  {
    id: "vegetarian",
    code: "vegetarian",
    name: "Ăn chay",
    icon: "nutrition-outline",
    color: "#059669",
    order: 6,
  },
  {
    id: "vietnamese",
    code: "vietnamese",
    name: "Món Việt",
    icon: "restaurant-outline",
    color: "#D97706",
    order: 7,
  },
  {
    id: "dessert",
    code: "dessert",
    name: "Tráng miệng",
    icon: "ice-cream-outline",
    color: "#8B5CF6",
    order: 8,
  },
];

const CATEGORY_COLOR_MAP: Record<string, string> = {
  all: "#FF5722",
  quick: "#F59E0B",
  family: "#FF6B35",
  healthy: "#10B981",
  budget: "#3B82F6",
  kids: "#EC4899",
  vegetarian: "#059669",
  vietnamese: "#D97706",
  dessert: "#8B5CF6",
};

const CATEGORY_ICON_MAP: Record<string, string> = {
  all: "grid-outline",
  quick: "flash-outline",
  family: "people-outline",
  healthy: "leaf-outline",
  budget: "wallet-outline",
  kids: "happy-outline",
  vegetarian: "nutrition-outline",
  vietnamese: "restaurant-outline",
  dessert: "ice-cream-outline",
};

class CategoryServiceClass {
  private cachedCategories: CategoryItem[] = DEFAULT_CATEGORIES;

  async getCategories(): Promise<CategoryItem[]> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: Array<{
          _id?: string;
          id?: string;
          code: string;
          name: string;
          icon?: string;
          order?: number;
          description?: string;
          isActive?: boolean;
        }>;
      }>("/categories");

      if (response.data?.success && Array.isArray(response.data.data)) {
        const serverCategories: CategoryItem[] = response.data.data
          .filter((cat) => cat.isActive !== false)
          .map((cat) => ({
            id: cat.code,
            code: cat.code,
            name: cat.name,
            icon: cat.icon || CATEGORY_ICON_MAP[cat.code] || "restaurant-outline",
            color: CATEGORY_COLOR_MAP[cat.code] || "#FF6B35",
            order: cat.order ?? 99,
            description: cat.description,
            isActive: cat.isActive,
          }))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        // Ensure "all" is first
        const allCategory = DEFAULT_CATEGORIES.find((c) => c.code === "all")!;
        const combined = [
          allCategory,
          ...serverCategories.filter((c) => c.code !== "all"),
        ];

        this.cachedCategories = combined;
        return combined;
      }
    } catch (error) {
      console.warn("Lỗi tải danh mục từ Backend, sử dụng danh mục mặc định:", error);
    }

    return this.cachedCategories;
  }
}

export const CategoryService = new CategoryServiceClass();
export default CategoryService;
