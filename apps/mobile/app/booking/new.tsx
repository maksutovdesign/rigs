import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native'
import { useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, CheckCircle, Minus, Plus } from 'lucide-react-native'
import { format, differenceInCalendarDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import { formatPrice, calcBookingTotal } from '@rigs/utils'
import { DeliveryType } from '@rigs/types'
import { useListing } from '../../hooks/use-listings'
import { useCreateBooking } from '../../hooks/use-bookings'
import { PriceRow } from '../../components/ui/price-row'
import { CalendarPicker } from '../../components/ui/calendar-picker'

type Step = 1 | 2 | 3

export default function NewBookingScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>()
  const router = useRouter()
  const { data: listing, isLoading } = useListing(listingId)
  const createBooking = useCreateBooking()

  const [step, setStep] = useState<Step>(1)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [withInsurance, setWithInsurance] = useState(false)
  const [withDelivery, setWithDelivery] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null)

  if (isLoading || !listing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    )
  }

  const days = startDate && endDate && endDate > startDate
    ? differenceInCalendarDays(endDate, startDate)
    : 0
  const pricePerDay = listing.priceDaily ?? 0
  const subtotal = pricePerDay * days * quantity
  const deliveryFee = withDelivery ? (listing.deliveryPricePerKm ?? 0) * 10 : 0
  const pricing = calcBookingTotal({ subtotal, withInsurance, deliveryFee })
  const coverUri = listing.media.find((m) => m.isCover)?.url ?? listing.media[0]?.url

  async function handlePay() {
    if (!startDate || !endDate) {
      Alert.alert('Ошибка', 'Выберите даты аренды')
      return
    }
    try {
      const booking = await createBooking.mutateAsync({
        listingId: listing!.id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        quantity,
        deliveryType: withDelivery ? DeliveryType.DELIVERY : DeliveryType.PICKUP,
        deliveryAddress: withDelivery ? deliveryAddress : undefined,
        withInsurance,
      })
      setCreatedBookingId(booking.id)
      // Open payment page in browser if URL provided
      if ((booking as any).paymentUrl) {
        await Linking.openURL((booking as any).paymentUrl)
      }
      setStep(3)
    } catch (e: any) {
      Alert.alert('Ошибка', e?.response?.data?.message ?? 'Не удалось создать бронирование')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {step > 1 && step < 3 ? (
          <TouchableOpacity onPress={() => setStep((s) => (s - 1) as Step)} style={styles.headerBack}>
            <ArrowLeft size={20} color="#111827" />
          </TouchableOpacity>
        ) : step === 1 ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
            <ArrowLeft size={20} color="#111827" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBack} />
        )}
        <Text style={styles.headerTitle}>
          {step === 1 ? 'Даты и детали' : step === 2 ? 'Подтверждение' : 'Готово'}
        </Text>
        <View style={styles.headerBack} />
      </View>

      {/* Progress */}
      {step < 3 && (
        <View style={styles.progressRow}>
          {[1, 2].map((s) => (
            <View key={s} style={[styles.progressStep, step >= s && styles.progressStepActive]} />
          ))}
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Listing preview */}
        <View style={styles.listingPreview}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.previewImage} resizeMode="cover" />
          ) : (
            <View style={[styles.previewImage, styles.imageFallback]} />
          )}
          <View style={styles.previewInfo}>
            <Text style={styles.previewTitle} numberOfLines={2}>{listing.title}</Text>
            <Text style={styles.previewCity}>{listing.city}</Text>
          </View>
        </View>

        {step === 1 && (
          <View style={styles.form}>
            <Text style={styles.formLabel}>
              {!startDate ? 'Выберите дату начала' : !endDate ? 'Выберите дату окончания' : 'Период аренды'}
            </Text>

            {/* Date range display */}
            {(startDate || endDate) && (
              <View style={styles.dateRangeRow}>
                <View style={[styles.dateChip, startDate ? styles.dateChipActive : styles.dateChipEmpty]}>
                  <Text style={styles.dateChipLabel}>С</Text>
                  <Text style={[styles.dateChipValue, !startDate && styles.dateChipPlaceholder]}>
                    {startDate ? format(startDate, 'd MMM', { locale: ru }) : '—'}
                  </Text>
                </View>
                <View style={styles.dateRangeDash} />
                <View style={[styles.dateChip, endDate ? styles.dateChipActive : styles.dateChipEmpty]}>
                  <Text style={styles.dateChipLabel}>По</Text>
                  <Text style={[styles.dateChipValue, !endDate && styles.dateChipPlaceholder]}>
                    {endDate ? format(endDate, 'd MMM', { locale: ru }) : '—'}
                  </Text>
                </View>
                {days > 0 && (
                  <Text style={styles.daysChip}>{days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}</Text>
                )}
              </View>
            )}

            <CalendarPicker
              startDate={startDate}
              endDate={endDate}
              minDate={new Date()}
              onRangeChange={(s, e) => { setStartDate(s); setEndDate(e) }}
            />

            {listing.quantity > 1 && (
              <View style={styles.stepperRow}>
                <Text style={styles.formLabel}>Количество</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                    style={styles.stepperBtn}
                  >
                    <Minus size={16} color="#111827" />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{quantity}</Text>
                  <TouchableOpacity
                    onPress={() => setQuantity((q) => Math.min(listing.availableQty, q + 1))}
                    style={styles.stepperBtn}
                  >
                    <Plus size={16} color="#111827" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.formLabel}>Страховка</Text>
                <Text style={styles.toggleSub}>
                  +{formatPrice(Math.round(subtotal * 0.04))}
                </Text>
              </View>
              <Switch
                value={withInsurance}
                onValueChange={setWithInsurance}
                trackColor={{ false: '#d1d5db', true: '#86efac' }}
                thumbColor={withInsurance ? '#16a34a' : '#fff'}
              />
            </View>

            {listing.deliveryAvailable && (
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.formLabel}>Доставка</Text>
                  {listing.deliveryPricePerKm && (
                    <Text style={styles.toggleSub}>{listing.deliveryPricePerKm} ₽/км</Text>
                  )}
                </View>
                <Switch
                  value={withDelivery}
                  onValueChange={setWithDelivery}
                  trackColor={{ false: '#d1d5db', true: '#86efac' }}
                  thumbColor={withDelivery ? '#16a34a' : '#fff'}
                />
              </View>
            )}

            {withDelivery && (
              <>
                <Text style={styles.formLabel}>Адрес доставки</Text>
                <TextInput
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                  placeholder="Улица, дом"
                  style={styles.dateInput}
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.nextBtn, (!startDate || !endDate || days === 0) && styles.nextBtnDisabled]}
              disabled={!startDate || !endDate || days === 0}
              onPress={() => setStep(2)}
            >
              <Text style={styles.nextBtnText}>Далее</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.form}>
            <Text style={styles.confirmSectionTitle}>Детали бронирования</Text>
            <Text style={styles.datesLine}>
              {startDate ? format(startDate, 'd MMM yyyy', { locale: ru }) : '—'}
              {' — '}
              {endDate ? format(endDate, 'd MMM yyyy', { locale: ru }) : '—'}
              {days > 0 ? ` · ${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}` : ''}
            </Text>

            <View style={styles.pricingBlock}>
              <PriceRow
                label={`Аренда (${days} × ${formatPrice(pricePerDay)})`}
                amount={subtotal}
              />
              <PriceRow label="Сервисный сбор (11%)" amount={pricing.serviceFee} />
              {withInsurance && <PriceRow label="Страховка (4%)" amount={pricing.insuranceFee} />}
              {withDelivery && pricing.deliveryFee > 0 && (
                <PriceRow label="Доставка" amount={pricing.deliveryFee} />
              )}
              {listing.depositAmount && listing.depositAmount > 0 && (
                <PriceRow label="Залог (возвратный)" amount={listing.depositAmount} />
              )}
              <View style={styles.totalDivider} />
              <PriceRow label="Итого" amount={pricing.totalAmount} bold />
            </View>

            <TouchableOpacity
              style={[styles.payBtn, createBooking.isPending && styles.nextBtnDisabled]}
              onPress={handlePay}
              disabled={createBooking.isPending}
            >
              {createBooking.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.nextBtnText}>
                  Оплатить {formatPrice(pricing.totalAmount)}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View style={styles.successBlock}>
            <View style={styles.successIcon}>
              <CheckCircle size={56} color="#16a34a" />
            </View>
            <Text style={styles.successTitle}>Бронирование создано!</Text>
            {createdBookingId && (
              <Text style={styles.bookingIdText}>№ {createdBookingId}</Text>
            )}

            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => router.replace('/(tabs)/rentals')}
            >
              <Text style={styles.nextBtnText}>Мои аренды</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.successBtnOutline}
              onPress={() =>
                router.push({
                  pathname: '/chat/[conversationId]',
                  params: { conversationId: listing.hostId },
                })
              }
            >
              <Text style={styles.successBtnOutlineText}>Написать хосту</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerBack: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#111827' },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  progressStep: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
  },
  progressStepActive: { backgroundColor: '#16a34a' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  listingPreview: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  previewImage: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  imageFallback: { backgroundColor: '#d1d5db' },
  previewInfo: { flex: 1 },
  previewTitle: { fontSize: 14, fontWeight: '600', color: '#111827', lineHeight: 18 },
  previewCity: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  form: { gap: 12 },
  formLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  dateInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  dateRangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateChip: {
    flex: 1, borderRadius: 10, padding: 10, alignItems: 'center',
    borderWidth: 1.5,
  },
  dateChipActive: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  dateChipEmpty: { borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  dateChipLabel: { fontSize: 10, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' },
  dateChipValue: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 2 },
  dateChipPlaceholder: { color: '#d1d5db' },
  dateRangeDash: { width: 12, height: 1.5, backgroundColor: '#d1d5db' },
  daysChip: {
    fontSize: 12, fontWeight: '700', color: '#16a34a',
    backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  daysText: { fontSize: 13, color: '#16a34a', fontWeight: '600' },
  stepperRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { fontSize: 16, fontWeight: '600', color: '#111827', minWidth: 24, textAlign: 'center' },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggleSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  nextBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  payBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  confirmSectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  datesLine: { fontSize: 14, color: '#374151' },
  pricingBlock: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    gap: 2,
  },
  totalDivider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 6 },
  successBlock: { alignItems: 'center', gap: 16, paddingTop: 40 },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  bookingIdText: { fontSize: 13, color: '#6b7280' },
  successBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  successBtnOutline: {
    borderWidth: 1,
    borderColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    width: '100%',
  },
  successBtnOutlineText: { color: '#16a34a', fontSize: 16, fontWeight: '600' },
})
