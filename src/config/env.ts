import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * SmartCook Mobile Environment Configuration
 * Provides dynamic fallback URLs:
 * - Web: localhost:5000
 * - Real Device / Expo Go (iPhone, Android): computer LAN IP (from Constants.expoConfig.hostUri or fallback)
 * - Android Emulator: 10.0.2.2:5000
 */
const getDevHost = (): string => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
      return ip;
    }
  }
  return "192.168.1.12";
};

const getDefaultApiUrl = (): string => {
  if (Platform.OS === "web") {
    return "http://localhost:5000/api/v1";
  }

  const host = getDevHost();
  if (Platform.OS === "ios") {
    return `http://${host}:5000/api/v1`;
  }

  // Android
  if (process.env.EXPO_PUBLIC_API_URL && !process.env.EXPO_PUBLIC_API_URL.includes("10.0.2.2")) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  return `http://${host}:5000/api/v1`;
};

const getDefaultSocketUrl = (): string => {
  if (Platform.OS === "web") {
    return "http://localhost:5000";
  }

  const host = getDevHost();
  if (Platform.OS === "ios") {
    return `http://${host}:5000`;
  }

  if (process.env.EXPO_PUBLIC_SOCKET_URL && !process.env.EXPO_PUBLIC_SOCKET_URL.includes("10.0.2.2")) {
    return process.env.EXPO_PUBLIC_SOCKET_URL;
  }

  return `http://${host}:5000`;
};

export const ENV = {
  API_BASE_URL: getDefaultApiUrl(),
  SOCKET_BASE_URL: getDefaultSocketUrl(),
  GOOGLE_WEB_CLIENT_ID:
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    "315474311920-e4i728d68vus6qth8jhplccps2ecsv7o.apps.googleusercontent.com",
  GOOGLE_IOS_CLIENT_ID:
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
    "315474311920-9kt3qadvei4mrdncf7h8ot8hj5fkjuv5.apps.googleusercontent.com",
  GOOGLE_ANDROID_CLIENT_ID:
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "",
};

export default ENV;
