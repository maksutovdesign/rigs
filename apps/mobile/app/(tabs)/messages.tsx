import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { Conversation } from '@rigs/types'
import { Avatar } from '../../components/ui/avatar'

function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await api.get<Conversation[]>('/conversations')
      return data
    },
  })
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return format(d, 'HH:mm')
  if (diffDays < 7) return format(d, 'EEEEEE', { locale: ru })
  return format(d, 'd MMM', { locale: ru })
}

export default function MessagesScreen() {
  const router = useRouter()
  const { data: conversations = [], isLoading, refetch } = useConversations()
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Сообщения</Text>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Нет сообщений</Text>
          <Text style={styles.emptySubtitle}>
            Начни общение при бронировании снаряжения
          </Text>
        </View>
      ) : (
        <FlashList
          data={conversations}
          keyExtractor={(item: Conversation) => item.id}
          estimatedItemSize={76}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#16a34a" />
          }
          renderItem={({ item }: { item: Conversation }) => {
            const other = item.otherParticipant
            const name = other
              ? [other.firstName, other.lastName].filter(Boolean).join(' ') || 'Пользователь'
              : 'Пользователь'
            const preview = item.lastMessage?.text ?? ''
            const time = formatTime(item.lastMessageAt)
            const unread = item.unreadCount

            return (
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: '/chat/[conversationId]',
                    params: { conversationId: item.id },
                  })
                }
              >
                <Avatar uri={other?.avatarUrl} name={name} size="md" />
                <View style={styles.rowContent}>
                  <View style={styles.rowTop}>
                    <Text style={[styles.rowName, unread > 0 && styles.rowNameBold]}>
                      {name}
                    </Text>
                    <Text style={styles.rowTime}>{time}</Text>
                  </View>
                  <View style={styles.rowBottom}>
                    <Text
                      style={[styles.rowPreview, unread > 0 && styles.rowPreviewBold]}
                      numberOfLines={1}
                    >
                      {preview || 'Нет сообщений'}
                    </Text>
                    {unread > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowContent: { flex: 1 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  rowName: { fontSize: 15, color: '#111827' },
  rowNameBold: { fontWeight: '700' },
  rowTime: { fontSize: 12, color: '#9ca3af' },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowPreview: { fontSize: 13, color: '#6b7280', flex: 1 },
  rowPreviewBold: { color: '#374151', fontWeight: '600' },
  unreadBadge: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: 8,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
})
