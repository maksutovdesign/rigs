import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { Plus, Pause, Edit, Archive } from 'lucide-react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import type { Listing } from '@rigs/types'
import { ListingStatus } from '@rigs/types'
import { Badge } from '../../../components/ui/badge'
import type { BadgeVariant } from '../../../components/ui/badge'
import { formatPrice } from '@rigs/utils'

function statusVariant(status: ListingStatus): BadgeVariant {
  switch (status) {
    case ListingStatus.ACTIVE: return 'success'
    case ListingStatus.PAUSED: return 'warning'
    case ListingStatus.MODERATION: return 'info'
    case ListingStatus.ARCHIVED: return 'default'
    case ListingStatus.DRAFT: return 'default'
    default: return 'default'
  }
}

function statusLabel(status: ListingStatus): string {
  const map: Record<ListingStatus, string> = {
    [ListingStatus.ACTIVE]: 'Активно',
    [ListingStatus.PAUSED]: 'Приостановлено',
    [ListingStatus.DRAFT]: 'Черновик',
    [ListingStatus.ARCHIVED]: 'Архив',
    [ListingStatus.MODERATION]: 'На модерации',
  }
  return map[status] ?? status
}

function useHostListings() {
  return useQuery<Listing[]>({
    queryKey: ['listings', 'host'],
    queryFn: async () => {
      const { data } = await api.get<Listing[]>('/listings/host')
      return data
    },
  })
}

function useUpdateListingStatus() {
  const queryClient = useQueryClient()
  return useMutation<Listing, Error, { id: string; status: ListingStatus }>({
    mutationFn: async ({ id, status }) => {
      const { data } = await api.patch<Listing>(`/listings/${id}`, { status })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings', 'host'] })
    },
  })
}

export default function HostListingsScreen() {
  const router = useRouter()
  const { data: listings = [], isLoading, refetch } = useHostListings()
  const updateStatus = useUpdateListingStatus()
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  function handleArchive(id: string) {
    Alert.alert('Архивировать?', 'Объявление станет недоступно для аренды.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Архивировать',
        style: 'destructive',
        onPress: () => updateStatus.mutate({ id, status: ListingStatus.ARCHIVED }),
      },
    ])
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
        <Text style={styles.title}>Мои объявления</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/host/listings/create')}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {listings.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Ещё нет объявлений</Text>
          <Text style={styles.emptySubtitle}>Создай первое и начни зарабатывать!</Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push('/host/listings/create')}
          >
            <Text style={styles.createBtnText}>Создать объявление</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={listings}
          keyExtractor={(item: Listing) => item.id}
          estimatedItemSize={140}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#16a34a" />
          }
          renderItem={({ item }: { item: Listing }) => {
            const coverUri = item.media?.find((m) => m.isCover)?.url ?? item.media?.[0]?.url
            return (
              <View style={styles.card}>
                <View style={styles.cardMain}>
                  {coverUri ? (
                    <Image source={{ uri: coverUri }} style={styles.cardImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.cardImage, styles.imageFallback]} />
                  )}
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.cardCity}>{item.city}</Text>
                    <Text style={styles.cardPrice}>
                      {item.priceDaily ? formatPrice(item.priceDaily) + ' / день' : '—'}
                    </Text>
                    <Badge label={statusLabel(item.status)} variant={statusVariant(item.status)} />
                  </View>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() =>
                      updateStatus.mutate({
                        id: item.id,
                        status: item.status === ListingStatus.ACTIVE ? ListingStatus.PAUSED : ListingStatus.ACTIVE,
                      })
                    }
                  >
                    <Pause size={15} color="#6b7280" />
                    <Text style={styles.actionText}>
                      {item.status === ListingStatus.ACTIVE ? 'Пауза' : 'Активировать'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => router.push({ pathname: '/host/listings/create', params: { editId: item.id } })}
                  >
                    <Edit size={15} color="#6b7280" />
                    <Text style={styles.actionText}>Изменить</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleArchive(item.id)}>
                    <Archive size={15} color="#6b7280" />
                    <Text style={styles.actionText}>Архив</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  addBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  createBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  listContent: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardMain: { flexDirection: 'row', gap: 12, padding: 12 },
  cardImage: { width: 88, height: 88, borderRadius: 8, backgroundColor: '#e5e7eb' },
  imageFallback: { backgroundColor: '#d1d5db' },
  cardInfo: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827', lineHeight: 18 },
  cardCity: { fontSize: 12, color: '#6b7280' },
  cardPrice: { fontSize: 13, fontWeight: '700', color: '#111827' },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  actionText: { fontSize: 12, color: '#6b7280' },
})
