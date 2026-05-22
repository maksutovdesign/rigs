import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import * as SecureStore from 'expo-secure-store'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryProvider } from '@/components/providers/query-provider'
import { useNotifications } from '@/hooks/use-notifications'
import { useAuthStore } from '@/store/auth.store'

// NOTE: SplashScreen.preventAutoHideAsync() at module level is removed —
// it's deprecated in expo-splash-screen v31. expo-router v6 manages the
// splash screen automatically until the root layout mounts.

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
          name="chat/[conversationId]"
          options={{ headerShown: true, title: 'Чат' }}
        />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  useEffect(() => {
    async function init() {
      // Restore persisted auth tokens from SecureStore into the Zustand store
      // so the API interceptor can read them synchronously on every request.
      const accessToken = await SecureStore.getItemAsync('access_token')
      const refreshToken = await SecureStore.getItemAsync('refresh_token')
      if (accessToken && refreshToken) {
        useAuthStore.getState().setTokens(accessToken, refreshToken)
      }

      // Hide the native splash screen. expo-router v6 normally does this
      // automatically, but we call it explicitly as a safety net.
      await SplashScreen.hideAsync().catch(() => {})
    }
    init()
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
