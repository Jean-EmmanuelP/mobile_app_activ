import { Tabs } from 'expo-router';
import React from 'react';
import { View, Text, TouchableOpacity, Animated, Platform, StyleSheet } from 'react-native';
import { TabBarProvider, useTabBar } from '@/contexts/TabBarContext';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import HomeIcon from '@/components/svg/HomeIcon';
import QuestionnaireIcon from '@/components/svg/QuestionnaireIcon';

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { translateY } = useTabBar();
  const colorScheme = useColorScheme();

  return (
    <Animated.View
      style={[
        styles.tabContainer,
        {
          transform: [{ translateY }],
        },
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
            ? Colors[colorScheme ?? 'light'].tint 
            : '#999';

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
          title: 'Accueil',
          tabBarIcon: ({ color }) => <HomeIcon width={28} height={28} fill={color} />,
        }}
      />
      <Tabs.Screen
        name="questionnaire"
        options={{
          title: 'Questionnaire',
          tabBarIcon: ({ color }) => <QuestionnaireIcon width={28} height={28} fill={color} />,
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
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 10,
  },
  tabBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 90 : 70,
    paddingBottom: Platform.OS === 'ios' ? 25 : 12,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  label: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    fontFamily: 'Inter_500Medium',
  },
});
