import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { FontAwesome5 } from '@expo/vector-icons';
import { BrandColors } from '@/constants/brandColors';

interface SocialAuthButtonsProps {
  onGooglePress?: () => void;
  onFacebookPress?: () => void;
}

/**
 * Official 4-Color Google "G" Vector Logo
 * Exact geometry and colors used by Google Sign-In: Red, Yellow, Green, Blue
 */
export const OfficialGoogleLogo: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    {/* Blue segment */}
    <Path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    {/* Green segment */}
    <Path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    {/* Yellow segment */}
    <Path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    {/* Red segment */}
    <Path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </Svg>
);

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({
  onGooglePress,
  onFacebookPress,
}) => {
  return (
    <View style={styles.container}>
      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or connect with</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Social Buttons */}
      <View style={styles.socialRow}>
        {/* Google Official 4-Color Logo Button */}
        <TouchableOpacity
          style={styles.socialItem}
          activeOpacity={0.8}
          onPress={onGooglePress}>
          <View style={styles.googleIconBox}>
            <OfficialGoogleLogo size={22} />
          </View>
          <Text style={styles.socialLabel}>Google</Text>
        </TouchableOpacity>

        {/* Facebook Button */}
        <TouchableOpacity
          style={styles.socialItem}
          activeOpacity={0.8}
          onPress={onFacebookPress}>
          <View style={styles.facebookIconBox}>
            <FontAwesome5 name="facebook-f" size={19} color="#FFFFFF" />
          </View>
          <Text style={styles.socialLabel}>Facebook</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 12,
    marginBottom: 4,
    alignItems: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    marginBottom: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 36,
  },
  socialItem: {
    alignItems: 'center',
  },
  googleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BrandColors.surfaceCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 4,
  },
  facebookIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1877F2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1877F2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 4,
  },
  socialLabel: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
});
