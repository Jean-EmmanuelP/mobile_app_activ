import React, { useRef, useEffect, useCallback } from 'react';
import { 
  Animated, 
  ScrollView, 
  ScrollViewProps, 
  NativeSyntheticEvent, 
  NativeScrollEvent,
  Platform 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface AnimatedScrollViewProps extends ScrollViewProps {
  children: React.ReactNode;
}

export const AnimatedScrollView: React.FC<AnimatedScrollViewProps> = ({ 
  children, 
  contentContainerStyle,
  ...props 
}) => {
  const navigation = useNavigation();
  const scrollY = useRef(0);
  const lastScrollY = useRef(0);
  const translateY = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  const hideTabBar = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    
    Animated.timing(translateY, {
      toValue: 100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      navigation.setOptions({
        tabBarStyle: {
          transform: [{ translateY: 100 }],
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 8,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          height: Platform.OS === 'ios' ? 85 : 60,
          paddingBottom: Platform.OS === 'ios' ? 20 : 0,
        },
      });
      isAnimating.current = false;
    });
  }, [navigation, translateY]);

  const showTabBar = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    
    Animated.timing(translateY, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      navigation.setOptions({
        tabBarStyle: {
          transform: [{ translateY: 0 }],
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 8,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          height: Platform.OS === 'ios' ? 85 : 60,
          paddingBottom: Platform.OS === 'ios' ? 20 : 0,
        },
      });
      isAnimating.current = false;
    });
  }, [navigation, translateY]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    scrollY.current = currentScrollY;
    
    // Déterminer la direction du scroll
    const scrollDiff = currentScrollY - lastScrollY.current;
    
    if (scrollDiff > 10 && currentScrollY > 50) {
      // Scrolling down - hide tab bar
      hideTabBar();
    } else if (scrollDiff < -10) {
      // Scrolling up - show tab bar
      showTabBar();
    }
    
    lastScrollY.current = currentScrollY;
    
    // Call the original onScroll if provided
    if (props.onScroll) {
      props.onScroll(event);
    }
  };

  // Set initial tabbar style and reset on unmount
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        elevation: 8,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        height: Platform.OS === 'ios' ? 85 : 60,
        paddingBottom: Platform.OS === 'ios' ? 20 : 0,
      },
    });

    return () => {
      // Reset tabbar visibility when component unmounts
      showTabBar();
    };
  }, [navigation, showTabBar]);

  return (
    <ScrollView
      {...props}
      contentContainerStyle={[
        { paddingBottom: Platform.OS === 'ios' ? 100 : 80 },
        contentContainerStyle
      ]}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
};