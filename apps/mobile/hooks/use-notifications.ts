import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth.store'

// ─── Global handler config (call once at app startup) ────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // expo-notifications v0.32: shouldShowAlert renamed to shouldShowBanner + shouldShowList
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

// ─── Deep-link targets from notification data payload ────────────────────────

type NotificationData = {
  screen?: string
  id?: string
}

// Return typed route objects instead of plain strings — required by expo-router v6
type ResolvedRoute =
  | { pathname: '/booking/[id]'; params: { id: string } }
  | { pathname: '/listing/[id]'; params: { id: string } }
  | { pathname: '/chat/[conversationId]'; params: { conversationId: string } }

function resolveRoute(data: NotificationData): ResolvedRoute | null {
  switch (data.screen) {
    case 'booking':
      return data.id ? { pathname: '/booking/[id]', params: { id: data.id } } : null
    case 'listing':
      return data.id ? { pathname: '/listing/[id]', params: { id: data.id } } : null
    case 'chat':
      return data.id
        ? { pathname: '/chat/[conversationId]', params: { conversationId: data.id } }
        : null
    default:
      return null
  }
}

// ─── Main hook ───────────────────────────────────────────────────────────────

export function useNotifications() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  // expo-notifications v0.32: Subscription type renamed — use ReturnType instead
  const responseListenerRef = useRef<ReturnType<
    typeof Notifications.addNotificationResponseReceivedListener
  > | null>(null)
  const tokenRegisteredRef = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || tokenRegisteredRef.current) return

    registerForPushNotificationsAsync().then(async (token) => {
      if (!token) return
      tokenRegisteredRef.current = true
      try {
        await api.put('/users/me/fcm-token', { token })
      } catch {
        // Token registration is non-critical — silently ignore
      }
    })
  }, [isAuthenticated])

  // Handle notification tap → deep link
  useEffect(() => {
    // Handle tap on notification that opened the app from killed/background state
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return
      const data = response.notification.request.content.data as NotificationData
      const route = resolveRoute(data)
      if (route) router.push(route)
    })

    // Handle tap while app is foregrounded or in background
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as NotificationData
        const route = resolveRoute(data)
        if (route) router.push(route)
      },
    )

    return () => {
      responseListenerRef.current?.remove()
    }
  }, [router])
}

// ─── Permissions + token ─────────────────────────────────────────────────────

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return null

  try {
    // expo-notifications v0.32: projectId is required for production push tokens
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    )
    return token
  } catch {
    return null
  }
}
