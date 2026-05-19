import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft } from 'lucide-react-native'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

interface HostAnalytics {
  revenueThisMonth: number
  revenueLastMonth: number
  revenueChange: number
  totalBookings: number
  bookingsThisMonth: number
  activeListings: number
  averageRating: number
  revenueByMonth: { month: string; amount: number }[]
  topListings?: { id: string; title: string; revenue: number; bookingsCount: number }[]
}

function fmt(n: number) { return n.toLocaleString('ru-RU') + ' ₽' }

function shortMonth(m: string): string {
  const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек']
  const idx = parseInt(m.split('-')[1], 10) - 1
  return months[idx] ?? m
}

const CHART_HEIGHT = 80

export default function HostAnalyticsScreen() {
  const router = useRouter()
  const { data, isLoading } = useQuery<HostAnalytics>({
    queryKey: ['host', 'analytics'],
    queryFn: async () => { const { data } = await api.get('/host/analytics'); return data },
  })

  const months = data?.revenueByMonth?.slice(-6) ?? []
  const maxAmount = Math.max(...months.map(m => m.amount), 1)

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.title}>Аналитика</Text>
      </View>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#16a34a" /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* KPI grid */}
          <View style={s.kpiGrid}>
            <View style={[s.kpiCard, s.kpiCardPrimary]}>
              <Text style={s.kpiLabelWhite}>Выручка (месяц)</Text>
              <Text style={s.kpiValueWhite}>{fmt(data?.revenueThisMonth ?? 0)}</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>vs прошлый месяц</Text>
              <Text style={[s.kpiValue, { color: (data?.revenueChange ?? 0) >= 0 ? '#16a34a' : '#ef4444' }]}>
                {(data?.revenueChange ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(data?.revenueChange ?? 0).toFixed(1)}%
              </Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Бронирований (мес.)</Text>
              <Text style={s.kpiValue}>{data?.bookingsThisMonth ?? 0}</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Активных объявлений</Text>
              <Text style={s.kpiValue}>{data?.activeListings ?? 0}</Text>
            </View>
          </View>

          {/* Rating */}
          {(data?.averageRating ?? 0) > 0 && (
            <View style={s.ratingCard}>
              <Text style={s.ratingLabel}>Средний рейтинг</Text>
              <Text style={s.ratingValue}>★ {(data?.averageRating ?? 0).toFixed(1)}</Text>
            </View>
          )}

          {/* Bar chart */}
          {months.length > 0 && (
            <View style={s.chartCard}>
              <Text style={s.cardTitle}>Выручка по месяцам</Text>
              <View style={s.chart}>
                {months.map((m) => {
                  const barH = Math.max(4, Math.round((m.amount / maxAmount) * CHART_HEIGHT))
                  return (
                    <View key={m.month} style={s.barGroup}>
                      <Text style={s.barAmount}>{m.amount > 0 ? (m.amount / 1000).toFixed(0) + 'к' : ''}</Text>
                      <View style={[s.bar, { height: barH }]} />
                      <Text style={s.barMonth}>{shortMonth(m.month)}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
          )}

          {/* Top listings */}
          {(data?.topListings?.length ?? 0) > 0 && (
            <View style={s.topCard}>
              <Text style={s.cardTitle}>Топ объявлений</Text>
              {data!.topListings!.map((item, idx) => (
                <View key={item.id} style={s.topRow}>
                  <Text style={s.topRank}>#{idx + 1}</Text>
                  <Text style={s.topTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={s.topRight}>
                    <Text style={s.topRevenue}>{fmt(item.revenue)}</Text>
                    <Text style={s.topBookings}>{item.bookingsCount} аренд</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

        </ScrollView>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, gap: 16 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpiCard: {
    width: '48%', backgroundColor: '#fff', borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  kpiCardPrimary: { backgroundColor: '#16a34a' },
  kpiLabel: { fontSize: 11, color: '#6b7280', marginBottom: 6 },
  kpiLabelWhite: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 6 },
  kpiValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  kpiValueWhite: { fontSize: 20, fontWeight: '700', color: '#fff' },
  ratingCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  ratingLabel: { fontSize: 14, color: '#374151' },
  ratingValue: { fontSize: 22, fontWeight: '700', color: '#f59e0b' },
  chartCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 16 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: CHART_HEIGHT + 40 },
  barGroup: { flex: 1, alignItems: 'center', gap: 4 },
  barAmount: { fontSize: 9, color: '#6b7280' },
  bar: { width: '60%', backgroundColor: '#16a34a', borderRadius: 4 },
  barMonth: { fontSize: 10, color: '#6b7280' },
  topCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  topRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  topRank: { fontSize: 13, fontWeight: '700', color: '#9ca3af', width: 24 },
  topTitle: { flex: 1, fontSize: 13, color: '#374151' },
  topRight: { alignItems: 'flex-end' },
  topRevenue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  topBookings: { fontSize: 11, color: '#9ca3af' },
})
