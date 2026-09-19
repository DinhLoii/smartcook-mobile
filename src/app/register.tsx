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
import { BrandColors } from '@/constants/brandColors';

export default function RegisterScreen() {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    repeatPassword?: string;
    terms?: string;
  }>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleRegister = () => {
    const newErrors: typeof errors = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'Please enter your first name';
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Please enter your last name';
    }

    if (!email.trim()) {
      newErrors.email = 'Please enter your email address';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Please enter a password';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!repeatPassword) {
      newErrors.repeatPassword = 'Please confirm your password';
    } else if (repeatPassword !== password) {
      newErrors.repeatPassword = 'Passwords do not match';
    }

    if (!agreeTerms) {
      newErrors.terms = 'Please accept Terms and Privacy policy';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.terms) {
        Alert.alert('Terms & Privacy', newErrors.terms);
      }
      return;
    }

    setErrors({});
    setShowSuccessModal(true);
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
              style={styles.createButtonWrapper}
              onPress={handleRegister}>
              <LinearGradient
                colors={BrandColors.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createButtonGradient}>
                <Text style={styles.createButtonText}>Create account</Text>
                <Ionicons name="arrow-forward" size={17} color="#FFFFFF" style={{ marginLeft: 6 }} />
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
