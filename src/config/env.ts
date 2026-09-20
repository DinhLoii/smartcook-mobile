import { Platform } from "react-native";

/**
 * SmartCook Mobile Environment Configuration
 * Provides fallback URLs for Android Emulator (10.0.2.2) and iOS/Web (localhost)
 */
const getDefaultApiUrl = (): string => {
  if (Platform.OS === "web") {
    return "http://localhost:5000/api/v1";
  }
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  return Platform.OS === "android"
    ? "http://10.0.2.2:5000/api/v1"
    : "http://localhost:5000/api/v1";
};

const getDefaultSocketUrl = (): string => {
  if (Platform.OS === "web") {
    return "http://localhost:5000";
  }
  if (process.env.EXPO_PUBLIC_SOCKET_URL) {
    return process.env.EXPO_PUBLIC_SOCKET_URL;
  }
  return Platform.OS === "android"
    ? "http://10.0.2.2:5000"
    : "http://localhost:5000";
};

export const ENV = {
  API_BASE_URL: getDefaultApiUrl(),
  SOCKET_BASE_URL: getDefaultSocketUrl(),
  GOOGLE_WEB_CLIENT_ID:
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    "315474311920-e4i728d68vus6qth8jhplccps2ecsv7o.apps.googleusercontent.com",
};

export default ENV;
