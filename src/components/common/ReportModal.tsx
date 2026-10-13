import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import reportService, { ReportReason, ReportTargetType } from "@/services/reportService";
import { triggerHaptic } from "@/utils/haptics";

interface ReportModalProps {
  visible: boolean;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
  onClose: () => void;
}

const REASONS: Array<{ key: ReportReason; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "spam", label: "Nội dung quảng cáo, tin rác (Spam)", icon: "megaphone-outline" },
  { key: "inappropriate", label: "Nội dung phản cảm, không phù hợp", icon: "warning-outline" },
  { key: "harassment", label: "Quấy rối hoặc ngôn từ thù địch", icon: "hand-left-outline" },
  { key: "misleading", label: "Thông tin ẩm thực sai lệch, nguy hại", icon: "alert-circle-outline" },
  { key: "other", label: "Lý do khác", icon: "help-circle-outline" },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  targetType,
  targetId,
  targetTitle,
  onClose,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason>("inappropriate");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!targetId) return;

    try {
      setIsSubmitting(true);
      const res = await reportService.createReport({
        targetType,
        targetId,
        reason: selectedReason,
        description: description.trim() || undefined,
      });

      triggerHaptic("success");
      Alert.alert("Đã gửi báo cáo", res.message, [
        {
          text: "Đã hiểu",
          onPress: () => {
            setDescription("");
            onClose();
          },
        },
      ]);
    } catch (err: any) {
      triggerHaptic("error");
      const msg = err.response?.data?.message || "Không thể gửi báo cáo lúc này. Vui lòng thử lại sau.";
      Alert.alert("Lỗi", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.card}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleWrap}>
                  <Ionicons name="flag" size={18} color="#EA580C" />
                  <Text style={styles.title}>Báo cáo vi phạm</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.subtitle}>
                Hãy cho chúng tôi biết lý do bạn báo cáo{" "}
                {targetType === "post"
                  ? "bài viết này"
                  : targetType === "comment"
                  ? "bình luận này"
                  : targetType === "recipe"
                  ? "công thức này"
                  : "người dùng này"}
                {targetTitle ? ` ("${targetTitle}")` : ""}:
              </Text>

              {/* Reason list */}
              <View style={styles.reasonList}>
                {REASONS.map((r) => {
                  const isSelected = selectedReason === r.key;
                  return (
                    <TouchableOpacity
                      key={r.key}
                      style={[styles.reasonItem, isSelected && styles.reasonItemSelected]}
                      onPress={() => setSelectedReason(r.key)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={r.icon}
                        size={18}
                        color={isSelected ? "#EA580C" : "#64748B"}
                        style={{ marginRight: 10 }}
                      />
                      <Text
                        style={[styles.reasonLabel, isSelected && styles.reasonLabelSelected]}
                      >
                        {r.label}
                      </Text>
                      <View
                        style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}
                      >
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Additional notes */}
              <Text style={styles.descLabel}>Mô tả thêm (Tùy chọn)</Text>
              <TextInput
                style={styles.descInput}
                placeholder="Nhập thông tin chi tiết để chúng tôi xử lý nhanh hơn..."
                placeholderTextColor="#94A3B8"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={500}
              />

              {/* Actions */}
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
                  <Text style={styles.cancelBtnText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Gửi báo cáo</Text>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    maxWidth: 440,
    borderRadius: 24,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 16,
  },
  reasonList: {
    gap: 8,
    marginBottom: 14,
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    backgroundColor: "#F8FAFC",
  },
  reasonItemSelected: {
    borderColor: "#EA580C",
    backgroundColor: "#FFF7ED",
  },
  reasonLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: "#334155",
  },
  reasonLabelSelected: {
    color: "#EA580C",
    fontWeight: "700",
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },
  radioCircleSelected: {
    borderColor: "#EA580C",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EA580C",
  },
  descLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },
  descInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    color: "#0F172A",
    textAlignVertical: "top",
    minHeight: 70,
    marginBottom: 16,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },
  submitBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EA580C",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default ReportModal;
