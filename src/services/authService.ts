import apiClient, { ApiResponse } from "./apiClient";
import { tokenStorage } from "@/utils/tokenStorage";
import {
  User,
  StoredUser,
  AuthResponseData,
  RegisterPayload,
  LoginPayload,
  SurveyPayload,
  UpdateProfilePayload,
} from "@/types";

export type {
  User,
  StoredUser,
  AuthResponseData,
  RegisterPayload,
  LoginPayload,
  SurveyPayload,
  UpdateProfilePayload,
};

export const authService = {
  /**
   * Đăng ký tài khoản mới
   */
  async register(payload: RegisterPayload): Promise<{ user: StoredUser; accessToken: string; refreshToken: string }> {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>(
      "/auth/register",
      payload
    );
    const data = response.data.data;
    const accessToken = data.tokens?.accessToken || data.accessToken || "";
    const refreshToken = data.tokens?.refreshToken || data.refreshToken || "";

    await tokenStorage.saveAuthSession(
      accessToken,
      refreshToken,
      data.user
    );
    return { user: data.user, accessToken, refreshToken };
  },

  /**
   * Đăng nhập
   */
  async login(payload: LoginPayload): Promise<{ user: StoredUser; accessToken: string; refreshToken: string }> {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>(
      "/auth/login",
      payload
    );
    const data = response.data.data;
    const accessToken = data.tokens?.accessToken || data.accessToken || "";
    const refreshToken = data.tokens?.refreshToken || data.refreshToken || "";

    await tokenStorage.saveAuthSession(
      accessToken,
      refreshToken,
      data.user
    );
    return { user: data.user, accessToken, refreshToken };
  },

  /**
   * Lấy thông tin user hiện tại
   */
  async getMe(): Promise<StoredUser> {
    const response = await apiClient.get<ApiResponse<StoredUser>>("/auth/me");
    const user = response.data.data;
    await tokenStorage.setUser(user);
    return user;
  },

  /**
   * Cập nhật khảo sát khẩu vị Onboarding
   */
  async updateSurvey(payload: SurveyPayload): Promise<StoredUser> {
    const response = await apiClient.post<ApiResponse<any>>(
      "/auth/survey",
      payload
    );
    const preferences = response.data.data;
    const currentUser = await tokenStorage.getUser();
    const updatedUser: StoredUser = {
      ...(currentUser || { id: "", email: "" }),
      preferences: {
        ...(currentUser?.preferences || {}),
        ...preferences,
      },
    };
    await tokenStorage.setUser(updatedUser);
    return updatedUser;
  },

  /**
   * Cập nhật thông tin profile (họ tên, avatar)
   */
  async updateProfile(payload: UpdateProfilePayload): Promise<StoredUser> {
    const response = await apiClient.put<ApiResponse<StoredUser>>(
      "/auth/profile",
      payload
    );
    const user = response.data.data;
    await tokenStorage.setUser(user);
    return user;
  },

  /**
   * Đăng xuất
   */
  async logout(): Promise<void> {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (refreshToken) {
        await apiClient.post("/auth/logout", { refreshToken });
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      await tokenStorage.clearAuthSession();
    }
  },
};

export default authService;
