import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Animated, Platform } from 'react-native';

export interface AnimatedTabBarRef {
  hide: () => void;
  show: () => void;
}

interface AnimatedTabBarProps {
  children: React.ReactNode;
}

export const AnimatedTabBar = forwardRef<AnimatedTabBarRef, AnimatedTabBarProps>(
  ({ children }, ref) => {
    const translateY = useRef(new Animated.Value(0)).current;

    useImperativeHandle(ref, () => ({
      hide: () => {
        Animated.timing(translateY, {
          toValue: 100,
          duration: 250,
          useNativeDriver: true,
        }).start();
      },
      show: () => {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
      },
    }));

    return (
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          transform: [{ translateY }],
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          height: Platform.OS === 'ios' ? 85 : 60,
          paddingBottom: Platform.OS === 'ios' ? 20 : 0,
        }}
      >
        {children}
      </Animated.View>
    );
  }
);