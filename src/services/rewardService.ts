import apiClient, { ApiResponse } from "./apiClient";
import { CheckInResult, RedeemResult, RewardStatus } from "@/types";
import { triggerHaptic } from "@/utils/haptics";

export const rewardService = {
  /**
   * Lấy trạng thái điểm danh và danh mục quà tặng từ Backend
   */
  async getRewardStatus(): Promise<RewardStatus> {
    try {
      const response = await apiClient.get<ApiResponse<RewardStatus>>("/rewards/status");
      if (response.data?.success && response.data.data) {
        return response.data.data;
      }
    } catch (error) {
      console.warn("Lỗi tải trạng thái đổi thưởng từ Backend:", error);
    }

    return {
      chefExp: 0,
      level: "Tập sự",
      streakDays: 0,
      hasCheckedInToday: false,
      streakRewards: [15, 20, 25, 30, 40, 50, 100],
      catalog: [],
      claimedRewards: [],
    };
  },

  /**
   * Điểm danh nhận thưởng Chef XP hôm nay
   */
  async checkInToday(): Promise<CheckInResult> {
    const response = await apiClient.post<ApiResponse<CheckInResult>>("/rewards/check-in");
    triggerHaptic("success");
    return response.data.data;
  },

  /**
   * Đổi phần quà / voucher bằng điểm Chef XP
   */
  async redeemReward(rewardId: string): Promise<RedeemResult> {
    const response = await apiClient.post<ApiResponse<RedeemResult>>("/rewards/redeem", {
      rewardId,
    });
    triggerHaptic("success");
    return response.data.data;
  },
};

export default rewardService;
