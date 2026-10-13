import apiClient, { ApiResponse } from "./apiClient";

export type ReportTargetType = "post" | "comment" | "recipe" | "user";
export type ReportReason = "spam" | "inappropriate" | "harassment" | "misleading" | "other";

export interface CreateReportPayload {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description?: string;
}

export const reportService = {
  /**
   * Gửi báo cáo vi phạm tiêu chuẩn cộng đồng (bài viết, bình luận, công thức, người dùng)
   * POST /api/v1/reports
   */
  async createReport(payload: CreateReportPayload): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post<ApiResponse<any>>("/reports", payload);
    return {
      success: res.data?.success ?? true,
      message: res.data?.message || "Cảm ơn bạn đã gửi báo cáo. Đội ngũ kiểm duyệt sẽ xử lý trong thời gian sớm nhất.",
    };
  },
};

export default reportService;
