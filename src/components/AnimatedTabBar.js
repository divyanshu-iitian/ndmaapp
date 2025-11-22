import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, useWindowDimensions } from 'react-native';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedTabBar = ({ style, ...props }) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 14,
        stiffness: 120,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const responsiveHorizontalPadding = (() => {
    if (width >= 900) return (width - 640) / 2;
    if (width >= 600) return 32;
    if (width >= 380) return 20;
    return 12;
  })();

  const flattenedStyle = StyleSheet.flatten(style) || {};

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 6),
          paddingHorizontal: responsiveHorizontalPadding,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <BottomTabBar
        {...props}
        style={[styles.tabBar, style, flattenedStyle]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  tabBar: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 0,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    backgroundColor: '#FFFFFF',
  },
});

export default AnimatedTabBar;
