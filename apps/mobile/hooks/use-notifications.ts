import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { useRouter } from 'expo-router'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth.store'

// ─── Global handler config (call once at app startup) ────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

// ─── Deep-link targets from notification data payload ────────────────────────

type NotificationData = {
  screen?: string
  id?: string
}

function resolveRoute(data: NotificationData): string | null {
  switch (data.screen) {
    case 'booking':
      return data.id ? `/booking/${data.id}` : null
    case 'listing':
      return data.id ? `/listing/${data.id}` : null
    case 'chat':
      return data.id ? `/chat/${data.id}` : null
    default:
      return null
  }
}

// ─── Main hook ───────────────────────────────────────────────────────────────

export function useNotifications() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const responseListenerRef = useRef<Notifications.Subscription | null>(null)
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
      if (route) router.push(route as any)
    })

    // Handle tap while app is foregrounded or in background
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as NotificationData
        const route = resolveRoute(data)
        if (route) router.push(route as any)
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
    const { data: token } = await Notifications.getExpoPushTokenAsync()
    return token
  } catch {
    return null
  }
}
