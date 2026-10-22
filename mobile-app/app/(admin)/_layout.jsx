import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../src/theme';

function TabIcon({ emoji, focused }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;
}

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.dark,
          borderTopColor: 'rgba(255,255,255,0.08)',
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 9, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} /> }} />
      <Tabs.Screen name="financial" options={{ title: 'Financials', tabBarIcon: ({ focused }) => <TabIcon emoji="💰" focused={focused} /> }} />
      <Tabs.Screen name="ranking" options={{ title: 'Ranking', tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" focused={focused} /> }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} /> }} />
      <Tabs.Screen name="menu" options={{ title: 'Menu', tabBarIcon: ({ focused }) => <TabIcon emoji="🍽️" focused={focused} /> }} />
      <Tabs.Screen name="ingredients" options={{ title: 'Ingredients', tabBarIcon: ({ focused }) => <TabIcon emoji="🥩" focused={focused} /> }} />
      <Tabs.Screen name="expenses" options={{ title: 'Expenses', tabBarIcon: ({ focused }) => <TabIcon emoji="🧾" focused={focused} /> }} />
      <Tabs.Screen name="users" options={{ title: 'Users', tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} /> }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} /> }} />
    </Tabs>
  );
}
