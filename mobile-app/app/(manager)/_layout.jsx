import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { colors } from '../../src/theme';
import { notificationsApi } from '../../src/api/client';

function TabIcon({ emoji, focused }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
  );
}

export default function ManagerLayout() {
  const [unread, setUnread] = useState(0);

  // Poll unread count every 60 seconds
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await notificationsApi.getUnreadCount();
        setUnread(res.data.unread_count || 0);
      } catch (_) {}
    };
    poll();
    const interval = setInterval(poll, 60000);
    return () => clearInterval(interval);
  }, []);

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
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="pos"
        options={{
          title: 'New Order',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🛒" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="purchases"
        options={{
          title: 'Purchases',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📦" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🧾" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ focused }) => (
            <View>
              <TabIcon emoji="🔔" focused={focused} />
              {unread > 0 && (
                <View style={{
                  position: 'absolute', top: -4, right: -8,
                  backgroundColor: colors.danger,
                  borderRadius: 999, minWidth: 16, height: 16,
                  alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
                }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                    {unread > 99 ? '99+' : unread}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="summary"
        options={{
          title: 'Summary',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
