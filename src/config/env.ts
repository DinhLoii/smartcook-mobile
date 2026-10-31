
/**
 * SmartCook Mobile Environment Configuration
 */
const getDefaultApiUrl = (): string => {
  // 1. ƯU TIÊN LINK RENDER (Nếu có khai báo trong .env hoặc gán mặc định)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.startsWith("http")) {
    return envUrl;
  }

  // 2. NẾU KHÔNG CÓ .ENV THÌ TRỎ THẲNG LÊN RENDER
  return "https://smartcook-backend-2wl7.onrender.com/api/v1";
};

const getDefaultSocketUrl = (): string => {
  // 1. ƯU TIÊN LINK RENDER
  const envUrl = process.env.EXPO_PUBLIC_SOCKET_URL;
  if (envUrl && envUrl.startsWith("http")) {
    return envUrl;
  }

  // 2. NẾU KHÔNG CÓ .ENV THÌ TRỎ THẲNG LÊN RENDER
  return "https://smartcook-backend-2wl7.onrender.com";
};

export const ENV = {
  API_BASE_URL: "https://smartcook-backend-2wl7.onrender.com/api/v1",
  SOCKET_BASE_URL: "https://smartcook-backend-2wl7.onrender.com",
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
