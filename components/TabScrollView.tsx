import React from 'react';
import { 
  ScrollView, 
  ScrollViewProps, 
  NativeSyntheticEvent, 
  NativeScrollEvent,
  Platform 
} from 'react-native';
import { useTabBar } from '@/contexts/TabBarContext';

interface TabScrollViewProps extends ScrollViewProps {
  children: React.ReactNode;
}

export const TabScrollView: React.FC<TabScrollViewProps> = ({ 
  children, 
  contentContainerStyle,
  ...props 
}) => {
  const { hideTabBar, showTabBar, lastScrollY } = useTabBar();

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollDiff = currentScrollY - lastScrollY.current;
    
    // Seuils ajustés pour une animation plus fluide
    if (scrollDiff > 3 && currentScrollY > 30) {
      // Scrolling down - hide tab bar
      hideTabBar();
    } else if (scrollDiff < -3 || currentScrollY <= 30) {
      // Scrolling up or at top - show tab bar
      showTabBar();
    }
    
    lastScrollY.current = currentScrollY;
    
    // Call the original onScroll if provided
    if (props.onScroll) {
      props.onScroll(event);
    }
  };

  return (
    <ScrollView
      {...props}
      contentContainerStyle={[
        { paddingBottom: Platform.OS === 'ios' ? 110 : 90 },
        contentContainerStyle
      ]}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      bounces={true}
      alwaysBounceVertical={true}
    >
      {children}
    </ScrollView>
  );
};