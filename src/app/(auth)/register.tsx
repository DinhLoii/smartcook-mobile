import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import {
  AuthInput,
  AuthWaveFooter,
  AuthWaveHeader,
  SuccessModal,
} from '@/components/auth';
import { ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { BrandColors } from '@/constants/brandColors';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    repeatPassword?: string;
    terms?: string;
  }>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleRegister = async () => {
    const newErrors: typeof errors = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'Vui lòng nhập tên của bạn';
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Vui lòng nhập họ của bạn';
    }

    if (!email.trim()) {
      newErrors.email = 'Vui lòng nhập địa chỉ email';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Địa chỉ email không hợp lệ';
    }

    if (!password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (!repeatPassword) {
      newErrors.repeatPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (repeatPassword !== password) {
      newErrors.repeatPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (!agreeTerms) {
      newErrors.terms = 'Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.terms) {
        Alert.alert('Điều khoản & Quyền riêng tư', newErrors.terms);
      }
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      setShowSuccessModal(true);
    } catch (err: any) {
      const serverMessage =
        err.response?.data?.message ||
        "Đăng ký thất bại. Email có thể đã được sử dụng.";
      Alert.alert("Lỗi đăng ký", serverMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          {/* Top Sunset Dual-Wave Header */}
          <AuthWaveHeader title="Create Account" />

          {/* Form Card Content */}
          <View style={styles.formContainer}>
            <View style={styles.nameRow}>
              <View style={styles.halfWidth}>
                <AuthInput
                  label="First Name"
                  iconName="person-outline"
                  placeholder="First name"
                  value={firstName}
                  onChangeText={(text) => {
                    setFirstName(text);
                    if (errors.firstName) setErrors((prev) => ({ ...prev, firstName: undefined }));
                  }}
                  error={errors.firstName}
                />
              </View>
              <View style={styles.halfWidth}>
                <AuthInput
                  label="Last Name"
                  iconName="person-outline"
                  placeholder="Last name"
                  value={lastName}
                  onChangeText={(text) => {
                    setLastName(text);
                    if (errors.lastName) setErrors((prev) => ({ ...prev, lastName: undefined }));
                  }}
                  error={errors.lastName}
                />
              </View>
            </View>

            <AuthInput
              label="Email"
              iconName="mail-outline"
              placeholder="name@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
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
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              isPassword
              error={errors.password}
            />

            <AuthInput
              label="Repeat Password"
              iconName="shield-checkmark-outline"
              placeholder="••••••••"
              value={repeatPassword}
              onChangeText={(text) => {
                setRepeatPassword(text);
                if (errors.repeatPassword)
                  setErrors((prev) => ({ ...prev, repeatPassword: undefined }));
              }}
              isPassword
              error={errors.repeatPassword}
            />

            {/* Create Account Primary Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.createButtonWrapper, isSubmitting && { opacity: 0.8 }]}
              onPress={handleRegister}
              disabled={isSubmitting}>
              <LinearGradient
                colors={BrandColors.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createButtonGradient}>
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ paddingVertical: 1 }} />
                ) : (
                  <>
                    <Text style={styles.createButtonText}>Create account</Text>
                    <Ionicons name="arrow-forward" size={17} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Terms and Privacy Checkbox */}
            <TouchableOpacity
              style={styles.checkboxRow}
              activeOpacity={0.7}
              onPress={() => {
                setAgreeTerms(!agreeTerms);
                if (errors.terms) setErrors((prev) => ({ ...prev, terms: undefined }));
              }}>
              <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                {agreeTerms && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>
                I agree with{' '}
                <Text style={styles.termsHighlight}>Terms and Privacy</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Sunset Dual-Wave Footer */}
          <AuthWaveFooter
            promptText="have an account?"
            actionText="Login"
            onPress={() => router.push('/login')}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Verification / Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title="Your identity has been verified"
        message="Account created successfully! Welcome to SmartCook community."
        onDone={() => {
          setShowSuccessModal(false);
          router.replace('/onboarding-survey');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  nameRow: {
    flexDirection: 'row',
    gap: 10,
  },
  halfWidth: {
    flex: 1,
  },
  createButtonWrapper: {
    marginTop: 6,
    marginBottom: 10,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  createButtonGradient: {
    flexDirection: 'row',
    paddingVertical: 10.5,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  checkboxLabel: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  termsHighlight: {
    color: '#E65100',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
