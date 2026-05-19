'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { CheckCircle, Upload, X } from 'lucide-react'
import { ListingType, ListingCondition } from '@rigs/types'
import type { CreateListingDto, ListingAttribute } from '@rigs/types'
import { useAuthStore } from '@/store/auth.store'
import { useCreateListing } from '@/hooks/use-listings'
import { useCategories } from '@/hooks/use-categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CityAutocomplete } from '@/components/ui/city-autocomplete'
import { api } from '@/lib/api'

async function compressImage(file: File, maxWidthPx = 1600, qualityJpeg = 0.82): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const scale = Math.min(1, maxWidthPx / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => resolve(blob ?? file),
        file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        qualityJpeg,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file) }
    img.src = objectUrl
  })
}

const TOTAL_STEPS = 12
const DRAFT_KEY = 'rigs_listing_draft'
const DRAFT_SAVED_AT_KEY = 'rigs_listing_draft_saved_at'
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

type WizardData = Partial<CreateListingDto> & {
  listingId?: string
  uploadedMediaUrls?: string[]
  insuranceEnabled?: boolean
  latitude?: number
  longitude?: number
}

const LISTING_TYPE_OPTIONS = [
  { value: ListingType.EQUIPMENT, label: 'Снаряжение', description: 'Доски, байдарки, палатки...' },
  { value: ListingType.EXPERIENCE, label: 'Опыт', description: 'Экскурсии, мастер-классы...' },
  { value: ListingType.LOCATION, label: 'Локация', description: 'Площадка, водоём, поле...' },
  { value: ListingType.PACKAGE, label: 'Пакет', description: 'Снаряжение + опыт' },
]

const CONDITION_OPTIONS = [
  { value: ListingCondition.NEW, label: 'Новое' },
  { value: ListingCondition.EXCELLENT, label: 'Отличное' },
  { value: ListingCondition.GOOD, label: 'Хорошее' },
  { value: ListingCondition.FAIR, label: 'Удовлетворительное' },
]

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
      <div
        className="bg-brand-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${(step / total) * 100}%` }}
      />
    </div>
  )
}

