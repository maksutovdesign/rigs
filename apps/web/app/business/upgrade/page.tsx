'use client'

import { useRouter } from 'next/navigation'
import { formatPrice } from '@rigs/utils'
import { useAuthStore } from '@/store/auth.store'
import { useCurrentUser } from '@/hooks/use-auth'
import { useUpdateSubscription } from '@/hooks/use-business'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const PLANS = [
  {
    id: 'free',
    name: 'Базовый',
    price: 0,
    maxListings: 3,
    maxTeam: 0,
    features: ['До 3 объявлений', 'Базовая аналитика', 'Чат с арендаторами'],
    highlight: false,
  },
  {
    id: 'basic',
    name: 'Старт',
    price: 990,
    maxListings: 15,
    maxTeam: 0,
    features: [
      'До 15 объявлений',
      'Расширенная аналитика',
      'Приоритет в поиске',
      'Бейдж «Проверен»',
    ],
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Про',
    price: 2490,
    maxListings: 50,
    maxTeam: 0,
    features: [
      'До 50 объявлений',
      'Полная аналитика',
      'Приоритет в поиске',
      'Бейдж «Про»',
      'Мгновенные выплаты',
    ],
    highlight: false,
  },
  {
    id: 'business',
    name: 'Бизнес',
    price: 4990,
    maxListings: -1,
    maxTeam: -1,
    features: [
      'Безлимит объявлений',
      'Командный доступ',
      'Счета-фактуры',
      'Персональный менеджер',
      'API доступ',
      'Белый лейбл',
    ],
    highlight: true,
  },
]

const ALL_FEATURES = [
  'Объявления',
  'Базовая аналитика',
  'Чат с арендаторами',
  'Расширенная аналитика',
  'Приоритет в поиске',
  'Бейдж «Проверен»',
  'Полная аналитика',
  'Бейдж «Про»',
  'Мгновенные выплаты',
  'Командный доступ',
  'Счета-фактуры',
  'Персональный менеджер',
  'API доступ',
  'Белый лейбл',
]

const PLAN_FEATURE_MAP: Record<string, Set<string>> = {
  free: new Set(['Базовая аналитика', 'Чат с арендаторами']),
  basic: new Set(['Базовая аналитика', 'Чат с арендаторами', 'Расширенная аналитика', 'Приоритет в поиске', 'Бейдж «Проверен»']),
  pro: new Set(['Базовая аналитика', 'Чат с арендаторами', 'Расширенная аналитика', 'Приоритет в поиске', 'Бейдж «Проверен»', 'Полная аналитика', 'Бейдж «Про»', 'Мгновенные выплаты']),
  business: new Set(['Базовая аналитика', 'Чат с арендаторами', 'Расширенная аналитика', 'Приоритет в поиске', 'Бейдж «Проверен»', 'Полная аналитика', 'Бейдж «Про»', 'Мгновенные выплаты', 'Командный доступ', 'Счета-фактуры', 'Персональный менеджер', 'API доступ', 'Белый лейбл']),
}

function listingsLabel(max: number) {
  if (max === -1) return 'Безлимит'
  return `До ${max}`
}

export default function UpgradePage() {
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const { data: currentUser } = useCurrentUser()
  const updateSubscription = useUpdateSubscription()

  const activePlan = (currentUser as unknown as { subscriptionPlan?: string })?.subscriptionPlan ?? (user as unknown as { subscriptionPlan?: string })?.subscriptionPlan ?? 'free'

  async function handleSelectPlan(planId: string) {
    if (!accessToken) {
      router.push('/auth')
      return
    }
    if (planId === activePlan) return
    await updateSubscription.mutateAsync({ plan: planId })
    if (planId === 'business') {
      router.push('/business')
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Выберите тариф</h1>
          <p className="text-gray-500 text-base max-w-xl mx-auto">
            Начните бесплатно и масштабируйте по мере роста бизнеса
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === activePlan
            const isPending = updateSubscription.isPending && !isCurrent
            return (
              <div
                key={plan.id}
                className={cn(
                  'bg-white rounded-2xl border p-5 flex flex-col gap-4 relative',
                  plan.highlight
                    ? 'border-brand-500 shadow-lg shadow-brand-100'
                    : 'border-neutral-100',
                )}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="info" className="bg-brand-600 text-white border-0 shadow">
                      Популярный выбор
                    </Badge>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    {plan.name}
                  </p>
                  <div className="flex items-baseline gap-1">
                    {plan.price === 0 ? (
                      <span className="text-2xl font-bold text-gray-900">Бесплатно</span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-gray-900">
                          {formatPrice(plan.price)}
                        </span>
                        <span className="text-sm text-gray-400">/ мес</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Объявлений: {listingsLabel(plan.maxListings)}
                    {plan.maxTeam !== 0 && (
                      <>{plan.maxTeam === -1 ? ' · Команда: безлимит' : ` · Команда: до ${plan.maxTeam}`}</>
                    )}
                  </p>
                </div>

                <ul className="flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-green-500 shrink-0 mt-0.5">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.highlight ? 'primary' : 'secondary'}
                  fullWidth
                  disabled={isCurrent}
                  loading={updateSubscription.isPending && !isCurrent && isPending}
                  onClick={() => handleSelectPlan(plan.id)}
                  className={cn(isCurrent && 'cursor-default')}
                >
                  {isCurrent ? 'Текущий план' : 'Выбрать'}
                </Button>
              </div>
            )
          })}
        </div>

        {/* Comparison table */}
        <section className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="p-5 border-b border-neutral-100">
            <h2 className="text-lg font-semibold text-gray-900">Сравнение тарифов</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="text-left p-4 font-medium text-gray-500 w-1/3">Возможность</th>
                  {PLANS.map((plan) => (
                    <th
                      key={plan.id}
                      className={cn(
                        'p-4 font-semibold text-center',
                        plan.highlight ? 'text-brand-600' : 'text-gray-700',
                      )}
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-neutral-50">
                  <td className="p-4 text-gray-700">Объявлений</td>
                  {PLANS.map((plan) => (
                    <td key={plan.id} className="p-4 text-center text-gray-900 font-medium">
                      {listingsLabel(plan.maxListings)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-neutral-50">
                  <td className="p-4 text-gray-700">Команда</td>
                  {PLANS.map((plan) => (
                    <td key={plan.id} className="p-4 text-center text-gray-900 font-medium">
                      {plan.maxTeam === 0
                        ? <span className="text-gray-300">—</span>
                        : plan.maxTeam === -1
                        ? 'Безлимит'
                        : `До ${plan.maxTeam}`}
                    </td>
                  ))}
                </tr>
                {ALL_FEATURES.map((feature) => (
                  <tr key={feature} className="border-b border-neutral-50 last:border-0">
                    <td className="p-4 text-gray-700">{feature}</td>
                    {PLANS.map((plan) => {
                      const has = PLAN_FEATURE_MAP[plan.id]?.has(feature)
                      return (
                        <td key={plan.id} className="p-4 text-center">
                          {has ? (
                            <span className="text-green-500 font-bold">✓</span>
                          ) : (
                            <span className="text-gray-200 font-bold">✕</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
