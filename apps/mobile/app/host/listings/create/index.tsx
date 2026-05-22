import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useState, useRef, useEffect } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { ArrowLeft, ArrowRight, X, Plus, Minus } from 'lucide-react-native'
import { ListingType, ListingCondition } from '@rigs/types'
import type { CreateListingDto } from '@rigs/types'
import { useCategories } from '../../../../hooks/use-categories'
import { useCreateListing } from '../../../../hooks/use-listings'
import { api } from '../../../../lib/api'

const TOTAL_STEPS = 12

interface WizardData {
  listingType: ListingType
  categoryId: number | null
  photos: string[]
  title: string
  description: string
  brand: string
  model: string
  year: string
  condition: ListingCondition
  priceHourly: string
  priceDaily: string
  priceWeekly: string
  priceMonthly: string
  depositAmount: string
  withInsurance: boolean
  instantBook: boolean
  minRentalHours: string
  maxRentalDays: string
  requiresPassport: boolean
  requiresLicense: boolean
  requiresCert: boolean
  minAge: string
  city: string
  address: string
  deliveryAvailable: boolean
  deliveryRadiusKm: string
  deliveryPricePerKm: string
}

const INITIAL: WizardData = {
  listingType: ListingType.EQUIPMENT,
  categoryId: null,
  photos: [],
  title: '',
  description: '',
  brand: '',
  model: '',
  year: '',
  condition: ListingCondition.GOOD,
  priceHourly: '',
  priceDaily: '',
  priceWeekly: '',
  priceMonthly: '',
  depositAmount: '',
  withInsurance: false,
  instantBook: false,
  minRentalHours: '1',
  maxRentalDays: '',
  requiresPassport: false,
  requiresLicense: false,
  requiresCert: false,
  minAge: '18',
  city: '',
  address: '',
  deliveryAvailable: false,
  deliveryRadiusKm: '',
  deliveryPricePerKm: '',
}

const LISTING_TYPES = [
  { type: ListingType.EQUIPMENT, emoji: '🎽', label: 'Снаряжение' },
  { type: ListingType.EXPERIENCE, emoji: '🧭', label: 'Опыт/Услуга' },
  { type: ListingType.LOCATION, emoji: '📍', label: 'Локация' },
  { type: ListingType.PACKAGE, emoji: '📦', label: 'Пакет' },
]

const CONDITION_OPTIONS: { value: ListingCondition; label: string }[] = [
  { value: ListingCondition.NEW, label: 'Новое' },
  { value: ListingCondition.EXCELLENT, label: 'Отличное' },
  { value: ListingCondition.GOOD, label: 'Хорошее' },
  { value: ListingCondition.FAIR, label: 'Удовлетворительное' },
]

