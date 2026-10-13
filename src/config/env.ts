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
  // If running in Android Studio emulator, 10.0.2.2 is the rock-solid local host bridge
  const isAndroidEmulator =
    Platform.OS === "android" &&
    (Constants.isDevice === false ||
      Boolean(
        (Platform.constants as any)?.Model &&
          String((Platform.constants as any).Model).toLowerCase().includes("sdk")
      ));

  if (isAndroidEmulator) {
    return "10.0.2.2";
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).linkingUri;

  if (typeof hostUri === "string" && hostUri.length > 0) {
    const clean = hostUri.replace(/^https?:\/\//, "").replace(/^exp:\/\//, "");
    const ip = clean.split(":")[0];
    if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
      return ip;
    }
  }

  return "192.168.1.251";
};

const getDefaultApiUrl = (): string => {
  if (Platform.OS === "web") {
    return "http://localhost:5000/api/v1";
  }

  const host = getDevHost();

  if (host === "10.0.2.2") {
    return "http://10.0.2.2:5000/api/v1";
  }

  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    if (envUrl.includes("localhost") || envUrl.includes("127.0.0.1")) {
      return envUrl.replace(/localhost/g, host).replace(/127\.0\.0\.1/g, host);
    }
    return envUrl;
  }

  return `http://${host}:5000/api/v1`;
};

const getDefaultSocketUrl = (): string => {
  if (Platform.OS === "web") {
    return "http://localhost:5000";
  }

  const host = getDevHost();

  if (host === "10.0.2.2") {
    return "http://10.0.2.2:5000";
  }

  const envUrl = process.env.EXPO_PUBLIC_SOCKET_URL;
  if (envUrl) {
    if (envUrl.includes("localhost") || envUrl.includes("127.0.0.1")) {
      return envUrl.replace(/localhost/g, host).replace(/127\.0\.0\.1/g, host);
    }
    return envUrl;
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

if (__DEV__) {
  console.log(`[SmartCook ENV] API_BASE_URL: ${ENV.API_BASE_URL}`);
  console.log(`[SmartCook ENV] SOCKET_BASE_URL: ${ENV.SOCKET_BASE_URL}`);
}

export default ENV;
