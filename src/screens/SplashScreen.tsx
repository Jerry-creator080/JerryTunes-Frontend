import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useThemeContext } from '../context/ThemeContext';
import { palette } from '../theme/colors';

export const SplashScreen = () => {
  const { isDark } = useThemeContext();
  const scaleValue = useRef(new Animated.Value(0.8)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.2)),
      }),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? palette.black : palette.offWhite }]}>
      <Animated.View style={[styles.logoContainer, { opacity: opacityValue, transform: [{ scale: scaleValue }] }]}>
        {/* Minimal Custom Logo Mark */}
        <View style={styles.logoMark}>
          <View style={styles.bar1} />
          <View style={styles.bar2} />
          <View style={styles.bar3} />
        </View>
        <Text style={[styles.logoText, { color: isDark ? palette.white : palette.black }]}>
          Jerry<Text style={{ color: palette.jerryRed }}>Tunes</Text>
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoMark: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 40,
    marginBottom: 16,
  },
  bar1: {
    width: 8,
    height: 24,
    backgroundColor: palette.jerryRed,
    marginHorizontal: 4,
    borderRadius: 4,
  },
  bar2: {
    width: 8,
    height: 40,
    backgroundColor: palette.jerryRed,
    marginHorizontal: 4,
    borderRadius: 4,
  },
  bar3: {
    width: 8,
    height: 16,
    backgroundColor: palette.jerryRed,
    marginHorizontal: 4,
    borderRadius: 4,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
