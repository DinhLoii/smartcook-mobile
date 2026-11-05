import { getCookingFactReply, getCookingScopeReply } from "../utils/cookingScope";
import { resolveCookingCommand } from "../utils/cookingCommands";
import { apiClient } from "./apiClient";
import { Platform } from "react-native";
import { File } from "expo-file-system";

export interface ScanIngredientResponse {
  id?: string;
  title?: string;
  scannedAt?: string;
  dishes?: { name: string; confidence: string; icon?: string }[];
  accuracy: number;
  imageUrl?: string;
  ingredients: {
    name: string;
    confidence: string;
    icon: string;
    source?: "visible" | "inferred";
    dishNames?: string[];
    evidence?: string;
  }[];
  pins: {
    text: string;
    icon?: string;
    confidence?: string;
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  }[];
  suggestedRecipe: {
    id?: string;
    title: string;
    desc: string;
    calories: number;
    durationMinutes: number;
    matchPercent: number;
  };
}

export interface AssistantChatResponse {
  replyText: string;
  suggestedDishes?: string[];
  quickPrompts?: string[];
}

export interface CookingCopilotStepDTO {
  stepNumber: number;
  title: string;
  description: string;
}

export interface CookingCopilotTimerDTO {
  targetMinutes?: number;
  elapsedSeconds?: number;
  remainingSeconds?: number;
  isRunning?: boolean;
  isOverdue?: boolean;
  overdueSeconds?: number;
}

export interface CookingVoiceCopilotRequestDTO {
  recipeTitle: string;
  currentStep: CookingCopilotStepDTO;
  stepTimer?: CookingCopilotTimerDTO;
  recipeContext?: {
    ingredients: { name: string; amount: string }[];
    steps: { stepNumber: number; title: string; description: string; timerMinutes?: number }[];
    servings?: string;
    nutrition?: import("../utils/cookingScope").CookingNutrition;
  };
  userVoiceText: string;
  conversationHistory?: { role: "user" | "assistant"; text: string }[];
}

export type CookingActionType =
  | "REDUCE_TIMER"
  | "EXTEND_TIMER"
  | "GO_TO_STEP"
  | "NEXT_STEP"
  | "PREV_STEP"
  | "REPEAT_STEP"
  | "TROUBLESHOOT"
  | "NONE";

export interface CookingVoiceCopilotResponseDTO {
  speechReply: string;
  action: CookingActionType;
  actionPayload?: {
    extendSeconds?: number;
    reduceSeconds?: number;
    targetStep?: number;
  };
  suggestedQuickReplies?: string[];
}

