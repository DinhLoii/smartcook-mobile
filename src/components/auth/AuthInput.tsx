import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
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
        {/* Leading Icon (pointerEvents="none" so it doesn't block tap) */}
        {iconName && (
          <View style={styles.leadingIcon} pointerEvents="none">
            <Ionicons
              name={iconName}
              size={18}
              color={isFocused ? BrandColors.primary : '#94A3B8'}
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
            activeOpacity={0.7}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={19}
              color={isFocused ? BrandColors.primary : '#64748B'}
            />
          </TouchableOpacity>
        )}
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    width: '100%',
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    height: 44,
    paddingHorizontal: 12,
  },
  inputWrapperFocused: {
    borderColor: BrandColors.primary,
    backgroundColor: '#FFFFFF',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 2,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
  },
  leadingIcon: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    color: '#1E293B',
    height: 44,
    paddingVertical: 0,
  },
  eyeIconContainer: {
    paddingLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  errorText: {
    fontSize: 11.5,
    color: '#EF4444',
    marginTop: 3,
    marginLeft: 4,
  },
});
