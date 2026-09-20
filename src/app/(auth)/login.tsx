import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";

import {
  AuthInput,
  AuthWaveFooter,
  AuthWaveHeader,
  OfficialGoogleLogo,
  SocialAuthButtons,
} from "@/components/auth";
import { BrandColors } from "@/constants/brandColors";
import { ActivityIndicator } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { ENV } from "@/config/env";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: ENV.GOOGLE_WEB_CLIENT_ID,
    webClientId: ENV.GOOGLE_WEB_CLIENT_ID,
    androidClientId: ENV.GOOGLE_WEB_CLIENT_ID,
    iosClientId: ENV.GOOGLE_WEB_CLIENT_ID,
  });

  // Handle Google OAuth response
  useEffect(() => {
    const processGoogleResponse = async () => {
      if (response?.type === "success") {
        const idToken =
          (response.params as any)?.id_token ||
          (response as any)?.authentication?.idToken;

        if (idToken) {
          setIsGoogleSubmitting(true);
          setServerError(null);
          try {
            const user = await loginWithGoogle(idToken);
            if (user?.preferences?.hasCompletedSurvey) {
              router.replace("/home");
            } else {
              router.replace("/onboarding-survey");
            }
          } catch (err: any) {
            const serverMessage =
              err.response?.data?.message ||
              "Đăng nhập bằng Google thất bại. Vui lòng thử lại.";
            setServerError(serverMessage);
          } finally {
            setIsGoogleSubmitting(false);
          }
        }
      }
    };

    processGoogleResponse();
  }, [response]);

  const handleLogin = async () => {
    setServerError(null);
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Vui lòng nhập địa chỉ email";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Địa chỉ email không hợp lệ";
    }

    if (!password) {
      newErrors.password = "Vui lòng nhập mật khẩu";
    } else if (password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const user = await login({
        email: email.trim().toLowerCase(),
        password,
      });

      // Nếu người dùng đã hoàn thành khảo sát khẩu vị thì vào thẳng Home
      if (user?.preferences?.hasCompletedSurvey) {
        router.replace("/home");
      } else {
        router.replace("/onboarding-survey");
      }
    } catch (err: any) {
      const rawMessage = err.response?.data?.message;
      const friendlyMessage =
        rawMessage === "Invalid email or password"
          ? "Email hoặc mật khẩu không chính xác"
          : (rawMessage || "Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.");
      
      // Hiển thị lỗi màu đỏ rõ ràng ngay dưới ô mật khẩu và banner thông báo
      setServerError(friendlyMessage);
      setErrors((prev) => ({ ...prev, password: friendlyMessage }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      "Forgot Password",
      "Password reset instructions will be sent to your email address.",
      [{ text: "OK" }],
    );
  };

  const [isGoogleModalVisible, setIsGoogleModalVisible] = useState(false);

  const handleOpenGoogleModal = () => {
    setServerError(null);
    setIsGoogleModalVisible(true);
  };

  const handleDevGoogleLogin = async () => {
    setIsGoogleModalVisible(false);
    setIsGoogleSubmitting(true);
    setServerError(null);
    try {
      const user = await loginWithGoogle("dev_mock_google_id_token");
      if (user?.preferences?.hasCompletedSurvey) {
        router.replace("/home");
      } else {
        router.replace("/onboarding-survey");
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || "Đăng nhập Google test thất bại";
      setServerError(msg);
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleRealGoogleOAuth = async () => {
    setIsGoogleModalVisible(false);
    if (!promptAsync) {
      setServerError(
        "Dịch vụ Google Sign-In đang khởi động hoặc chưa sẵn sàng trên trình duyệt này.",
      );
      return;
    }
    try {
      await promptAsync();
    } catch (err: any) {
      setServerError(err?.message || "Không thể mở giao diện đăng nhập Google.");
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Top Sunset Dual-Wave Header */}
          <AuthWaveHeader title="Login" />

          {/* Form Card Content */}
          <View style={styles.formContainer}>
            {/* Server Error Banner in Red */}
            {serverError ? (
              <View style={styles.serverErrorBanner}>
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color="#DC2626"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.serverErrorBannerText}>{serverError}</Text>
              </View>
            ) : null}

            <AuthInput
              label="Email"
              iconName="mail-outline"
              placeholder="name@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (serverError) setServerError(null);
                if (errors.email)
                  setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            <AuthInput
              label="Password"
              iconName="lock-closed-outline"
              placeholder="••••••••"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (serverError) setServerError(null);
                if (errors.password)
                  setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              isPassword
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              error={errors.password}
            />

            {/* Remember Me Checkbox */}
            <TouchableOpacity
              style={styles.checkboxRow}
              activeOpacity={0.7}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View
                style={[styles.checkbox, rememberMe && styles.checkboxChecked]}
              >
                {rememberMe && (
                  <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>Remember me</Text>
            </TouchableOpacity>

            {/* Action Row: Forgot Password (Left) & Login Button (Right) */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forget password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.loginButtonWrapper, isSubmitting && { opacity: 0.8 }]}
                onPress={handleLogin}
                disabled={isSubmitting}
              >
                <LinearGradient
                  colors={BrandColors.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginButtonGradient}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ paddingHorizontal: 12 }} />
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>Login</Text>
                      <Ionicons
                        name="arrow-forward"
                        size={16}
                        color="#FFFFFF"
                        style={{ marginLeft: 4 }}
                      />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Social Logins */}
            <SocialAuthButtons
              onGooglePress={handleOpenGoogleModal}
              onFacebookPress={() =>
                Alert.alert(
                  "Thông báo",
                  "Tính năng Facebook Login đang được phát triển.",
                )
              }
            />
          </View>

          {/* Bottom Sunset Dual-Wave Footer */}
          <AuthWaveFooter
            promptText="Don't have account?"
            actionText="Sign Up"
            onPress={() => router.push("/register")}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Google Auth Loading Overlay */}
      {isGoogleSubmitting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingOverlayText}>Đang xác thực tài khoản Google...</Text>
        </View>
      )}

      {/* Google Sign-In In-App Modal (Works 100% on Web, Android & iOS) */}
      <Modal
        visible={isGoogleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsGoogleModalVisible(false)}
      >
        <View style={styles.googleModalBackdrop}>
          <View style={styles.googleModalCard}>
            <View style={styles.googleModalHeader}>
              <OfficialGoogleLogo size={26} />
              <Text style={styles.googleModalTitle}>Đăng nhập với Google</Text>
            </View>

            <Text style={styles.googleModalSubtitle}>
              Chọn phương thức để tiếp tục xác thực:
            </Text>

            {/* Option 1: Instant Dev Test Mode */}
            <TouchableOpacity
              style={styles.googleOptionBtn}
              activeOpacity={0.8}
              onPress={handleDevGoogleLogin}
            >
              <View style={[styles.googleOptionIcon, { backgroundColor: "#FFF7ED" }]}>
                <Ionicons name="flash" size={20} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.googleOptionTitle}>
                  Tài khoản Google Test (1-Click Dev)
                </Text>
                <Text style={styles.googleOptionDesc}>
                  Đăng nhập tức thì không bị Google Console chặn, lưu tài khoản vào MongoDB Atlas.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Option 2: Real Google OAuth Flow */}
            <TouchableOpacity
              style={styles.googleOptionBtn}
              activeOpacity={0.8}
              onPress={handleRealGoogleOAuth}
            >
              <View style={[styles.googleOptionIcon, { backgroundColor: "#EFF6FF" }]}>
                <Ionicons name="globe-outline" size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.googleOptionTitle}>
                  Google OAuth (Mở trình duyệt)
                </Text>
                <Text style={styles.googleOptionDesc}>
                  Xác thực bằng tài khoản Google cá nhân của bạn qua Google OAuth 2.0 SDK.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.googleCloseBtn}
              onPress={() => setIsGoogleModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.googleCloseBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 0,
    marginBottom: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  checkboxLabel: {
    fontSize: 12.5,
    color: "#64748B",
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  forgotPasswordText: {
    fontSize: 12.5,
    color: "#64748B", // Warm Gourmet Tangerine
    fontWeight: "600",
  },
  loginButtonWrapper: {
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  loginButtonGradient: {
    flexDirection: "row",
    paddingHorizontal: 28,
    paddingVertical: 9,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loadingOverlayText: {
    marginTop: 12,
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  serverErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  serverErrorBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#DC2626",
    lineHeight: 18,
  },

  /* Google Auth In-App Modal */
  googleModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  googleModalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  googleModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  googleModalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  googleModalSubtitle: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 16,
  },
  googleOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  googleOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  googleOptionTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  googleOptionDesc: {
    fontSize: 11.5,
    color: "#64748B",
    lineHeight: 16,
  },
  googleCloseBtn: {
    marginTop: 6,
    paddingVertical: 10,
    alignItems: "center",
  },
  googleCloseBtnText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#64748B",
  },
});
