import { Tabs, usePathname } from 'expo-router';
import React from 'react';
import { View, Text, TouchableOpacity, Animated, Platform, StyleSheet } from 'react-native';
import { TabBarProvider, useTabBar } from '@/contexts/TabBarContext';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import HomeIcon from '@/components/svg/HomeIcon';
import QuestionnaireIcon from '@/components/svg/QuestionnaireIcon';

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { translateY } = useTabBar();
  const pathname = usePathname();

  // Hide tab bar on questionnaire screen
  if (pathname === '/questionnaire') {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.tabContainer,
        // {
        //   transform: [{ translateY }],
        // },
      ]}
    >
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.title;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const color = isFocused
            ? '#000000'
            : '#999999';

          const Icon = options.tabBarIcon;

          return (
            <TouchableOpacity
              key={index}
              style={styles.tab}
              onPress={onPress}
              activeOpacity={0.7}
            >
              {Icon && Icon({ color })}
              <Text style={[styles.label, { color }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
}

function TabLayoutContent() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => <HomeIcon width={22} height={22} fill={color} />,
        }}
      />
      <Tabs.Screen
        name="questionnaire"
        options={{
          tabBarIcon: ({ color }) => <QuestionnaireIcon width={22} height={22} fill={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <TabBarProvider>
      <TabLayoutContent />
    </TabBarProvider>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1.2,
    borderTopColor: '#d0d0d0',
    elevation: 20,
  },
  tabBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 60 : 60,
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  label: {
    fontSize: 10,
    marginTop: 3,
    textAlign: 'center',
    fontFamily: 'NotoIkea',
    fontWeight: 'bold',
  },
});
