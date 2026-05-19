import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft } from 'lucide-react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'

type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed'
interface Payout {
  id: string
  amount: number
  status: PayoutStatus
  period: string
  createdAt: string
  paidAt?: string
}
interface PayoutStats {
  availableBalance: number
  pendingBalance: number
  totalPaid: number
  nextPayoutDate?: string
}

const STATUS_EMOJI: Record<PayoutStatus, string> = {
  pending: '⏳', processing: '🔄', paid: '✅', failed: '❌',
}
const STATUS_LABEL: Record<PayoutStatus, string> = {
  pending: 'Ожидает', processing: 'Обрабатывается', paid: 'Выплачено', failed: 'Ошибка',
}

function fmt(n: number) { return n.toLocaleString('ru-RU') + ' ₽' }

export default function HostPayoutsScreen() {
  const router = useRouter()
  const qc = useQueryClient()

  const { data: stats, isLoading: statsLoading } = useQuery<PayoutStats>({
    queryKey: ['host', 'payout-stats'],
    queryFn: async () => { const { data } = await api.get('/host/payouts/stats'); return data },
  })
  const { data: payouts = [], isLoading: listLoading } = useQuery<Payout[]>({
    queryKey: ['host', 'payouts'],
    queryFn: async () => { const { data } = await api.get('/host/payouts'); return data },
  })
  const request = useMutation({
    mutationFn: async () => { await api.post('/host/payouts/request') },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['host', 'payout-stats'] })
      qc.invalidateQueries({ queryKey: ['host', 'payouts'] })
      Alert.alert('Готово', 'Запрос на выплату отправлен')
    },
    onError: () => Alert.alert('Ошибка', 'Не удалось отправить запрос'),
  })

  const canRequest = (stats?.availableBalance ?? 0) >= 500

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.title}>Выплаты</Text>
      </View>

      <FlatList
        data={payouts}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Balance cards */}
            {statsLoading ? (
              <View style={s.skeletonRow}>
                {[0,1,2].map(i => <View key={i} style={s.skeletonCard} />)}
              </View>
            ) : (
              <View style={s.balanceRow}>
                <View style={[s.balanceCard, s.balanceCardPrimary]}>
                  <Text style={s.balanceLabelWhite}>Доступно</Text>
                  <Text style={s.balanceAmountWhite}>{fmt(stats?.availableBalance ?? 0)}</Text>
                </View>
                <View style={s.balanceCard}>
                  <Text style={s.balanceLabel}>Удерживается</Text>
                  <Text style={s.balanceAmount}>{fmt(stats?.pendingBalance ?? 0)}</Text>
                </View>
                <View style={s.balanceCard}>
                  <Text style={s.balanceLabel}>Всего выплачено</Text>
                  <Text style={s.balanceAmount}>{fmt(stats?.totalPaid ?? 0)}</Text>
                </View>
              </View>
            )}

            {/* CTA */}
            <TouchableOpacity
              style={[s.requestBtn, !canRequest && s.requestBtnDisabled]}
              onPress={() => request.mutate()}
              disabled={!canRequest || request.isPending}
            >
              {request.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.requestBtnText}>
                    {canRequest ? 'Запросить выплату' : 'Минимум 500 ₽ для вывода'}
                  </Text>}
            </TouchableOpacity>

            <Text style={s.sectionTitle}>История выплат</Text>
          </View>
        }
        ListEmptyComponent={
          listLoading
            ? <View>{[0,1,2].map(i => <View key={i} style={s.skeletonItem} />)}</View>
            : <View style={s.empty}>
                <Text style={s.emptyIcon}>💸</Text>
                <Text style={s.emptyText}>Выплат пока нет</Text>
              </View>
        }
        renderItem={({ item }) => (
          <View style={s.row}>
            <Text style={s.statusEmoji}>{STATUS_EMOJI[item.status]}</Text>
            <View style={s.rowInfo}>
              <Text style={s.period}>{item.period}</Text>
              <Text style={s.statusLabel}>{STATUS_LABEL[item.status]}</Text>
            </View>
            <Text style={s.amount}>{fmt(item.amount)}</Text>
          </View>
        )}
        contentContainerStyle={s.list}
      />
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
  list: { padding: 16, gap: 8 },
  balanceRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  balanceCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  balanceCardPrimary: { backgroundColor: '#16a34a' },
  balanceLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  balanceLabelWhite: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  balanceAmount: { fontSize: 15, fontWeight: '700', color: '#111827' },
  balanceAmountWhite: { fontSize: 15, fontWeight: '700', color: '#fff' },
  skeletonRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  skeletonCard: { flex: 1, height: 70, backgroundColor: '#e5e7eb', borderRadius: 14 },
  skeletonItem: { height: 56, backgroundColor: '#e5e7eb', borderRadius: 12, marginBottom: 8 },
  requestBtn: {
    backgroundColor: '#16a34a', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 24,
  },
  requestBtnDisabled: { backgroundColor: '#a7f3c0' },
  requestBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 8 },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#6b7280' },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12,
    padding: 14, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  statusEmoji: { fontSize: 22 },
  rowInfo: { flex: 1 },
  period: { fontSize: 14, fontWeight: '600', color: '#111827' },
  statusLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '700', color: '#111827' },
})
