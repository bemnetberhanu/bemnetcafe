import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import useAuthStore from '../src/store/authStore';
import { startOfflineSync } from '../src/offline/sync';
import OfflineSyncBanner from '../src/components/OfflineSyncBanner';

function AuthGate() {
  const { role, initialized } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return;

    const inAuth = segments[0] === '(auth)';
    const inManager = segments[0] === '(manager)';
    const inAdmin = segments[0] === '(admin)';

    if (!role) {
      if (!inAuth) router.replace('/(auth)/login');
    } else if (role === 'manager') {
      if (!inManager) router.replace('/(manager)/pos');
    } else if (role === 'admin') {
      if (!inAdmin) router.replace('/(admin)/dashboard');
    }
  }, [role, initialized, segments]);

  return null;
}

function OfflineSyncBootstrap() {
  const { user, role, initialized } = useAuthStore();

  useEffect(() => {
    if (!initialized || role !== 'manager' || !user?.id) return undefined;
    return startOfflineSync(user.id);
  }, [initialized, role, user?.id]);

  return null;
}

export default function RootLayout() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => { init(); }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthGate />
      <OfflineSyncBootstrap />
      <OfflineSyncBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(manager)" />
        <Stack.Screen name="(admin)" />
      </Stack>
    </SafeAreaProvider>
  );
}
