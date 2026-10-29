import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/brandColors';

interface AuthInputProps extends TextInputProps {
  label: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
  error?: string;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  label,
  iconName,
  isPassword = false,
  error,
  style,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {/* Pressable wrapper: tapping anywhere focuses the TextInput */}
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          Boolean(error) && styles.inputWrapperError,
        ]}>
        {/* Leading Icon */}
        {iconName && (
          <View style={styles.leadingIcon} pointerEvents="none">
            <Ionicons
              name={iconName}
              size={19}
              color={
                Boolean(error)
                  ? '#EF4444'
                  : isFocused
                    ? BrandColors.primary
                    : '#94A3B8'
              }
            />
          </View>
        )}

        <TextInput
          ref={inputRef}
          style={[styles.input, style]}
          placeholderTextColor="#94A3B8"
          secureTextEntry={isPassword && !showPassword}
          onFocus={handleFocus}
          onBlur={handleBlur}
          showSoftInputOnFocus={true}
          editable={true}
          autoCapitalize={isPassword ? 'none' : rest.autoCapitalize}
          {...rest}
        />

        {/* Trailing Password Eye Toggle */}
        {isPassword && (
          <TouchableOpacity
            style={styles.eyeIconContainer}
            activeOpacity={0.6}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={19}
              color={showPassword ? BrandColors.primary : '#94A3B8'}
            />
          </TouchableOpacity>
        )}
      </Pressable>

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    height: 48,
    paddingHorizontal: 14,
  },
  inputWrapperFocused: {
    borderColor: BrandColors.primary,
    backgroundColor: '#FFFFFF',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
    backgroundColor: '#FFFFFF',
  },
  leadingIcon: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    color: '#0F172A',
    height: '100%',
    paddingVertical: 0,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          boxShadow: 'none',
        } as any)
      : {}),
  },
  eyeIconContainer: {
    paddingLeft: 8,
    paddingRight: 2,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 2,
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
});
