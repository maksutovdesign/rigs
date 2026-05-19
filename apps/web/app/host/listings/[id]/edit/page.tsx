'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { ListingType, ListingCondition, ListingStatus } from '@rigs/types'
import type { CreateListingDto } from '@rigs/types'
import { useAuthStore } from '@/store/auth.store'
import { useListing, useUpdateListing } from '@/hooks/use-listings'
import { useCategories } from '@/hooks/use-categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// ─── Form fields (subset of CreateListingDto editable post-creation) ─────────

type EditForm = Pick<
  CreateListingDto,
  | 'title'
  | 'description'
  | 'categoryId'
  | 'listingType'
  | 'city'
  | 'condition'
  | 'priceDaily'
  | 'priceHourly'
  | 'quantity'
  | 'minRentalHours'
  | 'instantBook'
  | 'deliveryAvailable'
  | 'requiresLicense'
  | 'requiresPassport'
  | 'minAge'
>

const LISTING_TYPE_OPTIONS = [
  { value: ListingType.EQUIPMENT, label: 'Снаряжение' },
  { value: ListingType.EXPERIENCE, label: 'Опыт' },
  { value: ListingType.LOCATION, label: 'Локация' },
  { value: ListingType.PACKAGE, label: 'Пакет' },
]

const CONDITION_OPTIONS = [
  { value: ListingCondition.NEW, label: 'Новое' },
  { value: ListingCondition.EXCELLENT, label: 'Отличное' },
  { value: ListingCondition.GOOD, label: 'Хорошее' },
  { value: ListingCondition.FAIR, label: 'Удовлетворительное' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-5 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">{title}</h2>
      {children}
    </div>
  )
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <div>
        <p className="text-sm font-medium text-neutral-900">{label}</p>
        {description && <p className="text-xs text-neutral-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-brand-600' : 'bg-neutral-200',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </button>
    </label>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditListingPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { data: listing, isLoading } = useListing(id)
  const { data: categories } = useCategories()
  const updateListing = useUpdateListing()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<EditForm>()

  // Pre-fill form when listing loads
  useEffect(() => {
    if (listing) {
      reset({
        title: listing.title,
        description: listing.description,
        categoryId: listing.categoryId,
        listingType: listing.listingType,
        city: listing.city,
        condition: listing.condition,
        priceDaily: listing.priceDaily,
        priceHourly: listing.priceHourly,
        quantity: listing.quantity,
        minRentalHours: listing.minRentalHours,
        instantBook: listing.instantBook,
        deliveryAvailable: listing.deliveryAvailable,
        requiresLicense: listing.requiresLicense,
        requiresPassport: listing.requiresPassport,
        minAge: listing.minAge,
      })
    }
  }, [listing, reset])

  useEffect(() => {
    if (!accessToken) router.replace('/auth')
  }, [accessToken, router])

  if (!accessToken) return null

  function onSubmit(data: EditForm) {
    updateListing.mutate(
      { id, dto: data },
      {
        onSuccess: () => {
          router.push('/host/listings')
        },
      },
    )
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-neutral-100 p-5 h-36 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-500 mb-4">Объявление не найдено</p>
          <Link href="/host/listings">
            <Button variant="secondary">К объявлениям</Button>
          </Link>
        </div>
      </div>
    )
  }

  const watchedInstantBook = watch('instantBook') ?? listing.instantBook
  const watchedDelivery = watch('deliveryAvailable') ?? listing.deliveryAvailable
  const watchedLicense = watch('requiresLicense') ?? listing.requiresLicense
  const watchedPassport = watch('requiresPassport') ?? listing.requiresPassport

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/host/listings">
            <button className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-neutral-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-neutral-600" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-neutral-900">Редактировать объявление</h1>
            <p className="text-sm text-neutral-400 mt-0.5 truncate">{listing.title}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Basic info */}
          <FormSection title="Основное">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Название <span className="text-red-500">*</span>
              </label>
              <input
                {...register('title', { required: 'Обязательное поле', maxLength: 120 })}
                className="input w-full"
                placeholder="Название объявления"
              />
              {errors.title && (
                <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Описание</label>
              <textarea
                {...register('description')}
                rows={4}
                className="input w-full resize-none"
                placeholder="Подробное описание снаряжения или опыта"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Категория</label>
                <select {...register('categoryId', { valueAsNumber: true })} className="input w-full">
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nameRu}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Тип</label>
                <select {...register('listingType')} className="input w-full">
                  {LISTING_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Город</label>
                <input
                  {...register('city', { required: 'Укажите город' })}
                  className="input w-full"
                  placeholder="Москва"
                />
                {errors.city && (
                  <p className="text-xs text-red-500 mt-1">{errors.city.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Состояние</label>
                <select {...register('condition')} className="input w-full">
                  {CONDITION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </FormSection>

          {/* Pricing */}
          <FormSection title="Цены">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Цена за день, ₽"
                type="number"
                min={0}
                {...register('priceDaily', { valueAsNumber: true, min: 0 })}
                placeholder="5000"
              />
              <Input
                label="Цена за час, ₽"
                type="number"
                min={0}
                {...register('priceHourly', { valueAsNumber: true, min: 0 })}
                placeholder="800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Кол-во единиц"
                type="number"
                min={1}
                {...register('quantity', { valueAsNumber: true, min: 1 })}
                placeholder="1"
              />
              <Input
                label="Мин. аренда, ч"
                type="number"
                min={1}
                {...register('minRentalHours', { valueAsNumber: true, min: 1 })}
                placeholder="4"
              />
            </div>
          </FormSection>

          {/* Options */}
          <FormSection title="Параметры">
            <ToggleField
              label="Мгновенное бронирование"
              description="Арендаторы могут бронировать без подтверждения с вашей стороны"
              checked={watchedInstantBook}
              onChange={(v) => setValue('instantBook', v, { shouldDirty: true })}
            />
            <ToggleField
              label="Доставка"
              description="Вы готовы доставить снаряжение"
              checked={watchedDelivery}
              onChange={(v) => setValue('deliveryAvailable', v, { shouldDirty: true })}
            />
          </FormSection>

          {/* Requirements */}
          <FormSection title="Требования к арендатору">
            <ToggleField
              label="Требуется водительское удостоверение"
              checked={watchedLicense}
              onChange={(v) => setValue('requiresLicense', v, { shouldDirty: true })}
            />
            <ToggleField
              label="Требуется паспорт"
              checked={watchedPassport}
              onChange={(v) => setValue('requiresPassport', v, { shouldDirty: true })}
            />
            <div className="w-32">
              <Input
                label="Мин. возраст"
                type="number"
                min={0}
                max={99}
                {...register('minAge', { valueAsNumber: true })}
                placeholder="18"
              />
            </div>
          </FormSection>

          {/* Submit */}
          <div className="flex items-center justify-between pt-2">
            <Link href="/host/listings">
              <Button type="button" variant="ghost">Отмена</Button>
            </Link>
            <Button
              type="submit"
              loading={updateListing.isPending}
              disabled={!isDirty && !updateListing.isPending}
            >
              <Save className="w-4 h-4" />
              Сохранить изменения
            </Button>
          </div>

          {updateListing.isError && (
            <p className="text-sm text-red-500 text-center">
              Не удалось сохранить. Попробуйте ещё раз.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
