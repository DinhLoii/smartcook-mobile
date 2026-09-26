import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { StoredUser, User } from "@/types";

export type { StoredUser, User };

const ACCESS_TOKEN_KEY = "smartcook_access_token";
const REFRESH_TOKEN_KEY = "smartcook_refresh_token";
const USER_INFO_KEY = "smartcook_user_info";

const secureTokenStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return AsyncStorage.getItem(key);
    }

    const secureValue = await SecureStore.getItemAsync(key);
    if (secureValue) return secureValue;

    const legacyValue = await AsyncStorage.getItem(key);
    if (legacyValue) {
      await SecureStore.setItemAsync(key, legacyValue);
      await AsyncStorage.removeItem(key);
    }
    return legacyValue;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(key, value);
      return;
    }

    await SecureStore.setItemAsync(key, value);
    await AsyncStorage.removeItem(key);
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(key);
      return;
    }

    await Promise.all([
      SecureStore.deleteItemAsync(key),
      AsyncStorage.removeItem(key),
    ]);
  },
};

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    try {
      return await secureTokenStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setAccessToken(token: string): Promise<void> {
    try {
      await secureTokenStorage.setItem(ACCESS_TOKEN_KEY, token);
    } catch (e) {
      console.error("Error saving access token", e);
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await secureTokenStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    try {
      await secureTokenStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch (e) {
      console.error("Error saving refresh token", e);
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
        secureTokenStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
        secureTokenStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
        AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(user)),
      ]);
    } catch (e) {
      console.error("Error saving auth session", e);
    }
  },

  async clearAuthSession(): Promise<void> {
    try {
      await Promise.all([
        secureTokenStorage.removeItem(ACCESS_TOKEN_KEY),
        secureTokenStorage.removeItem(REFRESH_TOKEN_KEY),
        AsyncStorage.removeItem(USER_INFO_KEY),
      ]);
    } catch (e) {
      console.error("Error clearing auth session", e);
    }
  },
};
