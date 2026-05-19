import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { BookingStatus } from '@rigs/types'
import type { Booking } from '@rigs/types'
import { useMyRentals } from '../../hooks/use-bookings'
import { ListingCardHorizontal } from '../../components/listings/listing-card-horizontal'

type Tab = 'all' | BookingStatus.CONFIRMED | BookingStatus.ACTIVE | BookingStatus.COMPLETED | 'cancelled'

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: BookingStatus.CONFIRMED, label: 'Предстоящие' },
  { key: BookingStatus.ACTIVE, label: 'Активные' },
  { key: BookingStatus.COMPLETED, label: 'Завершённые' },
  { key: 'cancelled', label: 'Отменённые' },
]

const CANCELLED_STATUSES: BookingStatus[] = [
  BookingStatus.CANCELLED_RENTER,
  BookingStatus.CANCELLED_HOST,
]

export default function RentalsScreen() {
  const router = useRouter()
  const { data: bookings = [], isLoading, refetch } = useMyRentals()
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [refreshing, setRefreshing] = useState(false)

  const filtered = bookings.filter((b: Booking) => {
    if (activeTab === 'all') return true
    if (activeTab === 'cancelled') return CANCELLED_STATUSES.includes(b.status)
    return b.status === activeTab
  })

  async function handleRefresh() {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Мои аренды</Text>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Нет аренд в этой категории</Text>
        </View>
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(item: Booking) => item.id}
          estimatedItemSize={110}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#16a34a" />
          }
          renderItem={({ item }: { item: Booking }) => (
            <ListingCardHorizontal
              booking={item}
              onPress={() => router.push({ pathname: '/booking/[id]', params: { id: item.id } })}
            />
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#fff',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  tabsScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexGrow: 0,
  },
  tabsContent: { paddingHorizontal: 12, paddingBottom: 0, gap: 4 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#16a34a' },
  tabText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  tabTextActive: { color: '#16a34a', fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, color: '#9ca3af' },
  listContent: { padding: 16 },
})
