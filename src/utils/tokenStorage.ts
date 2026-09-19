import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_TOKEN_KEY = "smartcook_access_token";
const REFRESH_TOKEN_KEY = "smartcook_refresh_token";
const USER_INFO_KEY = "smartcook_user_info";

export interface StoredUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  avatar?: string;
  role?: string;
  chefExp?: number;
  level?: string;
  preferences?: {
    hasCompletedSurvey?: boolean;
    portion?: string;
    cuisines?: string[];
    healthGoal?: string;
    restrictions?: string[];
    tasteProfile?: string[];
    cookingTime?: string;
  };
}

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setAccessToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
    } catch (e) {
      console.error("Error saving access token to AsyncStorage", e);
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch (e) {
      console.error("Error saving refresh token to AsyncStorage", e);
    }
  },

  async getUser(): Promise<StoredUser | null> {
    try {
      const data = await AsyncStorage.getItem(USER_INFO_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async setUser(user: StoredUser): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
    } catch (e) {
      console.error("Error saving user info to AsyncStorage", e);
    }
  },

  async saveAuthSession(
    accessToken: string,
    refreshToken: string,
    user: StoredUser
  ): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
        AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
        AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(user)),
      ]);
    } catch (e) {
      console.error("Error saving auth session to AsyncStorage", e);
    }
  },

  async clearAuthSession(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
        AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
        AsyncStorage.removeItem(USER_INFO_KEY),
      ]);
    } catch (e) {
      console.error("Error clearing auth session from AsyncStorage", e);
    }
  },
};
