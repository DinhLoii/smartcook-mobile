import { Platform } from "react-native";

const productionOrigin = "https://smartcook-backend-2wl7.onrender.com";
const localOrigin =
  Platform.OS === "android" ? "http://10.0.2.2:5000" : "http://localhost:5000";
const apiBaseUrl = __DEV__
  ? process.env.EXPO_PUBLIC_API_URL?.trim() || `${localOrigin}/api/v1`
  : `${productionOrigin}/api/v1`;

export const ENV = {
  API_BASE_URL: apiBaseUrl,
  SOCKET_BASE_URL: __DEV__
    ? process.env.EXPO_PUBLIC_SOCKET_URL?.trim() || new URL(apiBaseUrl).origin
    : productionOrigin,
  GOOGLE_WEB_CLIENT_ID:
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    "315474311920-e4i728d68vus6qth8jhplccps2ecsv7o.apps.googleusercontent.com",
  GOOGLE_IOS_CLIENT_ID:
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
    "315474311920-9kt3qadvei4mrdncf7h8ot8hj5fkjuv5.apps.googleusercontent.com",
  GOOGLE_ANDROID_CLIENT_ID:
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "",
};

if (__DEV__) {
  console.log(`[SmartCook ENV] API_BASE_URL: ${ENV.API_BASE_URL}`);
  console.log(`[SmartCook ENV] SOCKET_BASE_URL: ${ENV.SOCKET_BASE_URL}`);
}

export default ENV;