export default function NewListingPage() {
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<WizardData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(DRAFT_KEY)
        const savedAt = localStorage.getItem(DRAFT_SAVED_AT_KEY)
        if (saved) {
          const isStale = savedAt
            ? Date.now() - new Date(savedAt).getTime() > DRAFT_TTL_MS
            : true
          if (isStale) {
            localStorage.removeItem(DRAFT_KEY)
            localStorage.removeItem(DRAFT_SAVED_AT_KEY)
            return {}
          }
          return JSON.parse(saved)
        }
      } catch {
        return {}
      }
    }
    return {}
  })
  const [uploading, setUploading] = useState(false)
  const [attributes, setAttributes] = useState<ListingAttribute[]>([])

  const { data: categories } = useCategories()
  const createListing = useCreateListing()

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<WizardData>({
    defaultValues: draft,
  })

  useEffect(() => {
    if (!accessToken) router.replace('/auth')
  }, [accessToken, router])

  function saveDraft(updates: WizardData) {
    const next = { ...draft, ...updates }
    setDraft(next)
    localStorage.setItem(DRAFT_KEY, JSON.stringify(next))
    localStorage.setItem(DRAFT_SAVED_AT_KEY, new Date().toISOString())
  }

  function nextStep(data?: WizardData) {
    if (data) saveDraft(data)
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 1))
  }

  async function handlePhotoUpload(files: FileList) {
    if (!files.length) return
    setUploading(true)
    const listingId = draft.listingId
    const urls: string[] = [...(draft.uploadedMediaUrls ?? [])]
    for (const file of Array.from(files)) {
      const formData = new FormData()
      const compressed = await compressImage(file)
      const compressedFile = new File([compressed], file.name, { type: compressed.type })
      formData.append('file', compressedFile)
      try {
        const endpoint = listingId
          ? `/upload/listings/${listingId}/media`
          : '/upload/temp'
        const { data } = await api.post<{ url: string }>(endpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        urls.push(data.url)
      } catch {
        // Skip failed uploads
      }
    }
    saveDraft({ uploadedMediaUrls: urls })
    setUploading(false)
  }

  async function handlePublish() {
    const { geoPoint, ...restDraft } = draft
    const dto = {
      categoryId: restDraft.categoryId!,
      title: restDraft.title!,
      description: restDraft.description,
      listingType: restDraft.listingType!,
      city: restDraft.city!,
      address: restDraft.address,
      region: restDraft.region,
      latitude: geoPoint?.lat ?? restDraft.latitude,
      longitude: geoPoint?.lng ?? restDraft.longitude,
      brand: restDraft.brand,
      model: restDraft.model,
      year: restDraft.year,
      condition: restDraft.condition ?? ListingCondition.GOOD,
      quantity: restDraft.quantity ?? 1,
      priceHourly: restDraft.priceHourly,
      priceDaily: restDraft.priceDaily,
      priceWeekly: restDraft.priceWeekly,
      priceMonthly: restDraft.priceMonthly,
      depositAmount: restDraft.depositAmount,
      minRentalHours: restDraft.minRentalHours,
      maxRentalDays: restDraft.maxRentalDays,
      instantBook: restDraft.instantBook,
      deliveryAvailable: restDraft.deliveryAvailable,
      deliveryRadiusKm: restDraft.deliveryRadiusKm,
      deliveryPricePerKm: restDraft.deliveryPricePerKm,
      requiresPassport: restDraft.requiresPassport,
      requiresLicense: restDraft.requiresLicense,
      requiresCert: restDraft.requiresCert,
      minAge: restDraft.minAge,
      tags: restDraft.tags ?? [],
      attributes,
    }
    try {
      const listing = await createListing.mutateAsync(dto)

      // Block any dates the host specified in step 8
      const blockedRanges = (draft as any)._blockedRanges as BlockedRange[] | undefined
      if (blockedRanges && blockedRanges.length > 0) {
        try {
          await api.post(`/listings/${listing.id}/block-dates`, { ranges: blockedRanges })
        } catch {
          // Non-fatal — host can always block dates from the edit page later
        }
      }

      localStorage.removeItem(DRAFT_KEY)
      localStorage.removeItem(DRAFT_SAVED_AT_KEY)
      router.push(`/listing/${listing.id}`)
    } catch {
      // Error shown from mutation state
    }
  }

  if (!accessToken) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Шаг {step} из {TOTAL_STEPS}</span>
            <button
              onClick={() => { if (confirm('Сохранить и выйти?')) router.push('/host/listings') }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Сохранить как черновик
            </button>
          </div>
          <ProgressBar step={step} total={TOTAL_STEPS} />
        </div>

        {/* Step 1: Type */}
        {step === 1 && (
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Что вы хотите сдать?</h1>
            <p className="text-sm text-gray-500 mb-6">Выберите тип объявления</p>
            <div className="grid grid-cols-2 gap-3">
              {LISTING_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => nextStep({ listingType: opt.value })}
                  className={`p-4 text-left rounded-2xl border-2 transition-all hover:border-brand-600 hover:bg-brand-50 ${
                    draft.listingType === opt.value ? 'border-brand-600 bg-brand-50' : 'border-gray-200'
                  }`}
                >
                  <p className="font-semibold text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Category */}
        {step === 2 && (
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Категория</h1>
            <p className="text-sm text-gray-500 mb-6">Выберите категорию снаряжения</p>
            <div className="space-y-2">
              {categories?.map((cat) => (
                <div key={cat.id}>
                  <button
                    onClick={() => nextStep({ categoryId: cat.id })}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all hover:border-brand-600 ${
                      draft.categoryId === cat.id ? 'border-brand-600 bg-brand-50' : 'border-gray-200'
                    }`}
                  >
                    <span className="font-medium text-gray-900">{cat.nameRu}</span>
                  </button>
                  {cat.children?.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => nextStep({ categoryId: child.id })}
                      className={`w-full text-left px-4 py-2 pl-8 rounded-xl border-2 mt-1 transition-all hover:border-brand-600 text-sm ${
                        draft.categoryId === child.id ? 'border-brand-600 bg-brand-50' : 'border-gray-200'
                      }`}
                    >
                      {child.nameRu}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-4" onClick={prevStep}>Назад</Button>
          </div>
        )}

        {/* Step 3: Photos */}
        {step === 3 && (
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Фотографии</h1>
            <p className="text-sm text-gray-500 mb-6">Добавьте качественные фото снаряжения</p>
            <label className="block border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center cursor-pointer hover:border-brand-600 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && handlePhotoUpload(e.target.files)}
              />
              {uploading ? (
                <div className="flex items-center justify-center gap-2 text-gray-500">
                  <div className="animate-spin w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full" />
                  Загрузка...
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">Перетащите фото или нажмите для выбора</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG до 10MB каждый</p>
                </>
              )}
            </label>
            {(draft.uploadedMediaUrls ?? []).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {draft.uploadedMediaUrls!.map((url, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => {
                        const updated = draft.uploadedMediaUrls!.filter((_, j) => j !== i)
                        saveDraft({ uploadedMediaUrls: updated })
                      }}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <Button variant="ghost" onClick={prevStep}>Назад</Button>
              <Button onClick={() => nextStep()} fullWidth>
                Продолжить
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Title & Description */}
        {step === 4 && (
          <form onSubmit={handleSubmit((d) => nextStep({ title: d.title, description: d.description }))}>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Название и описание</h1>
            <p className="text-sm text-gray-500 mb-6">Расскажите о своём снаряжении</p>
            <div className="space-y-4">
              <Input
                label="Название объявления"
                fullWidth
                defaultValue={draft.title}
                {...register('title', { required: 'Обязательное поле' })}
                error={errors.title?.message}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                <textarea
                  className="w-full h-32 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  defaultValue={draft.description}
                  {...register('description')}
                  placeholder="Опишите снаряжение, его особенности и условия использования..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button type="button" variant="ghost" onClick={prevStep}>Назад</Button>
              <Button type="submit" fullWidth>Продолжить</Button>
            </div>
          </form>
        )}

        {/* Step 5: Characteristics */}
        {step === 5 && (
          <form onSubmit={handleSubmit((d) => nextStep({ brand: d.brand, model: d.model, year: d.year ? Number(d.year) : undefined, condition: d.condition }))}>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Характеристики</h1>
            <p className="text-sm text-gray-500 mb-6">Технические данные снаряжения</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Бренд" fullWidth defaultValue={draft.brand} {...register('brand')} />
                <Input label="Модель" fullWidth defaultValue={draft.model} {...register('model')} />
              </div>
              <Input label="Год выпуска" type="number" fullWidth defaultValue={draft.year} {...register('year')} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Состояние</label>
                <select
                  defaultValue={draft.condition ?? ListingCondition.GOOD}
                  {...register('condition')}
                  className="w-full h-10 border border-gray-300 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {CONDITION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button type="button" variant="ghost" onClick={prevStep}>Назад</Button>
              <Button type="submit" fullWidth>Продолжить</Button>
            </div>
          </form>
        )}

        {/* Step 6: Prices */}
        {step === 6 && (
          <form onSubmit={handleSubmit((d) => nextStep({
            priceHourly: d.priceHourly ? Number(d.priceHourly) : undefined,
            priceDaily: d.priceDaily ? Number(d.priceDaily) : undefined,
            priceWeekly: d.priceWeekly ? Number(d.priceWeekly) : undefined,
            priceMonthly: d.priceMonthly ? Number(d.priceMonthly) : undefined,
          }))}>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Цены</h1>
            <p className="text-sm text-gray-500 mb-6">Установите стоимость аренды</p>
            <div className="space-y-4">
              {[
                { key: 'priceHourly' as const, label: 'Почасовая цена (₽/час)', default: draft.priceHourly },
                { key: 'priceDaily' as const, label: 'Суточная цена (₽/день)', default: draft.priceDaily },
                { key: 'priceWeekly' as const, label: 'Недельная цена (₽/неделя)', default: draft.priceWeekly },
                { key: 'priceMonthly' as const, label: 'Месячная цена (₽/месяц)', default: draft.priceMonthly },
              ].map(({ key, label, default: def }) => (
                <div key={key} className="flex items-center gap-2">
                  <Input label={label} type="number" min={0} fullWidth defaultValue={def} {...register(key)} />
                  <span className="text-sm text-gray-500 mt-5 shrink-0">₽</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <Button type="button" variant="ghost" onClick={prevStep}>Назад</Button>
              <Button type="submit" fullWidth>Продолжить</Button>
            </div>
          </form>
        )}

        {/* Step 7: Deposit & Insurance */}
        {step === 7 && (
          <form onSubmit={handleSubmit((d) => nextStep({ depositAmount: d.depositAmount ? Number(d.depositAmount) : undefined }))}>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Залог и страховка</h1>
            <p className="text-sm text-gray-500 mb-6">Защита вашего снаряжения</p>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input label="Сумма залога (₽)" type="number" min={0} fullWidth defaultValue={draft.depositAmount} {...register('depositAmount')} />
                <span className="text-sm text-gray-500 mt-5 shrink-0">₽</span>
              </div>
              <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-brand-600 transition-colors">
                <input
                  type="checkbox"
                  defaultChecked={draft.insuranceEnabled}
                  onChange={(e) => saveDraft({ insuranceEnabled: e.target.checked })}
                  className="accent-brand-600 w-5 h-5"
                />
                <div>
                  <p className="font-medium text-gray-900">Предложить страховку</p>
                  <p className="text-sm text-gray-500">Арендаторы смогут добавить страховку (+4%)</p>
                </div>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <Button type="button" variant="ghost" onClick={prevStep}>Назад</Button>
              <Button type="submit" fullWidth>Продолжить</Button>
            </div>
          </form>
        )}

        {/* Step 8: Availability */}
        {step === 8 && (
          <AvailabilityStep
            draft={draft}
            onNext={(blockedRanges) => nextStep({ _blockedRanges: blockedRanges } as any)}
            onBack={prevStep}
          />
        )}

        {/* Step 9: Rules */}
        {step === 9 && (
          <form onSubmit={handleSubmit((d) => nextStep({
            instantBook: (d as WizardData & { instantBook?: boolean }).instantBook,
            minRentalHours: d.minRentalHours ? Number(d.minRentalHours) : undefined,
            maxRentalDays: d.maxRentalDays ? Number(d.maxRentalDays) : undefined,
          }))}>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Правила аренды</h1>
            <p className="text-sm text-gray-500 mb-6">Установите условия</p>
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-brand-600 transition-colors">
                <input
                  type="checkbox"
                  defaultChecked={draft.instantBook}
                  {...register('instantBook' as keyof WizardData)}
                  className="accent-brand-600 w-5 h-5"
                />
                <div>
                  <p className="font-medium text-gray-900">Мгновенное бронирование</p>
                  <p className="text-sm text-gray-500">Арендаторы бронируют без подтверждения</p>
                </div>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Мин. срок (часов)"
                  type="number"
                  min={1}
                  fullWidth
                  defaultValue={draft.minRentalHours}
                  {...register('minRentalHours')}
                />
                <Input
                  label="Макс. срок (дней)"
                  type="number"
                  min={1}
                  fullWidth
                  defaultValue={draft.maxRentalDays}
                  {...register('maxRentalDays')}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button type="button" variant="ghost" onClick={prevStep}>Назад</Button>
              <Button type="submit" fullWidth>Продолжить</Button>
            </div>
          </form>
        )}

        {/* Step 10: Requirements */}
        {step === 10 && (
          <form onSubmit={handleSubmit((d) => nextStep({
            requiresPassport: !!(d as WizardData).requiresPassport,
            requiresLicense: !!(d as WizardData).requiresLicense,
            requiresCert: !!(d as WizardData).requiresCert,
            minAge: d.minAge ? Number(d.minAge) : 0,
          }))}>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Требования к арендаторам</h1>
            <p className="text-sm text-gray-500 mb-6">Что нужно для аренды</p>
            <div className="space-y-3">
              {[
                { key: 'requiresPassport', label: 'Паспорт гражданина РФ' },
                { key: 'requiresLicense', label: 'Водительское удостоверение' },
                { key: 'requiresCert', label: 'Специальный сертификат/допуск' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:border-brand-600 transition-colors">
                  <input
                    type="checkbox"
                    defaultChecked={(draft as Record<string, unknown>)[key] as boolean}
                    {...register(key as keyof WizardData)}
                    className="accent-brand-600"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
              <Input
                label="Минимальный возраст"
                type="number"
                min={0}
                max={99}
                fullWidth
                defaultValue={draft.minAge}
                {...register('minAge')}
              />
            </div>
            <div className="flex gap-3 mt-6">
              <Button type="button" variant="ghost" onClick={prevStep}>Назад</Button>
              <Button type="submit" fullWidth>Продолжить</Button>
            </div>
          </form>
        )}

        {/* Step 11: Location */}
        {step === 11 && (
          <form onSubmit={handleSubmit((d) => {
            const updates: WizardData = { city: d.city, address: d.address, region: d.region }
            if (draft.geoPoint) {
              updates.latitude = draft.geoPoint.lat
              updates.longitude = draft.geoPoint.lng
            }
            nextStep(updates)
          })}>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Местоположение</h1>
            <p className="text-sm text-gray-500 mb-6">Где находится снаряжение</p>
            <div className="space-y-4">
              <CityAutocomplete
                label="Город"
                fullWidth
                value={watch('city') ?? draft.city ?? ''}
                onChange={(value) => setValue('city', value)}
                error={errors.city?.message}
              />
              <Input
                label="Регион"
                fullWidth
                defaultValue={draft.region}
                {...register('region')}
              />
              <Input
                label="Адрес (необязательно)"
                fullWidth
                defaultValue={draft.address}
                {...register('address')}
              />
            </div>
            <div className="flex gap-3 mt-6">
              <Button type="button" variant="ghost" onClick={prevStep}>Назад</Button>
              <Button type="submit" fullWidth>Продолжить</Button>
            </div>
          </form>
        )}

        {/* Step 12: Preview & Publish */}
        {step === 12 && (
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Предпросмотр</h1>
            <p className="text-sm text-gray-500 mb-6">Проверьте данные перед публикацией</p>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Название</span>
                <span className="font-medium text-gray-900">{draft.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Город</span>
                <span className="font-medium text-gray-900">{draft.city}</span>
              </div>
              {draft.priceDaily && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Цена в сутки</span>
                  <span className="font-medium text-gray-900">{draft.priceDaily} ₽</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Фотографий</span>
                <span className="font-medium text-gray-900">{draft.uploadedMediaUrls?.length ?? 0}</span>
              </div>
            </div>
            {createListing.isError && (
              <p className="text-sm text-red-500 mt-4 text-center">
                Ошибка публикации. Проверьте данные и попробуйте снова.
              </p>
            )}
            <div className="flex gap-3 mt-6">
              <Button variant="ghost" onClick={prevStep}>Назад</Button>
              <Button
                fullWidth
                size="lg"
                loading={createListing.isPending}
                onClick={handlePublish}
              >
                <CheckCircle className="w-4 h-4" />
                Опубликовать
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Availability Step ────────────────────────────────────────────────────────

interface BlockedRange {
  startDate: string
  endDate: string
}

function AvailabilityStep({
  draft,
  onNext,
  onBack,
}: {
  draft: WizardData
  onNext: (ranges: BlockedRange[]) => void
  onBack: () => void
}) {
  const existing = (draft as any)._blockedRanges as BlockedRange[] | undefined
  const [ranges, setRanges] = useState<BlockedRange[]>(existing ?? [])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')

  function addRange() {
    setError('')
    if (!startDate || !endDate) {
      setError('Укажите начало и конец периода')
      return
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('Дата окончания должна быть позже начала')
      return
    }
    setRanges((prev) => [...prev, { startDate, endDate }])
    setStartDate('')
    setEndDate('')
  }

  function removeRange(i: number) {
    setRanges((prev) => prev.filter((_, idx) => idx !== i))
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Недоступные даты</h1>
      <p className="text-sm text-gray-500 mb-6">
        Добавьте периоды, когда снаряжение нельзя арендовать (отпуск, техобслуживание и т.д.)
      </p>

      {/* Add range form */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 mb-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Начало"
            type="date"
            fullWidth
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
          <Input
            label="Конец"
            type="date"
            fullWidth
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate || new Date().toISOString().split('T')[0]}
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button variant="secondary" size="sm" onClick={addRange} type="button">
          + Добавить период
        </Button>
      </div>

      {/* List of blocked ranges */}
      {ranges.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Нет заблокированных дат</p>
      ) : (
        <div className="space-y-2 mb-4">
          {ranges.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 text-sm"
            >
              <span className="text-gray-700">
                {new Date(r.startDate).toLocaleDateString('ru-RU')}
                {' — '}
                {new Date(r.endDate).toLocaleDateString('ru-RU')}
              </span>
              <button
                type="button"
                onClick={() => removeRange(i)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <Button variant="ghost" onClick={onBack} type="button">
          Назад
        </Button>
        <Button onClick={() => onNext(ranges)} fullWidth type="button">
          Продолжить
        </Button>
      </div>
    </div>
  )
}
