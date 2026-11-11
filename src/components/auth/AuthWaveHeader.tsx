import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/brandColors';

interface AuthWaveHeaderProps {
  title: string;
  subtitle?: string;
  height?: number;
}

export const AuthWaveHeader: React.FC<AuthWaveHeaderProps> = ({
  title,
  subtitle,
  height,
}) => {
  const { width, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Responsive header height: ~21% of screen + safe inset
  const headerHeight = height ?? Math.round(Math.min(screenHeight * 0.21, 145) + insets.top);
  const waveHeight = 38;

  // Dual wave paths for depth and fluid layered aesthetic
  const backWavePath = `M0,10 C${width * 0.22},${waveHeight * 1.25} ${width * 0.58},${waveHeight * 0.1} ${width},${waveHeight * 0.85} L${width},${waveHeight} L0,${waveHeight} Z`;
  const frontWavePath = `M0,0 C${width * 0.32},${waveHeight * 1.1} ${width * 0.68},0 ${width},${waveHeight * 0.7} L${width},${waveHeight} L0,${waveHeight} Z`;

  return (
    <View style={[styles.container, { height: headerHeight }]}>
      {/* Sunset Vibrant Mesh Gradient */}
      <LinearGradient
        colors={BrandColors.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}>
        {/* Ambient Decorative Orbs */}
        <View style={styles.ambientOrbLeft} pointerEvents="none" />
        <View style={styles.ambientOrbRight} pointerEvents="none" />

        {/* Content Area */}
        <View style={[styles.headerContent, { paddingTop: insets.top + 4 }]}>
          {/* SmartCook Brand Micro Badge */}
          <View style={styles.brandBadge}>
            <MaterialCommunityIcons name="chef-hat" size={15} color="#FFFFFF" />
            <Text style={styles.brandText}>SmartCook</Text>
          </View>

          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        {/* Dual-Layered Wave Divider */}
        <View style={[styles.waveContainer, { height: waveHeight }]} pointerEvents="none">
          <Svg
            width={width}
            height={waveHeight}
            viewBox={`0 0 ${width} ${waveHeight}`}
            style={styles.waveSvg}
            pointerEvents="none">
            {/* Background Wave with Soft Opacity */}
            <Path d={backWavePath} fill="rgba(255, 255, 255, 0.32)" />
            {/* Foreground Crisp White Wave */}
            <Path d={frontWavePath} fill={BrandColors.background} />
          </Svg>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  ambientOrbLeft: {
    position: 'absolute',
    top: -30,
    left: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  ambientOrbRight: {
    position: 'absolute',
    bottom: 20,
    right: -35,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(54, 54, 54, 0.18)',
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  brandText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
    textAlign: 'center',
    textShadowColor: 'rgba(41, 41, 41, 0.25)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
  },
  waveContainer: {
    width: '100%',
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
  },
  waveSvg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
});
