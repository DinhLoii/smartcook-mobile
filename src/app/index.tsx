import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { BrandColors } from '@/constants/brandColors';

import { useAuth } from '@/contexts/AuthContext';

export default function WelcomeSplashScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isAuthenticated, isLoading } = useAuth();

  // Animation values (stable instance initialized once, satisfying React Compiler rules)
  const [scaleAnim] = useState(() => new Animated.Value(0.7));
  const [opacityAnim] = useState(() => new Animated.Value(0));
  const [dotsAnim] = useState(() => new Animated.Value(0));

  const navigateNext = () => {
    if (isLoading) return;
    if (isAuthenticated) {
      router.replace('/home');
    } else {
      router.replace('/login');
    }
  };

  useEffect(() => {
    // Entrance animation: Pop up logo and fade in text
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for loading indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotsAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(dotsAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Auto transition to appropriate screen after 2.3 seconds
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        router.replace('/home');
      } else {
        router.replace('/login');
      }
    }, 2300);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading]);

  return (
    <Pressable style={styles.screen} onPress={navigateNext}>
      <StatusBar style="dark" />

      {/* Decorative ambient background rings */}
      <View style={styles.ambientCircleOuter} />
      <View style={styles.ambientCircleInner} />

      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}>
        {/* Centered SmartCook 3D Badge Logo */}
        <View style={styles.logoWrapper}>
          <LinearGradient
            colors={BrandColors.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradient}>
            {/* Chef Hat & Culinary Spark Vector */}
            <Svg width={54} height={54} viewBox="0 0 48 48" fill="none">
              <Defs>
                <RadialGradient id="sparkGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#FFF9C4" />
                  <Stop offset="100%" stopColor="#FFA726" />
                </RadialGradient>
              </Defs>
              {/* Chef Hat Outline & Pleats */}
              <Path
                d="M12 24 C8 24 6 21 6 17.5 C6 13.5 9 11 13 11 C13.5 11 14 11.1 14.5 11.3 C15.5 7.5 19.5 5 24 5 C28.5 5 32.5 7.5 33.5 11.3 C34 11.1 34.5 11 35 11 C39 11 42 13.5 42 17.5 C42 21 40 24 36 24 Z"
                fill="#FFFFFF"
              />
              {/* Chef Hat Band */}
              <Path
                d="M12 26 C12 24.5 13.5 24 15 24 L33 24 C34.5 24 36 24.5 36 26 L35 34 C35 35 34 36 33 36 L15 36 C14 36 13 35 13 34 Z"
                fill="#FFFFFF"
              />
              {/* Hat Band Lines */}
              <Path d="M16 28 L32 28" stroke="#FF5722" strokeWidth="2" strokeLinecap="round" />
              <Path d="M16 32 L32 32" stroke="#FFA726" strokeWidth="1.5" strokeLinecap="round" />

              {/* Sparkle Star */}
              <Circle cx="39" cy="8" r="3" fill="url(#sparkGlow)" />
              <Path
                d="M39 3 L39.8 6.5 L43 7 L40 9 L40.5 12 L38.5 10 L35.5 11 L37 8.5 Z"
                fill="#FFF9C4"
              />
            </Svg>
          </LinearGradient>
        </View>

        {/* Centered Creative Greeting */}
        <Text style={styles.heyCookerTitle}>Hey Cooker! 👨‍🍳</Text>
        <Text style={styles.questionSubtitle}>Hôm nay bạn muốn nấu gì?</Text>
        <Text style={styles.descriptionText}>
          Trợ lý SmartCook đã sẵn sàng cùng bạn tạo nên những bữa ăn thơm ngon & thông minh.
        </Text>

        {/* Pulsing Dots Indicator */}
        <View style={styles.indicatorContainer}>
          <View style={[styles.dot, { backgroundColor: BrandColors.primary }]} />
          <Animated.View
            style={[
              styles.dot,
              {
                backgroundColor: BrandColors.primaryLight,
                opacity: dotsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 1],
                }),
              },
            ]}
          />
          <View style={[styles.dot, { backgroundColor: BrandColors.secondaryGold }]} />
        </View>
      </Animated.View>

      {/* Touch to skip prompt */}
      <View style={styles.footerPrompt}>
        <Text style={styles.skipHintText}>Chạm vào màn hình để bắt đầu →</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  ambientCircleOuter: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(255, 107, 53, 0.04)',
  },
  ambientCircleInner: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(255, 167, 38, 0.06)',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoWrapper: {
    marginBottom: 24,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  logoGradient: {
    width: 96,
    height: 96,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heyCookerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.4,
    textAlign: 'center',
    marginBottom: 6,
  },
  questionSubtitle: {
    fontSize: 17,
    fontWeight: '700',
    color: BrandColors.primary,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  descriptionText: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
    marginBottom: 32,
    fontWeight: '400',
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footerPrompt: {
    position: 'absolute',
    bottom: 36,
  },
  skipHintText: {
    fontSize: 12.5,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
