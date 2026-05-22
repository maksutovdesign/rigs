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
import { useMyRentals } from '../../hooks/use-bookings'
import { useAuthStore } from '../../store/auth.store'
import { BookingStatus } from '@rigs/types'
import type { Booking } from '@rigs/types'
import { formatPrice } from '@rigs/utils'
import { Badge } from '../../components/ui/badge'

const TABS: { label: string; statuses: BookingStatus[] | null }[] = [
  { label: 'Все', statuses: null },
  {
    label: 'Предстоящие',
    statuses: [BookingStatus.CONFIRMED, BookingStatus.PAID],
  },
  { label: 'Активные', statuses: [BookingStatus.ACTIVE] },
  { label: 'Завершённые', statuses: [BookingStatus.COMPLETED] },
  {
    label: 'Отменённые',
    statuses: [BookingStatus.CANCELLED_RENTER, BookingStatus.CANCELLED_HOST, BookingStatus.REFUNDED],
  },
]

function statusConfig(status: BookingStatus): { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' } {
  const map: Record<BookingStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
    [BookingStatus.PENDING]: { label: 'Ожидает', variant: 'warning' },
    [BookingStatus.CONFIRMED]: { label: 'Подтверждено', variant: 'info' },
    [BookingStatus.PAID]: { label: 'Оплачено', variant: 'info' },
    [BookingStatus.ACTIVE]: { label: 'Активна', variant: 'success' },
    [BookingStatus.COMPLETED]: { label: 'Завершена', variant: 'default' },
    [BookingStatus.CANCELLED_RENTER]: { label: 'Отменено', variant: 'danger' },
    [BookingStatus.CANCELLED_HOST]: { label: 'Отменено хостом', variant: 'danger' },
    [BookingStatus.DISPUTED]: { label: 'Спор', variant: 'danger' },
    [BookingStatus.REFUNDED]: { label: 'Возврат', variant: 'default' },
  }
  return map[status] ?? { label: status, variant: 'default' }
}

export default function RentalsTab() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [activeTab, setActiveTab] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const { data: bookings = [], isLoading, refetch } = useMyRentals()

  const filtered = TABS[activeTab]?.statuses
    ? bookings.filter((b) => TABS[activeTab]!.statuses!.includes(b.status as BookingStatus))
    : bookings

  async function handleRefresh() {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.guestBox}>
          <Text style={styles.guestTitle}>Войдите, чтобы видеть аренды</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/auth')}>
            <Text style={styles.loginBtnText}>Войти</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Мои аренды</Text>
      </View>

      {/* Tab chips */}
      <FlashList
        data={TABS}
        horizontal
        keyExtractor={(_, i) => String(i)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContent}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[styles.tabChip, activeTab === index && styles.tabChipActive]}
            onPress={() => setActiveTab(index)}
          >
            <Text style={[styles.tabChipText, activeTab === index && styles.tabChipTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Нет аренд</Text>
          <TouchableOpacity style={styles.searchBtn} onPress={() => router.push('/(tabs)/search')}>
            <Text style={styles.searchBtnText}>Найти снаряжение</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(item: Booking) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#16a34a" />
          }
          renderItem={({ item }: { item: Booking }) => {
            const sc = statusConfig(item.status as BookingStatus)
            const listing = item.listing as any
            const start = format(new Date(item.startDate), 'd MMM', { locale: ru })
            const end = format(new Date(item.endDate), 'd MMM yyyy', { locale: ru })
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push({ pathname: '/booking/[id]', params: { id: item.id } })}
                activeOpacity={0.75}
              >
                <View style={styles.cardBody}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {listing?.title ?? 'Аренда'}
                    </Text>
                    <Text style={styles.cardDates}>{start} — {end}</Text>
                    <Text style={styles.cardPrice}>{formatPrice(item.totalAmount)}</Text>
                  </View>
                  <Badge label={sc.label} variant={sc.variant} />
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
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  tabsContent: { paddingHorizontal: 12, paddingVertical: 10 },
  tabChip: {
    paddingHorizontal: 14, paddingVertical: 7, marginHorizontal: 4,
    borderRadius: 20, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff',
  },
  tabChipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  tabChipText: { fontSize: 13, color: '#374151' },
  tabChipTextActive: { color: '#fff', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  guestBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  guestTitle: { fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center' },
  loginBtn: { backgroundColor: '#16a34a', borderRadius: 12, paddingHorizontal: 40, paddingVertical: 13 },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptyTitle: { fontSize: 16, color: '#6b7280' },
  searchBtn: { backgroundColor: '#16a34a', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 11 },
  searchBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  card: {
    backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 6,
    borderRadius: 14, padding: 14, elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1, marginRight: 12 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  cardDates: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  cardPrice: { fontSize: 14, fontWeight: '700', color: '#16a34a' },
})
