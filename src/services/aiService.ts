import { apiClient } from "./apiClient";
import { ScanHistoryItem } from "./scanHistoryService";
import { Platform } from "react-native";

export interface ScanIngredientResponse {
  id?: string;
  accuracy: number;
  imageUrl?: string;
  ingredients: {
    name: string;
    confidence: string;
    icon: string;
  }[];
  pins: {
    text: string;
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

export const aiService = {
  /**
   * Scan tabletop or fridge ingredients via Gemini 1.5 Flash Vision API
   * POST /api/v1/ai/scan-ingredients
   */
  scanIngredients: async (
    imageUri: string,
    mimeType: string = "image/jpeg"
  ): Promise<ScanIngredientResponse | null> => {
    try {
      const formData = new FormData();

      if (Platform.OS === "web") {
        // Fetch blob on web
        const res = await fetch(imageUri);
        const blob = await res.blob();
        formData.append("image", blob, "scan_photo.jpg");
      } else {
        // React Native mobile FormData structure
        const filename = imageUri.split("/").pop() || "scan_photo.jpg";
        formData.append("image", {
          uri: imageUri,
          name: filename,
          type: mimeType,
        } as any);
      }

      const response = await apiClient.post<{ data: ScanIngredientResponse }>(
        "/ai/scan-ingredients",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 25000, // Gemini vision might take 2-4 seconds
        }
      );

      return response.data?.data || (response.data as any);
    } catch (error: any) {
      console.warn(
        "⚠️ [aiService.scanIngredients] Backend API call failed, will use fallback:",
        error?.message || error
      );
      return null;
    }
  },

  /**
   * Chat with AI Chef Assistant (injected with user's fridge and taste context)
   * POST /api/v1/ai/assistant-chat
   */
  askChefAssistant: async (
    message: string,
    conversationHistory: Array<{ role: "user" | "model"; parts: [{ text: string }] }> = []
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
};