export default function CreateListingScreen() {
  const router = useRouter()
  const { editId } = useLocalSearchParams<{ editId?: string }>()
  const isEditMode = !!editId
  const [step, setStep] = useState(1)
  const [data, setData] = useState<WizardData>(INITIAL)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const { data: categories = [] } = useCategories()
  const createListing = useCreateListing()

  const topCategories = categories.filter((c) => !c.parentId)

  function update(partial: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...partial }))
  }

  useEffect(() => {
    if (!editId) return
    api.get(`/listings/${editId}`).then(({ data: listing }) => {
      // Single setData call so all fields land atomically (avoids stale-closure
      // overwrites when both updates fire from the same effect)
      setData((prev) => ({
        ...prev,
        categoryId: listing.categoryId ?? prev.categoryId,
        listingType: listing.listingType ?? prev.listingType,
        title: listing.title ?? '',
        description: listing.description ?? '',
        priceDaily: listing.priceDaily ? String(listing.priceDaily) : '',
        priceHourly: listing.priceHourly ? String(listing.priceHourly) : '',
        priceWeekly: listing.priceWeekly ? String(listing.priceWeekly) : '',
        priceMonthly: listing.priceMonthly ? String(listing.priceMonthly) : '',
        depositAmount: listing.depositAmount ? String(listing.depositAmount) : '',
        city: listing.city ?? '',
        address: listing.address ?? '',
        deliveryAvailable: listing.deliveryAvailable ?? false,
        deliveryRadiusKm: listing.deliveryRadiusKm ? String(listing.deliveryRadiusKm) : '',
        deliveryPricePerKm: listing.deliveryPricePerKm ? String(listing.deliveryPricePerKm) : '',
        instantBook: listing.instantBook ?? false,
        condition: listing.condition,
        minRentalHours: listing.minRentalHours ? String(listing.minRentalHours) : '',
        maxRentalDays: listing.maxRentalDays ? String(listing.maxRentalDays) : '',
        requiresPassport: listing.requiresPassport ?? false,
        requiresLicense: listing.requiresLicense ?? false,
        requiresCert: listing.requiresCert ?? false,
        minAge: listing.minAge ? String(listing.minAge) : '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        photos: listing.media?.length > 0 ? listing.media.map((m: any) => m.url) : prev.photos,
      }))
    }).catch(() => {})
  }, [editId])

  async function uploadPhoto(uri: string): Promise<string> {
    const filename = uri.split('/').pop() ?? 'photo.jpg'
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg'
    const type = ext === 'png' ? 'image/png' : 'image/jpeg'
    const formData = new FormData()
    formData.append('file', { uri, name: filename, type } as unknown as Blob)
    const { data: res } = await api.post<{ url: string }>('/upload/temp', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.url
  }

  async function pickPhotos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    })
    if (!result.canceled) {
      const localUris = result.assets.map((a) => a.uri)
      const remaining = 10 - data.photos.length
      const toUpload = localUris.slice(0, remaining)
      setUploadingPhotos(true)
      try {
        const uploaded = await Promise.all(toUpload.map(uploadPhoto))
        // Functional update — read latest photos from state to avoid the
        // stale-closure bug when the user picks photos twice quickly.
        setData((prev) => ({ ...prev, photos: [...prev.photos, ...uploaded] }))
      } catch {
        Alert.alert('Ошибка', 'Не удалось загрузить фото. Проверьте соединение.')
      } finally {
        setUploadingPhotos(false)
      }
    }
  }

  function removePhoto(uri: string) {
    update({ photos: data.photos.filter((p) => p !== uri) })
  }

  async function attachPhotoToListing(listingId: string, url: string, index: number) {
    // Fetch the already-uploaded temp image and re-post it as multipart so the
    // API can move it to the permanent listings/ prefix in S3.
    const response = await fetch(url)
    const blob = await response.blob()
    const isWebp = url.endsWith('.webp') || blob.type === 'image/webp'
    const filename = `photo_${index}.${isWebp ? 'webp' : 'jpg'}`
    const type = isWebp ? 'image/webp' : 'image/jpeg'
    const formData = new FormData()
    formData.append('file', { uri: url, name: filename, type } as unknown as Blob)
    await api.post(`/upload/listings/${listingId}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  async function handlePublish() {
    if (!data.categoryId || !data.title || !data.city) {
      Alert.alert('Заполните все обязательные поля')
      return
    }

    const dto: CreateListingDto = {
      listingType: data.listingType,
      categoryId: data.categoryId,
      title: data.title.trim(),
      description: data.description.trim() || undefined,
      condition: data.condition,
      city: data.city.trim(),
      address: data.address.trim() || undefined,
      brand: data.brand.trim() || undefined,
      model: data.model.trim() || undefined,
      year: data.year ? parseInt(data.year, 10) : undefined,
      priceHourly: data.priceHourly ? parseFloat(data.priceHourly) : undefined,
      priceDaily: data.priceDaily ? parseFloat(data.priceDaily) : undefined,
      priceWeekly: data.priceWeekly ? parseFloat(data.priceWeekly) : undefined,
      priceMonthly: data.priceMonthly ? parseFloat(data.priceMonthly) : undefined,
      depositAmount: data.depositAmount ? parseFloat(data.depositAmount) : undefined,
      instantBook: data.instantBook,
      minRentalHours: data.minRentalHours ? parseInt(data.minRentalHours, 10) : undefined,
      maxRentalDays: data.maxRentalDays ? parseInt(data.maxRentalDays, 10) : undefined,
      requiresPassport: data.requiresPassport,
      requiresLicense: data.requiresLicense,
      requiresCert: data.requiresCert,
      minAge: data.minAge ? parseInt(data.minAge, 10) : 18,
      deliveryAvailable: data.deliveryAvailable,
      deliveryRadiusKm: data.deliveryRadiusKm ? parseFloat(data.deliveryRadiusKm) : undefined,
      deliveryPricePerKm: data.deliveryPricePerKm ? parseFloat(data.deliveryPricePerKm) : undefined,
    }

    try {
      if (isEditMode) {
        await api.patch(`/listings/${editId}`, dto)
        router.replace('/host/listings')
        return
      }

      const listing = await createListing.mutateAsync(dto)

      // Attach the temp-uploaded photos to the newly created listing
      if (data.photos.length > 0) {
        try {
          await Promise.all(
            data.photos.map((url, index) => attachPhotoToListing(listing.id, url, index))
          )
        } catch {
          Alert.alert(
            'Объявление создано',
            'Фотографии не удалось прикрепить. Добавьте их в разделе редактирования.',
          )
        }
      }

      router.replace('/host/listings')
    } catch (e: any) {
      Alert.alert('Ошибка', e?.response?.data?.message ?? 'Не удалось опубликовать')
    }
  }

  function canGoNext(): boolean {
    switch (step) {
      case 2: return data.categoryId !== null
      case 4: return data.title.length > 2
      case 10: return data.city.length > 0
      default: return true
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            if (step === 1) router.back()
            else setStep((s) => s - 1)
          }}
        >
          <ArrowLeft size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Шаг {step} из {TOTAL_STEPS}</Text>
        <View style={styles.headerBtn} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {step === 1 && (
          <StepWrapper title="Тип объявления">
            <View style={styles.typeGrid}>
              {LISTING_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.type}
                  style={[styles.typeCard, data.listingType === t.type && styles.typeCardActive]}
                  onPress={() => update({ listingType: t.type })}
                >
                  <Text style={styles.typeEmoji}>{t.emoji}</Text>
                  <Text style={[styles.typeLabel, data.listingType === t.type && styles.typeLabelActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </StepWrapper>
        )}

        {step === 2 && (
          <StepWrapper title="Категория">
            <View style={styles.catGrid}>
              {topCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catCard, data.categoryId === cat.id && styles.catCardActive]}
                  onPress={() => update({ categoryId: cat.id })}
                >
                  <Text style={[styles.catLabel, data.categoryId === cat.id && styles.catLabelActive]}>
                    {cat.nameRu}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </StepWrapper>
        )}

        {step === 3 && (
          <StepWrapper title="Фотографии (до 10)">
            <View style={styles.photosGrid}>
              {data.photos.map((uri) => (
                <View key={uri} style={styles.photoWrapper}>
                  <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                  <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(uri)}>
                    <X size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {uploadingPhotos && (
                <View style={styles.photoAdd}>
                  <ActivityIndicator color="#16a34a" />
                  <Text style={styles.photoAddText}>Загрузка...</Text>
                </View>
              )}
              {!uploadingPhotos && data.photos.length < 10 && (
                <TouchableOpacity style={styles.photoAdd} onPress={pickPhotos}>
                  <Plus size={24} color="#16a34a" />
                  <Text style={styles.photoAddText}>Добавить</Text>
                </TouchableOpacity>
              )}
            </View>
          </StepWrapper>
        )}

        {step === 4 && (
          <StepWrapper title="Название и описание">
            <TextInput
              value={data.title}
              onChangeText={(v) => update({ title: v })}
              placeholder="Название объявления"
              style={styles.input}
              maxLength={100}
            />
            <TextInput
              value={data.description}
              onChangeText={(v) => update({ description: v })}
              placeholder="Подробное описание..."
              style={[styles.input, styles.textarea]}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </StepWrapper>
        )}

        {step === 5 && (
          <StepWrapper title="Характеристики">
            <LabeledInput label="Бренд" value={data.brand} onChange={(v) => update({ brand: v })} placeholder="Nike, Yamaha..." />
            <LabeledInput label="Модель" value={data.model} onChange={(v) => update({ model: v })} placeholder="Модель" />
            <LabeledInput label="Год выпуска" value={data.year} onChange={(v) => update({ year: v })} placeholder="2022" keyboardType="numeric" />
            <View style={styles.conditionRow}>
              <Text style={styles.fieldLabel}>Состояние</Text>
              <View style={styles.conditionOptions}>
                {CONDITION_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.conditionBtn, data.condition === opt.value && styles.conditionBtnActive]}
                    onPress={() => update({ condition: opt.value })}
                  >
                    <Text style={[styles.conditionBtnText, data.condition === opt.value && styles.conditionBtnTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </StepWrapper>
        )}

        {step === 6 && (
          <StepWrapper title="Цены">
            <LabeledInput label="Цена за час (₽)" value={data.priceHourly} onChange={(v) => update({ priceHourly: v })} placeholder="0" keyboardType="numeric" suffix="₽" />
            <LabeledInput label="Цена за день (₽)" value={data.priceDaily} onChange={(v) => update({ priceDaily: v })} placeholder="0" keyboardType="numeric" suffix="₽" />
            <LabeledInput label="Цена за неделю (₽)" value={data.priceWeekly} onChange={(v) => update({ priceWeekly: v })} placeholder="0" keyboardType="numeric" suffix="₽" />
            <LabeledInput label="Цена за месяц (₽)" value={data.priceMonthly} onChange={(v) => update({ priceMonthly: v })} placeholder="0" keyboardType="numeric" suffix="₽" />
          </StepWrapper>
        )}

        {step === 7 && (
          <StepWrapper title="Залог и страховка">
            <LabeledInput label="Залог (₽)" value={data.depositAmount} onChange={(v) => update({ depositAmount: v })} placeholder="0" keyboardType="numeric" suffix="₽" />
            <View style={styles.toggleRow}>
              <Text style={styles.fieldLabel}>Доступна страховка</Text>
              <Switch
                value={data.withInsurance}
                onValueChange={(v) => update({ withInsurance: v })}
                trackColor={{ false: '#d1d5db', true: '#86efac' }}
                thumbColor={data.withInsurance ? '#16a34a' : '#fff'}
              />
            </View>
          </StepWrapper>
        )}

        {step === 8 && (
          <StepWrapper title="Настройки бронирования">
            <View style={styles.toggleRow}>
              <Text style={styles.fieldLabel}>Мгновенное бронирование</Text>
              <Switch
                value={data.instantBook}
                onValueChange={(v) => update({ instantBook: v })}
                trackColor={{ false: '#d1d5db', true: '#86efac' }}
                thumbColor={data.instantBook ? '#16a34a' : '#fff'}
              />
            </View>
            <View style={styles.stepperRow}>
              <Text style={styles.fieldLabel}>Минимум часов</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => update({ minRentalHours: String(Math.max(1, parseInt(data.minRentalHours || '1') - 1)) })}
                >
                  <Minus size={14} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.stepperVal}>{data.minRentalHours || '1'}</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => update({ minRentalHours: String(parseInt(data.minRentalHours || '1') + 1) })}
                >
                  <Plus size={14} color="#111827" />
                </TouchableOpacity>
              </View>
            </View>
            <LabeledInput label="Максимум дней" value={data.maxRentalDays} onChange={(v) => update({ maxRentalDays: v })} placeholder="30" keyboardType="numeric" />
          </StepWrapper>
        )}

        {step === 9 && (
          <StepWrapper title="Требования к арендатору">
            <CheckboxRow label="Паспорт" value={data.requiresPassport} onChange={(v) => update({ requiresPassport: v })} />
            <CheckboxRow label="Водительские права" value={data.requiresLicense} onChange={(v) => update({ requiresLicense: v })} />
            <CheckboxRow label="Сертификат" value={data.requiresCert} onChange={(v) => update({ requiresCert: v })} />
            <LabeledInput label="Минимальный возраст" value={data.minAge} onChange={(v) => update({ minAge: v })} placeholder="18" keyboardType="numeric" />
          </StepWrapper>
        )}

        {step === 10 && (
          <StepWrapper title="Локация">
            <LabeledInput label="Город*" value={data.city} onChange={(v) => update({ city: v })} placeholder="Москва" />
            <LabeledInput label="Адрес" value={data.address} onChange={(v) => update({ address: v })} placeholder="Улица, дом" />
          </StepWrapper>
        )}

        {step === 11 && (
          <StepWrapper title="Доставка">
            <View style={styles.toggleRow}>
              <Text style={styles.fieldLabel}>Доступна доставка</Text>
              <Switch
                value={data.deliveryAvailable}
                onValueChange={(v) => update({ deliveryAvailable: v })}
                trackColor={{ false: '#d1d5db', true: '#86efac' }}
                thumbColor={data.deliveryAvailable ? '#16a34a' : '#fff'}
              />
            </View>
            {data.deliveryAvailable && (
              <>
                <LabeledInput label="Радиус доставки (км)" value={data.deliveryRadiusKm} onChange={(v) => update({ deliveryRadiusKm: v })} placeholder="20" keyboardType="numeric" />
                <LabeledInput label="Цена за км (₽)" value={data.deliveryPricePerKm} onChange={(v) => update({ deliveryPricePerKm: v })} placeholder="30" keyboardType="numeric" suffix="₽" />
              </>
            )}
          </StepWrapper>
        )}

        {step === 12 && (
          <StepWrapper title={isEditMode ? 'Сохранение изменений' : 'Готово к публикации'}>
            <View style={styles.previewBlock}>
              <PreviewRow label="Тип" value={LISTING_TYPES.find((t) => t.type === data.listingType)?.label ?? data.listingType} />
              <PreviewRow label="Название" value={data.title} />
              <PreviewRow label="Город" value={data.city} />
              {data.brand && <PreviewRow label="Бренд" value={data.brand} />}
              {data.model && <PreviewRow label="Модель" value={data.model} />}
              {data.priceDaily && <PreviewRow label="Цена/день" value={`${data.priceDaily} ₽`} />}
              {data.depositAmount && <PreviewRow label="Залог" value={`${data.depositAmount} ₽`} />}
              <PreviewRow label="Фото" value={`${data.photos.length} шт.`} />
            </View>

            <TouchableOpacity
              style={[styles.publishBtn, createListing.isPending && styles.disabledBtn]}
              onPress={handlePublish}
              disabled={createListing.isPending}
            >
              {createListing.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.publishBtnText}>{isEditMode ? 'Сохранить изменения' : 'Опубликовать'}</Text>
              )}
            </TouchableOpacity>
          </StepWrapper>
        )}
      </ScrollView>

      {/* Bottom navigation */}
      {step < 12 && (
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={[styles.nextBtn, !canGoNext() && styles.disabledBtn]}
            disabled={!canGoNext()}
            onPress={() => setStep((s) => Math.min(TOTAL_STEPS, s + 1))}
          >
            <Text style={styles.nextBtnText}>Далее</Text>
            <ArrowRight size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

function StepWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sw.wrap}>
      <Text style={sw.title}>{title}</Text>
      {children}
    </View>
  )
}

const sw = StyleSheet.create({
  wrap: { gap: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
})

function LabeledInput({
  label, value, onChange, placeholder, keyboardType = 'default', suffix,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; keyboardType?: any; suffix?: string
}) {
  return (
    <View style={li.wrap}>
      <Text style={li.label}>{label}</Text>
      <View style={li.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          style={[li.input, suffix ? { paddingRight: 36 } : undefined]}
          keyboardType={keyboardType}
        />
        {suffix && <Text style={li.suffix}>{suffix}</Text>}
      </View>
    </View>
  )
}

const li = StyleSheet.create({
  wrap: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  inputWrap: { position: 'relative' },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  suffix: {
    position: 'absolute',
    right: 14,
    top: 14,
    fontSize: 14,
    color: '#6b7280',
  },
})

function CheckboxRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity style={cbr.row} onPress={() => onChange(!value)}>
      <View style={[cbr.box, value && cbr.boxChecked]}>
        {value && <Text style={cbr.check}>✓</Text>}
      </View>
      <Text style={cbr.label}>{label}</Text>
    </TouchableOpacity>
  )
}

const cbr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  check: { color: '#fff', fontSize: 13, fontWeight: '700' },
  label: { fontSize: 15, color: '#111827' },
})

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={pr.row}>
      <Text style={pr.label}>{label}</Text>
      <Text style={pr.value}>{value}</Text>
    </View>
  )
}

const pr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  label: { fontSize: 14, color: '#6b7280' },
  value: { fontSize: 14, color: '#111827', fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '600', color: '#374151' },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#16a34a',
    borderRadius: 2,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    width: '47%',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  typeCardActive: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  typeEmoji: { fontSize: 32 },
  typeLabel: { fontSize: 14, fontWeight: '600', color: '#374151', textAlign: 'center' },
  typeLabelActive: { color: '#16a34a' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  catCardActive: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  catLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },
  catLabelActive: { color: '#16a34a', fontWeight: '700' },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoWrapper: { position: 'relative' },
  photoThumb: { width: 96, height: 96, borderRadius: 10 },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAdd: {
    width: 96,
    height: 96,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#86efac',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoAddText: { fontSize: 11, color: '#16a34a', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  textarea: { height: 120, textAlignVertical: 'top' },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  conditionRow: { gap: 8 },
  conditionOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  conditionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  conditionBtnActive: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  conditionBtnText: { fontSize: 13, color: '#374151' },
  conditionBtnTextActive: { color: '#16a34a', fontWeight: '700' },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
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
  stepperVal: { fontSize: 16, fontWeight: '600', color: '#111827', minWidth: 28, textAlign: 'center' },
  previewBlock: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
  },
  publishBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 16,
  },
  publishBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabledBtn: { opacity: 0.5 },
  bottomNav: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  nextBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
