import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, MapPin } from 'lucide-react-native'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { differenceInCalendarDays } from 'date-fns'
import { formatPrice, plural } from '@rigs/utils'
import { BookingStatus } from '@rigs/types'
import { useBooking, useCancelBooking } from '../../hooks/use-bookings'
import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useAuthStore } from '../../store/auth.store'
import { Badge } from '../../components/ui/badge'
import { PriceRow } from '../../components/ui/price-row'
import type { BadgeVariant } from '../../components/ui/badge'

function statusLabel(status: BookingStatus): string {
  const map: Record<BookingStatus, string> = {
    [BookingStatus.PENDING]: 'Ожидает подтверждения',
    [BookingStatus.CONFIRMED]: 'Подтверждено',
    [BookingStatus.PAID]: 'Оплачено',
    [BookingStatus.ACTIVE]: 'Активно',
    [BookingStatus.COMPLETED]: 'Завершено',
    [BookingStatus.CANCELLED_RENTER]: 'Отменено арендатором',
    [BookingStatus.CANCELLED_HOST]: 'Отменено хостом',
    [BookingStatus.DISPUTED]: 'Спор',
    [BookingStatus.REFUNDED]: 'Возврат',
  }
  return map[status] ?? status
}

function statusVariant(status: BookingStatus): BadgeVariant {
  switch (status) {
    case BookingStatus.ACTIVE: return 'success'
    case BookingStatus.CONFIRMED:
    case BookingStatus.PAID: return 'info'
    case BookingStatus.PENDING: return 'warning'
    case BookingStatus.CANCELLED_RENTER:
    case BookingStatus.CANCELLED_HOST:
    case BookingStatus.DISPUTED: return 'danger'
    default: return 'default'
  }
}

function RentalProgressBar({ startDate, endDate }: { startDate: string; endDate: string }) {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  const now = Date.now()
  const totalMs = end - start
  const elapsedMs = Math.max(0, Math.min(now - start, totalMs))
  const progress = totalMs > 0 ? (elapsedMs / totalMs) * 100 : 0
  const hoursLeft = Math.max(0, Math.round((end - now) / 3_600_000))
  const daysLeft = Math.floor(hoursLeft / 24)
  const label = daysLeft > 0 ? `Осталось ${daysLeft} дн. ${hoursLeft % 24} ч.` : hoursLeft > 0 ? `Осталось ${hoursLeft} ч.` : 'Время аренды истекло'

  return (
    <View style={progressStyles.container}>
      <View style={progressStyles.header}>
        <Text style={progressStyles.title}>Прогресс аренды</Text>
        <Text style={progressStyles.label}>{label}</Text>
      </View>
      <View style={progressStyles.track}>
        <View style={[progressStyles.fill, { width: `${Math.round(progress)}%` as any }]} />
      </View>
      <Text style={progressStyles.percent}>{Math.round(progress)}% завершено</Text>
    </View>
  )
}

