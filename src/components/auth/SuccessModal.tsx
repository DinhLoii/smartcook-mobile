import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/brandColors';

interface SuccessModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  onDone: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  title = 'Your identity has been verified',
  message = 'Welcome to SmartCook! Your culinary journey begins now.',
  onDone,
}) => {
  const { width } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { width: Math.min(width * 0.88, 380) }]}>
          {/* Sunset Orange Gradient Header Accent */}
          <LinearGradient
            colors={BrandColors.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.illustrationContainer}>
            <View style={styles.deviceFrame}>
              <MaterialCommunityIcons name="chef-hat" size={60} color="#FFFFFF" />
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark-circle" size={32} color={BrandColors.accentMint} />
              </View>
            </View>
          </LinearGradient>

          {/* Title & Message */}
          <View style={styles.body}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            {/* Done Button */}
            <TouchableOpacity
              style={styles.doneButtonWrapper}
              activeOpacity={0.85}
              onPress={onDone}>
              <LinearGradient
                colors={BrandColors.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.doneButtonGradient}>
                <Text style={styles.doneText}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(27, 27, 27, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: BrandColors.surfaceCard,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    alignItems: 'center',
  },
  illustrationContainer: {
    width: '100%',
    height: 155,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceFrame: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBadge: {
    position: 'absolute',
    bottom: -6,
    right: -12,
    backgroundColor: BrandColors.surfaceCard,
    borderRadius: 16,
    padding: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  body: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 26,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: BrandColors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 22,
  },
  doneButtonWrapper: {
    width: '100%',
    borderRadius: 22,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  doneButtonGradient: {
    paddingVertical: 12,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