export const aiService = {
  /**
   * Scan tabletop or fridge ingredients via Gemini 1.5 Flash Vision API
   * POST /api/v1/ai/scan-ingredients
   */
  scanIngredients: async (
    imageUri: string,
    mimeType: string = "image/jpeg",
    providedBase64?: string | null
  ): Promise<ScanIngredientResponse> => {
    let imageBase64 = providedBase64 || undefined;

    if (!imageBase64) {
      if (imageUri.startsWith("data:")) {
        imageBase64 = imageUri.split(",")[1];
      } else if (Platform.OS === "web") {
        try {
          const blob = await (await fetch(imageUri)).blob();
          imageBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.warn("[aiService.scanIngredients] Base64 fetch failed on web:", e);
        }
      } else {
        try {
          const file = new File(imageUri);
          if (file.exists) {
            imageBase64 = await file.base64();
          }
        } catch (e) {
          console.warn("[aiService.scanIngredients] File base64 failed on native:", e);
        }
      }
    }

    let response;
    if (imageBase64) {
      response = await apiClient.post<{ data: ScanIngredientResponse }>(
        "/ai/scan-ingredients",
        { imageBase64, mimeType },
        { timeout: 150000 }
      );
    } else {
      const formData = new FormData();
      if (Platform.OS === "web") {
        const blob = await (await fetch(imageUri)).blob();
        formData.append("image", blob, "scan_photo.jpg");
      } else {
        formData.append("image", { uri: imageUri, name: "scan_photo.jpg", type: mimeType } as unknown as Blob);
      }
      response = await apiClient.post<{ data: ScanIngredientResponse }>(
        "/ai/scan-ingredients",
        formData,
        { timeout: 150000 }
      );
    }

    const result = response.data?.data;
    if (!result || !Array.isArray(result.ingredients) || (result.ingredients.length === 0 && !result.dishes?.length)) {
      throw new Error("AI chưa nhận diện được thực phẩm trong ảnh. Hãy thử ảnh rõ hơn.");
    }
    return result;
  },

  /**
   * Get user's past AI scan history from MongoDB
   * GET /api/v1/ai/scan-history
   */
  getScanHistory: async (limit: number = 30): Promise<ScanIngredientResponse[]> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: ScanIngredientResponse[];
      }>(`/ai/scan-history?limit=${limit}`);

      if (response.data?.success && response.data.data) {
        return response.data.data;
      }
      return (response.data as any) || [];
    } catch (error: any) {
      console.warn("⚠️ [aiService.getScanHistory] Failed to fetch scan history:", error?.message || error);
      throw error;
    }
  },

  /**
   * Delete an AI scan history entry
   * DELETE /api/v1/ai/scan-history/:id
   */
  deleteScanHistory: async (id: string): Promise<boolean> => {
    try {
      const response = await apiClient.delete<{
        success: boolean;
        message: string;
      }>(`/ai/scan-history/${id}`);

      return !!response.data?.success;
    } catch (error: any) {
      console.warn(`⚠️ [aiService.deleteScanHistory] Failed to delete scan ${id}:`, error?.message || error);
      return false;
    }
  },

  /**
   * Chat with AI Chef Assistant (injected with user's fridge and taste context)
   * POST /api/v1/ai/assistant-chat
   */
  askChefAssistant: async (
    message: string,
    conversationHistory: { role: "user" | "model"; parts: [{ text: string }] }[] = []
  ): Promise<AssistantChatResponse | null> => {
    try {
      const response = await apiClient.post<{ data: AssistantChatResponse }>(
        "/ai/assistant-chat",
        {
          message,
          conversationHistory,
        },
        { timeout: 15000 }
      );

      return response.data?.data || (response.data as any);
    } catch (error: any) {
      console.warn(
        "⚠️ [aiService.askChefAssistant] Backend API call failed, will use fallback:",
        error?.message || error
      );
      return null;
    }
  },

  /**
   * Real-time Cooking Voice Copilot
   * POST /api/v1/ai/cooking-copilot
   */
  callCookingVoiceCopilot: async (
    payload: CookingVoiceCopilotRequestDTO
  ): Promise<CookingVoiceCopilotResponseDTO> => {
    const scopeReply = getCookingScopeReply(payload.userVoiceText, payload);
    if (scopeReply) return { action: "NONE", speechReply: scopeReply, suggestedQuickReplies: [] };
    const command = resolveCookingCommand(payload.userVoiceText, payload);
    if (command) return command;
    const factReply = getCookingFactReply(payload.userVoiceText, payload);
    if (factReply) return { action: "NONE", speechReply: factReply, suggestedQuickReplies: [] };
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: CookingVoiceCopilotResponseDTO;
      }>("/ai/cooking-copilot", payload, { timeout: 20000 });

      if (response.data?.data) {
        return response.data.data;
      }
      return response.data as any;
    } catch (error: any) {
      console.warn(
        "⚠️ [aiService.callCookingVoiceCopilot] Request failed, using client fallback:",
        error?.message || error
      );

      return {
        speechReply: "Mình chưa kết nối được trợ lý AI. Bạn có thể thử lại hoặc dùng nút điều khiển trên màn hình nhé.",
        action: "NONE",
        suggestedQuickReplies: ["Lùi bước", "Đọc lại", "Thêm 2 phút"],
      };
    }
  },
};
