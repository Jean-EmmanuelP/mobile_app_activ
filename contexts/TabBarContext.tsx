import React, { createContext, useContext, useRef } from 'react';
import { Animated } from 'react-native';

interface TabBarContextType {
  translateY: Animated.Value;
  hideTabBar: () => void;
  showTabBar: () => void;
  lastScrollY: React.MutableRefObject<number>;
}

const TabBarContext = createContext<TabBarContextType | undefined>(undefined);

export const TabBarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const isAnimating = useRef(false);

  const hideTabBar = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    
    Animated.spring(translateY, {
      toValue: 100,
      useNativeDriver: true,
      tension: 50,
      friction: 10,
    }).start(() => {
      isAnimating.current = false;
    });
  };

  const showTabBar = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 10,
    }).start(() => {
      isAnimating.current = false;
    });
  };

  return (
    <TabBarContext.Provider value={{ translateY, hideTabBar, showTabBar, lastScrollY }}>
      {children}
    </TabBarContext.Provider>
  );
};

export const useTabBar = () => {
  const context = useContext(TabBarContext);
  if (!context) {
    throw new Error('useTabBar must be used within a TabBarProvider');
  }
  return context;
};