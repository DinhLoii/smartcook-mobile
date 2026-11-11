import { BrandColors } from "@/constants/brandColors";
import authService from "@/services/authService";
import { triggerHaptic } from "@/utils/haptics";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
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

interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (visible) {
      setStep(1);
      setEmail("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setErrorMessage(null);
    }
  }, [visible]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  // Bước 1: Gửi OTP đến email
  const handleSendOtp = async () => {
    setErrorMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Vui lòng nhập địa chỉ email hợp lệ");
      return;
    }

    try {
      setIsLoading(true);
      await authService.forgotPassword(cleanEmail);
      triggerHaptic("success");
      setStep(2);
      setResendCountdown(60);
    } catch (err: any) {
      triggerHaptic("error");
      const msg = err.response?.data?.message || "Không thể gửi mã OTP. Vui lòng thử lại.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 2: Xác thực mã OTP 6 số
  const handleVerifyOtp = async () => {
    setErrorMessage(null);
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage("Mã OTP phải gồm đúng 6 chữ số");
      return;
    }

    try {
      setIsLoading(true);
      await authService.verifyOtp(email.trim().toLowerCase(), cleanOtp);
      triggerHaptic("success");
      setStep(3);
    } catch (err: any) {
      triggerHaptic("error");
      const msg = err.response?.data?.message || "Mã OTP không chính xác hoặc đã hết hạn.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 3: Đặt lại mật khẩu mới
  const handleResetPassword = async () => {
    setErrorMessage(null);
    if (newPassword.length < 6) {
      setErrorMessage("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      setIsLoading(true);
      await authService.resetPassword({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
      });
      triggerHaptic("success");
      Alert.alert(
        "Thành công! 🎉",
        "Mật khẩu của bạn đã được cập nhật thành công. Hãy đăng nhập với mật khẩu mới.",
        [
          {
            text: "Đăng nhập ngay",
            onPress: () => {
              onClose();
              if (onSuccess) onSuccess();
            },
          },
        ]
      );
    } catch (err: any) {
      triggerHaptic("error");
      const msg = err.response?.data?.message || "Đổi mật khẩu thất bại. Vui lòng thử lại.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.modalCard}
            >
              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>Bước {step}/3</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={BrandColors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.title}>
                {step === 1 && "Quên Mật Khẩu"}
                {step === 2 && "Nhập Mã OTP"}
                {step === 3 && "Đặt Lại Mật Khẩu"}
              </Text>
              <Text style={styles.subtitle}>
                {step === 1 && "Nhập email tài khoản để nhận mã OTP khôi phục 6 số."}
                {step === 2 && `Mã xác thực 6 số đã được gửi tới email ${email}`}
                {step === 3 && "Tạo mật khẩu mới cho tài khoản của bạn."}
              </Text>

              {/* Error banner */}
              {errorMessage && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#212121" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Step 1 Form */}
              {step === 1 && (
                <View style={styles.formContainer}>
                  <Text style={styles.inputLabel}>Địa chỉ Email</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="mail-outline" size={18} color={BrandColors.textPlaceholder} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="nguyenvana@gmail.com"
                      placeholderTextColor={BrandColors.textPlaceholder}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                    onPress={handleSendOtp}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Text style={styles.submitBtnText}>Gửi mã OTP</Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Step 2 Form */}
              {step === 2 && (
                <View style={styles.formContainer}>
                  <Text style={styles.inputLabel}>Mã xác thực OTP (6 chữ số)</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="key-outline" size={18} color={BrandColors.textPlaceholder} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.otpInput]}
                      placeholder="123456"
                      placeholderTextColor={BrandColors.textPlaceholder}
                      value={otp}
                      onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, "").slice(0, 6))}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>

                  <View style={styles.resendRow}>
                    {resendCountdown > 0 ? (
                      <Text style={styles.resendText}>Gửi lại mã sau {resendCountdown}s</Text>
                    ) : (
                      <TouchableOpacity onPress={handleSendOtp} disabled={isLoading}>
                        <Text style={styles.resendLink}>Gửi lại mã OTP</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                    onPress={handleVerifyOtp}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.submitBtnText}>Xác nhận OTP</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Step 3 Form */}
              {step === 3 && (
                <View style={styles.formContainer}>
                  <Text style={styles.inputLabel}>Mật khẩu mới</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="lock-closed-outline" size={18} color={BrandColors.textPlaceholder} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Ít nhất 6 ký tự"
                      placeholderTextColor={BrandColors.textPlaceholder}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={18}
                        color={BrandColors.textPlaceholder}
                      />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>Xác nhận mật khẩu</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={BrandColors.textPlaceholder} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Nhập lại mật khẩu mới"
                      placeholderTextColor={BrandColors.textPlaceholder}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                    onPress={handleResetPassword}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.submitBtnText}>Cập nhật mật khẩu</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
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
    backgroundColor: "rgba(27, 27, 27, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: BrandColors.surfaceCard,
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  stepBadge: {
    backgroundColor: "#EAEAEA",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: BrandColors.textDark,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: BrandColors.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F4F4",
    borderWidth: 1,
    borderColor: "#DADADA",
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: "#212121",
    flex: 1,
    fontWeight: "500",
  },
  formContainer: {
    gap: 10,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: BrandColors.textBody,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.background,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 6,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: Platform.OS === "web" ? 16 : 14,
    color: BrandColors.textDark,
    height: "100%",
  },
  otpInput: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 4,
  },
  resendRow: {
    alignItems: "flex-end",
    marginBottom: 8,
  },
  resendText: {
    fontSize: 12,
    color: BrandColors.textPlaceholder,
  },
  resendLink: {
    fontSize: 12,
    fontWeight: "700",
    color: BrandColors.textDark,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#171717",
    borderRadius: 14,
    height: 48,
    marginTop: 8,
    gap: 8,
    shadowColor: "#171717",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default ForgotPasswordModal;
