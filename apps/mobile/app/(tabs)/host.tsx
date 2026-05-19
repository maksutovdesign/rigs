import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { TrendingUp, Package, Plus, CreditCard, BarChart2, Check, X } from 'lucide-react-native'
import { formatPrice } from '@rigs/utils'
import { BookingStatus, UserRole } from '@rigs/types'
import type { Booking } from '@rigs/types'
import { useAuthStore } from '../../store/auth.store'
import { useHostBookings, useConfirmBooking, useCancelBooking } from '../../hooks/use-bookings'
import { Badge } from '../../components/ui/badge'
import { ListingCardHorizontal } from '../../components/listings/listing-card-horizontal'

function useHostRevenue(bookings: Booking[]): number {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return bookings
    .filter(
      (b) =>
        b.status === BookingStatus.COMPLETED &&
        new Date(b.updatedAt) >= startOfMonth,
    )
    .reduce((sum, b) => sum + Number(b.hostPayout ?? 0), 0)
}

export default function HostScreen() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const { data: bookings = [], isLoading, refetch } = useHostBookings()
  const confirmBooking = useConfirmBooking()
  const cancelBooking = useCancelBooking()

  const isHost =
    user?.role === UserRole.HOST ||
    user?.role === UserRole.BOTH ||
    user?.role === UserRole.ADMIN

  const pendingBookings = bookings.filter((b) => b.status === BookingStatus.PENDING)
  const activeBookings = bookings.filter((b) => b.status === BookingStatus.ACTIVE)
  const revenue = useHostRevenue(bookings)
  const rating = user?.ratingAsHost

  async function handleConfirm(id: string) {
    try {
      await confirmBooking.mutateAsync(id)
    } catch {
      Alert.alert('Ошибка', 'Не удалось подтвердить')
    }
  }

  async function handleDecline(id: string) {
    Alert.alert('Отклонить заявку?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Отклонить',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelBooking.mutateAsync({ id, reason: 'Отклонено хостом' })
          } catch {
            Alert.alert('Ошибка', 'Не удалось отклонить')
          }
        },
      },
    ])
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.ctaContainer}>
          <Text style={styles.ctaTitle}>Стань хостом</Text>
          <Text style={styles.ctaSubtitle}>
            Сдавай своё снаряжение и зарабатывай на аренде
          </Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/auth')}>
            <Text style={styles.ctaBtnText}>Войти и начать</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (!isHost) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.ctaContainer}>
          <Text style={styles.ctaEmoji}>🏕️</Text>
          <Text style={styles.ctaTitle}>Стань хостом</Text>
          <Text style={styles.ctaSubtitle}>
            Сдавай своё снаряжение и зарабатывай. Это бесплатно и просто.
          </Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => router.push('/host/listings/create')}
          >
            <Text style={styles.ctaBtnText}>Создать первое объявление</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Хост-панель</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <TrendingUp size={18} color="#16a34a" />
            <Text style={styles.statValue}>{formatPrice(revenue)}</Text>
            <Text style={styles.statLabel}>Выручка за месяц</Text>
          </View>
          <View style={styles.statCard}>
            <Package size={18} color="#2563eb" />
            <Text style={styles.statValue}>{activeBookings.length}</Text>
            <Text style={styles.statLabel}>Активных аренд</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statStar}>★</Text>
            <Text style={styles.statValue}>{rating ? rating.toFixed(1) : '—'}</Text>
            <Text style={styles.statLabel}>Рейтинг</Text>
          </View>
        </View>

        {/* Pending bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Входящие заявки</Text>
            {pendingBookings.length > 0 && (
              <Badge label={String(pendingBookings.length)} variant="warning" />
            )}
          </View>

          {isLoading ? (
            <ActivityIndicator color="#16a34a" style={{ marginTop: 12 }} />
          ) : pendingBookings.length === 0 ? (
            <Text style={styles.emptyText}>Нет новых заявок</Text>
          ) : (
            pendingBookings.slice(0, 5).map((booking) => (
              <View key={booking.id} style={styles.pendingCard}>
                <ListingCardHorizontal booking={booking} />
                <View style={styles.pendingActions}>
                  <TouchableOpacity
                    style={styles.declineBtn}
                    onPress={() => handleDecline(booking.id)}
                    disabled={cancelBooking.isPending}
                  >
                    <X size={16} color="#dc2626" />
                    <Text style={styles.declineBtnText}>Отклонить</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={() => handleConfirm(booking.id)}
                    disabled={confirmBooking.isPending}
                  >
                    <Check size={16} color="#fff" />
                    <Text style={styles.confirmBtnText}>Подтвердить</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Быстрые действия</Text>
          <View style={styles.quickGrid}>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push('/host/listings')}
            >
              <Package size={28} color="#16a34a" />
              <Text style={styles.quickLabel}>Мои объявления</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push('/host/listings/create')}
            >
              <Plus size={28} color="#16a34a" />
              <Text style={styles.quickLabel}>Создать объявление</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/host/payouts')}>
              <CreditCard size={28} color="#16a34a" />
              <Text style={styles.quickLabel}>Выплаты</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/host/analytics')}>
              <BarChart2 size={28} color="#16a34a" />
              <Text style={styles.quickLabel}>Статистика</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  ctaContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  ctaEmoji: { fontSize: 56 },
  ctaTitle: { fontSize: 24, fontWeight: '700', color: '#111827', textAlign: 'center' },
  ctaSubtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  ctaBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 8,
  },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statValue: { fontSize: 15, fontWeight: '700', color: '#111827', textAlign: 'center' },
  statLabel: { fontSize: 11, color: '#6b7280', textAlign: 'center' },
  statStar: { fontSize: 18, color: '#f59e0b' },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  emptyText: { fontSize: 14, color: '#9ca3af' },
  pendingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    marginBottom: 12,
  },
  pendingActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRightWidth: 1,
    borderRightColor: '#f3f4f6',
  },
  declineBtnText: { color: '#dc2626', fontSize: 13, fontWeight: '600' },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    backgroundColor: '#16a34a',
  },
  confirmBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  quickLabel: { fontSize: 13, fontWeight: '600', color: '#374151', textAlign: 'center' },
})
