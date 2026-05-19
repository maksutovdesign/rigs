'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/store/auth.store'
import {
  useBusinessProfile,
  useCreateBusinessProfile,
  useUpdateBusinessProfile,
} from '@/hooks/use-business'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ProfileForm {
  companyName: string
  inn: string
  legalAddress: string
  contactEmail: string
  website: string
  description: string
  logoUrl: string
}

const BUSINESS_ADVANTAGES = [
  'Безлимитное количество объявлений',
  'Командный доступ для сотрудников',
  'Счета-фактуры для бухгалтерии',
  'Персональный менеджер поддержки',
  'API доступ для интеграций',
  'Белый лейбл для вашего бренда',
  'Приоритет в результатах поиска',
]

export default function BusinessProfilePage() {
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { data: profile, isLoading, error } = useBusinessProfile()
  const createProfile = useCreateBusinessProfile()
  const updateProfile = useUpdateBusinessProfile()
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProfileForm>({
    defaultValues: {
      companyName: '',
      inn: '',
      legalAddress: '',
      contactEmail: '',
      website: '',
      description: '',
      logoUrl: '',
    },
  })

  const logoUrlValue = watch('logoUrl')

  useEffect(() => {
    if (!accessToken) router.replace('/auth')
  }, [accessToken, router])

  useEffect(() => {
    if (profile) {
      const p = profile as unknown as {
        companyName?: string
        inn?: string
        legalAddress?: string
        contactEmail?: string
        website?: string
        description?: string
        logoUrl?: string
      }
      reset({
        companyName: p.companyName ?? '',
        inn: p.inn ?? '',
        legalAddress: p.legalAddress ?? '',
        contactEmail: p.contactEmail ?? '',
        website: p.website ?? '',
        description: p.description ?? '',
        logoUrl: p.logoUrl ?? '',
      })
      setLogoPreview(p.logoUrl ?? null)
    }
  }, [profile, reset])

  useEffect(() => {
    if (logoUrlValue && logoUrlValue.startsWith('http')) {
      setLogoPreview(logoUrlValue)
    }
  }, [logoUrlValue])

  if (!accessToken) return null

  const isEdit = !!profile
  const axiosError = error as { response?: { status?: number } } | null
  const isNotFound = axiosError?.response?.status === 404

  const isMutating = createProfile.isPending || updateProfile.isPending

  async function onSubmit(values: ProfileForm) {
    if (isEdit) {
      await updateProfile.mutateAsync(values as unknown as import('@rigs/types').UpdateBusinessProfileDto)
    } else {
      await createProfile.mutateAsync(values as unknown as import('@rigs/types').CreateBusinessProfileDto)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.push('/business')
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Профиль компании' : 'Настройте профиль компании'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEdit
              ? 'Обновите данные вашей компании'
              : 'Заполните информацию для активации бизнес-аккаунта'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2">
            {isLoading && !isNotFound ? (
              <div className="bg-white rounded-2xl border border-neutral-100 p-5 space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-10 bg-neutral-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="bg-white rounded-2xl border border-neutral-100 p-5 space-y-5"
              >
                {/* Logo preview */}
                {logoPreview && (
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-neutral-100 shrink-0">
                      <Image src={logoPreview} alt="Логотип" fill className="object-cover" sizes="64px" />
                    </div>
                    <p className="text-xs text-gray-400">Предварительный просмотр логотипа</p>
                  </div>
                )}

                <Input
                  label="Название компании *"
                  fullWidth
                  placeholder="ООО «Рентал Сервис»"
                  {...register('companyName', { required: 'Укажите название компании' })}
                  error={errors.companyName?.message}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="ИНН"
                    fullWidth
                    placeholder="1234567890"
                    {...register('inn', {
                      pattern: {
                        value: /^\d{10,12}$/,
                        message: 'ИНН должен содержать 10 или 12 цифр',
                      },
                    })}
                    error={errors.inn?.message}
                  />
                  <Input
                    label="Email для контакта"
                    type="email"
                    fullWidth
                    placeholder="info@company.ru"
                    {...register('contactEmail', {
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Некорректный email',
                      },
                    })}
                    error={errors.contactEmail?.message}
                  />
                </div>

                <Input
                  label="Юридический адрес"
                  fullWidth
                  placeholder="г. Москва, ул. Примерная, д. 1"
                  {...register('legalAddress')}
                />

                <Input
                  label="Сайт"
                  fullWidth
                  placeholder="https://company.ru"
                  {...register('website')}
                />

                <Input
                  label="URL логотипа"
                  fullWidth
                  placeholder="https://cdn.example.com/logo.png"
                  {...register('logoUrl')}
                  helperText="Вставьте прямую ссылку на изображение логотипа"
                />

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Описание компании</label>
                  <textarea
                    rows={3}
                    placeholder="Расскажите о вашей компании и услугах..."
                    className={cn(
                      'rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400',
                      'transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
                      'resize-none',
                    )}
                    {...register('description')}
                  />
                </div>

                <Button type="submit" fullWidth loading={isMutating}>
                  {saved ? 'Сохранено ✓' : isEdit ? 'Сохранить изменения' : 'Создать профиль'}
                </Button>
              </form>
            )}
          </div>

          {/* Sidebar advantages */}
          <aside>
            <div className="bg-white rounded-2xl border border-neutral-100 p-5 space-y-4 sticky top-6">
              <h2 className="font-semibold text-gray-900">Преимущества бизнес-аккаунта</h2>
              <ul className="space-y-3">
                {BUSINESS_ADVANTAGES.map((adv) => (
                  <li key={adv} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-brand-500 shrink-0 mt-0.5 font-bold">✓</span>
                    {adv}
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t border-neutral-100">
                <p className="text-xs text-gray-400">
                  Бизнес-аккаунт доступен на тарифе «Бизнес» от{' '}
                  <span className="font-semibold text-gray-700">4 990 ₽/мес</span>
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/business/upgrade')}
                  className="mt-2 text-xs text-brand-600 hover:underline"
                >
                  Сравнить тарифы →
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
