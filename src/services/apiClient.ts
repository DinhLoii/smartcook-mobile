import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { ENV } from "@/config/env";
import { tokenStorage } from "@/utils/tokenStorage";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
}

export const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Event listener for unauthorized session expiration
type UnauthorizedCallback = () => void;
let unauthorizedListeners: UnauthorizedCallback[] = [];
let isNotifyingExpired = false;

export const onSessionExpired = (callback: UnauthorizedCallback): (() => void) => {
  unauthorizedListeners.push(callback);
  return () => {
    unauthorizedListeners = unauthorizedListeners.filter((cb) => cb !== callback);
  };
};

const notifySessionExpired = () => {
  if (isNotifyingExpired) return;
  isNotifyingExpired = true;
  try {
    unauthorizedListeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error("Error in session expired listener", e);
      }
    });
  } finally {
    setTimeout(() => {
      isNotifyingExpired = false;
    }, 1500);
  }
};

// Queue for pending requests while refreshing token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 1. Request Interceptor: Attach Access Token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await tokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Handle Errors & Silent Refresh Token
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If no response or not 401, reject immediately
    if (!error.response) {
      console.warn(
        `[apiClient Network Error] Cannot reach endpoint: ${error.config?.baseURL || ""}${error.config?.url || ""}. Message: ${error.message}`
      );
      return Promise.reject(error);
    }

    if (error.response.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Do not attempt refresh on auth endpoints themselves (e.g. login, refresh-token)
    const requestUrl = originalRequest.url || "";
    if (
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/refresh-token")
    ) {
      return Promise.reject(error);
    }

    // If no refresh token exists, user is an unauthenticated guest or logged out.
    // Do not attempt refresh, do not throw 'No refresh token available', and do not trigger cascade.
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      // Already tried refreshing and failed
      await tokenStorage.clearAuthSession();
      notifySessionExpired();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // If already refreshing, queue this request until refresh finishes
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Call refresh token endpoint directly with fresh axios to prevent interceptor loop
      const res = await axios.post(`${ENV.API_BASE_URL}/auth/refresh-token`, {
        refreshToken,
      });

      const data = res.data?.data;
      const newAccessToken = data?.accessToken;
      const newRefreshToken = data?.refreshToken;

      if (!newAccessToken) {
        throw new Error("Invalid refresh token response");
      }

      await tokenStorage.setAccessToken(newAccessToken);
      if (newRefreshToken) {
        await tokenStorage.setRefreshToken(newRefreshToken);
      }

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }

      processQueue(null, newAccessToken);
      return apiClient(originalRequest);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      await tokenStorage.clearAuthSession();
      notifySessionExpired();
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
