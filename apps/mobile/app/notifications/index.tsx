import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft } from 'lucide-react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'

type NotifType = 'booking_request'|'booking_confirmed'|'booking_cancelled'|'message'|'review'|'payout'|'system'

interface AppNotification {
  id: string
  type: NotifType
  title: string
  body: string
  isRead: boolean
  actionUrl?: string
  createdAt: string
}

const TYPE_EMOJI: Record<NotifType, string> = {
  booking_request: '📅',
  booking_confirmed: '✅',
  booking_cancelled: '❌',
  message: '💬',
  review: '⭐',
  payout: '💰',
  system: '🔔',
}

function timeAgo(dateStr: string): string {
  const sec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (sec < 60) return 'только что'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} мин. назад`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs} ч. назад`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} д. назад`
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function useNotifications() {
  return useQuery<{ items: AppNotification[]; unreadCount: number }>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/notifications')
      return data
    },
    refetchInterval: 30_000,
  })
}

export default function NotificationsScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { data, isLoading } = useNotifications()

  const markAllRead = useMutation({
    mutationFn: async () => { await api.post('/notifications/read-all') },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markRead = useMutation({
    mutationFn: async (id: string) => { await api.post(`/notifications/${id}/read`) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const notifications = data?.items ?? []
  const unreadCount = data?.unreadCount ?? 0

  function handleTap(n: AppNotification) {
    if (!n.isRead) markRead.mutate(n.id)
    if (n.actionUrl) router.push(n.actionUrl as any)
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={s.title}>Уведомления</Text>
          {unreadCount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
            <Text style={s.readAll}>Прочитать все</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#16a34a" /></View>
      ) : notifications.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🔕</Text>
          <Text style={s.emptyTitle}>Уведомлений пока нет</Text>
          <Text style={s.emptySub}>Здесь появятся уведомления о бронированиях, сообщениях и выплатах</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.row, !item.isRead && s.rowUnread]}
              onPress={() => handleTap(item)}
              activeOpacity={0.7}
            >
              <View style={s.icon}>
                <Text style={s.emoji}>{TYPE_EMOJI[item.type]}</Text>
              </View>
              <View style={s.content}>
                <Text style={[s.notifTitle, !item.isRead && s.notifTitleBold]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={s.body} numberOfLines={2}>{item.body}</Text>
                <Text style={s.time}>{timeAgo(item.createdAt)}</Text>
              </View>
              {!item.isRead && <View style={s.dot} />}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 8,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  badge: {
    backgroundColor: '#16a34a', borderRadius: 10, minWidth: 20, height: 20,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  readAll: { fontSize: 13, color: '#16a34a', fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  list: { paddingVertical: 8 },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f9fafb', gap: 12,
  },
  rowUnread: { backgroundColor: '#f0fdf4' },
  icon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center',
  },
  emoji: { fontSize: 18 },
  content: { flex: 1 },
  notifTitle: { fontSize: 14, color: '#374151', marginBottom: 2 },
  notifTitleBold: { fontWeight: '700', color: '#111827' },
  body: { fontSize: 13, color: '#6b7280', lineHeight: 18, marginBottom: 4 },
  time: { fontSize: 11, color: '#9ca3af' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a', marginTop: 4 },
})
