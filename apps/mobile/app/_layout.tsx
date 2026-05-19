import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryProvider } from '@/components/providers/query-provider'
import { useNotifications } from '@/hooks/use-notifications'

SplashScreen.preventAutoHideAsync()

/**
 * Inner component — needs to live inside QueryProvider so that
 * react-query context is available for useNotifications' API call.
 */
function AppShell() {
  useNotifications()

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="listing/[id]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen
          name="booking/[id]"
          options={{ headerShown: true, title: 'Бронирование' }}
        />
        <Stack.Screen
          name="chat/[id]"
          options={{ headerShown: true, title: 'Чат' }}
        />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <AppShell />
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
