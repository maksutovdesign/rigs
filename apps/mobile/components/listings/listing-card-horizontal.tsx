import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { formatPrice } from '@rigs/utils'
import type { Booking } from '@rigs/types'
import { BookingStatus } from '@rigs/types'
import { Badge } from '../ui/badge'
import type { BadgeVariant } from '../ui/badge'

interface ListingCardHorizontalProps {
  booking: Booking
  onPress?: () => void
}

function statusLabel(status: BookingStatus): string {
  const map: Record<BookingStatus, string> = {
    [BookingStatus.PENDING]: 'Ожидает',
    [BookingStatus.CONFIRMED]: 'Подтверждено',
    [BookingStatus.PAID]: 'Оплачено',
    [BookingStatus.ACTIVE]: 'Активно',
    [BookingStatus.COMPLETED]: 'Завершено',
    [BookingStatus.CANCELLED_RENTER]: 'Отменено',
    [BookingStatus.CANCELLED_HOST]: 'Отменено хостом',
    [BookingStatus.DISPUTED]: 'Спор',
    [BookingStatus.REFUNDED]: 'Возврат',
  }
  return map[status] ?? status
}

function statusVariant(status: BookingStatus): BadgeVariant {
  switch (status) {
    case BookingStatus.ACTIVE:
      return 'success'
    case BookingStatus.CONFIRMED:
    case BookingStatus.PAID:
      return 'info'
    case BookingStatus.PENDING:
      return 'warning'
    case BookingStatus.CANCELLED_RENTER:
    case BookingStatus.CANCELLED_HOST:
    case BookingStatus.DISPUTED:
      return 'danger'
    case BookingStatus.COMPLETED:
      return 'default'
    default:
      return 'default'
  }
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  return `${format(s, 'd MMM', { locale: ru })} – ${format(e, 'd MMM yyyy', { locale: ru })}`
}

export function ListingCardHorizontal({ booking, onPress }: ListingCardHorizontalProps) {
  const listing = booking.listing
  const coverUri = listing?.media?.find((m) => m.isCover)?.url ?? listing?.media?.[0]?.url

  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.card} onPress={onPress}>
      <View style={styles.imageWrapper}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imageFallback]} />
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {listing?.title ?? 'Объявление'}
        </Text>
        <Text style={styles.city}>{listing?.city ?? ''}</Text>
        <Text style={styles.dates}>{formatDateRange(booking.startDate, booking.endDate)}</Text>

        <View style={styles.footer}>
          <Badge label={statusLabel(booking.status)} variant={statusVariant(booking.status)} />
          <Text style={styles.price}>{formatPrice(booking.totalAmount)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  imageWrapper: {},
  image: {
    width: 96,
    height: 96,
    backgroundColor: '#e5e7eb',
  },
  imageFallback: {
    backgroundColor: '#d1d5db',
  },
  content: {
    flex: 1,
    padding: 10,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 18,
  },
  city: {
    fontSize: 12,
    color: '#6b7280',
  },
  dates: {
    fontSize: 12,
    color: '#374151',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
})