const progressStyles = StyleSheet.create({
  container: { backgroundColor: '#f0fdf4', borderRadius: 16, padding: 16, marginTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 13, fontWeight: '600', color: '#166534' },
  label: { fontSize: 12, color: '#16a34a' },
  track: { height: 8, backgroundColor: '#dcfce7', borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: '#16a34a', borderRadius: 4 },
  percent: { fontSize: 11, color: '#6b7280', marginTop: 6, textAlign: 'right' },
})

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: booking, isLoading, error } = useBooking(id)
  const cancelBooking = useCancelBooking()
  const { user } = useAuthStore()

  // Review state
  const [reviewVisible, setReviewVisible] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [rating, setRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')

  // After booking loads, check if the current user already left a review for this booking
  useEffect(() => {
    if (!booking || !user || reviewed) return
    const listingId = booking.listingId
    api
      .get<{ reviewerId: string; bookingId: string }[]>(`/reviews/listing/${listingId}`)
      .then(({ data: reviews }) => {
        const alreadyReviewed = reviews.some(
          (r) => r.reviewerId === user.id && r.bookingId === booking.id,
        )
        if (alreadyReviewed) setReviewed(true)
      })
      .catch(() => {
        // Non-critical: if the check fails, the user can still try to submit
        // (the API will reject with 409 Conflict if already reviewed)
      })
  }, [booking, user, reviewed])

  const submitReview = useMutation({
    mutationFn: async () => {
      await api.post('/reviews', { bookingId: id, rating, text: reviewComment })
    },
    onSuccess: () => {
      setReviewed(true)
      setReviewVisible(false)
      Alert.alert('Спасибо!', 'Ваш отзыв опубликован')
    },
    onError: () => Alert.alert('Ошибка', 'Не удалось отправить отзыв'),
  })

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    )
  }

  if (error || !booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Не удалось загрузить бронирование</Text>
      </View>
    )
  }

  const listing = booking.listing
  const coverUri = listing?.media?.find((m) => m.isCover)?.url ?? listing?.media?.[0]?.url
  const startD = new Date(booking.startDate)
  const endD = new Date(booking.endDate)
  const days = differenceInCalendarDays(endD, startD)
  const formatD = (d: Date) => format(d, 'd MMM yyyy', { locale: ru })

  function handleCancel() {
    Alert.alert(
      'Отменить бронирование?',
      'Это действие нельзя отменить.',
      [
        { text: 'Нет', style: 'cancel' },
        {
          text: 'Да, отменить',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelBooking.mutateAsync({ id: booking!.id })
              router.back()
            } catch {
              Alert.alert('Ошибка', 'Не удалось отменить')
            }
          },
        },
      ],
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Бронирование</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Status */}
        <View style={styles.statusRow}>
          <Badge label={statusLabel(booking.status)} variant={statusVariant(booking.status)} />
        </View>

        {/* Listing */}
        <View style={styles.listingCard}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.listingImage} resizeMode="cover" />
          ) : (
            <View style={[styles.listingImage, styles.imageFallback]} />
          )}
          <View style={styles.listingInfo}>
            <Text style={styles.listingTitle} numberOfLines={2}>{listing?.title ?? '—'}</Text>
            <View style={styles.cityRow}>
              <MapPin size={12} color="#6b7280" />
              <Text style={styles.cityText}>{listing?.city ?? ''}</Text>
            </View>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Даты</Text>
          <View style={styles.datesRow}>
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>Начало</Text>
              <Text style={styles.dateValue}>{formatD(startD)}</Text>
            </View>
            <View style={styles.dateDivider} />
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>Окончание</Text>
              <Text style={styles.dateValue}>{formatD(endD)}</Text>
            </View>
          </View>
          <Text style={styles.durationText}>
            {days} {plural(days, ['день', 'дня', 'дней'])}
          </Text>
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Стоимость</Text>
          <View style={styles.pricingBlock}>
            <PriceRow label="Аренда" amount={booking.subtotal} />
            <PriceRow label="Сервисный сбор" amount={booking.serviceFee} />
            {booking.insuranceFee > 0 && <PriceRow label="Страховка" amount={booking.insuranceFee} />}
            {booking.deliveryFee > 0 && <PriceRow label="Доставка" amount={booking.deliveryFee} />}
            {booking.depositAmount > 0 && <PriceRow label="Залог" amount={booking.depositAmount} />}
            <View style={styles.totalDivider} />
            <PriceRow label="Итого" amount={booking.totalAmount} bold />
          </View>
        </View>

        {/* Rental progress bar */}
        {booking.status === BookingStatus.ACTIVE && (
          <RentalProgressBar startDate={booking.startDate} endDate={booking.endDate} />
        )}

        {/* Check-in codes */}
        {booking.status === BookingStatus.ACTIVE && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Коды</Text>
            <View style={styles.codesRow}>
              {booking.checkinCode && (
                <View style={styles.codeCard}>
                  <Text style={styles.codeLabel}>Код выдачи</Text>
                  <Text style={styles.codeValue}>{booking.checkinCode}</Text>
                </View>
              )}
              {booking.checkoutCode && (
                <View style={styles.codeCard}>
                  <Text style={styles.codeLabel}>Код возврата</Text>
                  <Text style={styles.codeValue}>{booking.checkoutCode}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Checkin photos */}
        {booking.checkinPhotos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Фото при выдаче</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photosRow}>
                {booking.checkinPhotos.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={styles.photo} resizeMode="cover" />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          {(booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.PAID) && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push({ pathname: '/booking/[id]', params: { id: booking.id } })}
            >
              <Text style={styles.actionBtnText}>Выдача</Text>
            </TouchableOpacity>
          )}
          {booking.status === BookingStatus.ACTIVE && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push({ pathname: '/booking/[id]', params: { id: booking.id } })}
            >
              <Text style={styles.actionBtnText}>Возврат</Text>
            </TouchableOpacity>
          )}
          {booking.status === BookingStatus.COMPLETED && !reviewed && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => setReviewVisible(true)}>
              <Text style={styles.actionBtnText}>Оставить отзыв</Text>
            </TouchableOpacity>
          )}
          {reviewed && (
            <View style={styles.reviewedBadge}>
              <Text style={styles.reviewedText}>✓ Отзыв оставлен</Text>
            </View>
          )}

          {/* Review modal */}
          <Modal visible={reviewVisible} transparent animationType="slide" onRequestClose={() => setReviewVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Оставить отзыв</Text>
                <Text style={styles.modalSub}>Оцените аренду от 1 до 5 звёзд</Text>

                {/* Stars */}
                <View style={styles.starsRow}>
                  {[1,2,3,4,5].map((s) => (
                    <TouchableOpacity key={s} onPress={() => setRating(s)}>
                      <Text style={[styles.star, s <= rating && styles.starActive]}>★</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Comment */}
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Комментарий (необязательно)"
                  placeholderTextColor="#9ca3af"
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  multiline
                  numberOfLines={3}
                />

                {/* Buttons */}
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setReviewVisible(false)}>
                    <Text style={styles.modalBtnCancelText}>Отмена</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtnSubmit, (rating === 0 || submitReview.isPending) && styles.modalBtnDisabled]}
                    onPress={() => submitReview.mutate()}
                    disabled={rating === 0 || submitReview.isPending}
                  >
                    {submitReview.isPending
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.modalBtnSubmitText}>Отправить</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          {booking.status === BookingStatus.PENDING && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={handleCancel}
              disabled={cancelBooking.isPending}
            >
              {cancelBooking.isPending ? (
                <ActivityIndicator color="#dc2626" />
              ) : (
                <Text style={styles.cancelBtnText}>Отменить</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, color: '#6b7280' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#111827' },
  scroll: { padding: 16, gap: 0 },
  statusRow: { marginBottom: 16 },
  listingCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 20,
  },
  listingImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  imageFallback: { backgroundColor: '#d1d5db' },
  listingInfo: { flex: 1 },
  listingTitle: { fontSize: 14, fontWeight: '600', color: '#111827', lineHeight: 18 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  cityText: { fontSize: 12, color: '#6b7280' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
  },
  dateBox: { flex: 1, alignItems: 'center' },
  dateLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  dateValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  dateDivider: { width: 1, height: 32, backgroundColor: '#e5e7eb' },
  durationText: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 8 },
  pricingBlock: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
  },
  totalDivider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 6 },
  codesRow: { flexDirection: 'row', gap: 12 },
  codeCard: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#86efac',
    alignItems: 'center',
  },
  codeLabel: { fontSize: 11, color: '#16a34a', marginBottom: 6, fontWeight: '600' },
  codeValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#15803d',
    fontFamily: 'monospace',
    letterSpacing: 3,
  },
  photosRow: { flexDirection: 'row', gap: 8 },
  photo: { width: 100, height: 100, borderRadius: 8 },
  actionsSection: { gap: 10, marginBottom: 20 },
  actionBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  cancelBtnText: { color: '#dc2626', fontSize: 15, fontWeight: '700' },
  reviewedBadge: {
    backgroundColor: '#f0fdf4', borderRadius: 12, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#86efac',
  },
  reviewedText: { color: '#16a34a', fontWeight: '600', fontSize: 14 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  modalSub: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  star: { fontSize: 36, color: '#d1d5db' },
  starActive: { color: '#f59e0b' },
  reviewInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12,
    fontSize: 14, color: '#111827', height: 80, textAlignVertical: 'top', marginBottom: 20,
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtnCancel: {
    flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  modalBtnCancelText: { fontSize: 15, color: '#374151', fontWeight: '600' },
  modalBtnSubmit: {
    flex: 1, backgroundColor: '#16a34a', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  modalBtnDisabled: { backgroundColor: '#a7f3c0' },
  modalBtnSubmitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
