import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { BrandColors } from '@/constants/brandColors';

interface AuthWaveFooterProps {
  promptText: string;
  actionText: string;
  onPress: () => void;
  height?: number;
}

export const AuthWaveFooter: React.FC<AuthWaveFooterProps> = ({
  promptText,
  actionText,
  onPress,
  height,
}) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const waveHeight = 28;
  const bottomPadding = Math.max(insets.bottom, 16);
  const footerHeight = (height ?? 58) + bottomPadding;

  // Dual inverted wave paths for top of footer
  const backWavePath = `M0,0 L0,${waveHeight} C${width * 0.4},${waveHeight * 0.3} ${width * 0.75},${waveHeight * 1.05} ${width},0 L${width},0 Z`;
  const frontWavePath = `M0,0 L0,${waveHeight} C${width * 0.32},${waveHeight * 0.15} ${width * 0.68},${waveHeight * 0.9} ${width},0 L${width},0 Z`;

  return (
    <View style={[styles.container, { height: footerHeight }]}>
      {/* Sunset Footer Gradient */}
      <LinearGradient
        colors={BrandColors.footerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}>
        {/* Top Dual Wave Divider cutting into footer */}
        <View style={[styles.waveContainer, { height: waveHeight }]} pointerEvents="none">
          <Svg
            width={width}
            height={waveHeight}
            viewBox={`0 0 ${width} ${waveHeight}`}
            style={styles.waveSvg}
            pointerEvents="none">
            <Path d={backWavePath} fill="rgba(255, 255, 255, 0.28)" />
            <Path d={frontWavePath} fill="#FFFFFF" />
          </Svg>
        </View>

        {/* Link Content with Safe Area Padding */}
        <View style={[styles.content, { paddingBottom: bottomPadding, paddingTop: 12 }]}>
          <Text style={styles.promptText}>{promptText} </Text>
          <TouchableOpacity activeOpacity={0.75} onPress={onPress}>
            <Text style={styles.actionText}>{actionText}</Text>
          </TouchableOpacity>
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
  waveContainer: {
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  waveSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  promptText: {
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.92)',
    fontWeight: '500',
  },
  actionText: {
    fontSize: 13.5,
    color: '#FFF9C4', // Soft Golden Sunlight Highlight
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});
