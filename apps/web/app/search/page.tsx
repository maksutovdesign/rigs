'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback, useState } from 'react'
import { SlidersHorizontal, MapPin, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import type { SearchListingsQuery } from '@rigs/types'
import { ListingCondition } from '@rigs/types'
import { useSearchListings } from '@/hooks/use-listings'
import { useCategories } from '@/hooks/use-categories'
import { useAuthStore } from '@/store/auth.store'
import { ListingCard } from '@/components/listings/listing-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CityAutocomplete } from '@/components/ui/city-autocomplete'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

// Loaded client-side only — Mapbox GL cannot run in SSR
const ListingsMap = dynamic(
  () => import('@/components/map/listings-map').then((m) => m.ListingsMap),
  { ssr: false, loading: () => <div className="mb-6 h-72 rounded-2xl bg-gray-100 animate-pulse" /> },
)

const SORT_OPTIONS = [
  { value: 'rating', label: 'По рейтингу' },
  { value: 'price_asc', label: 'Цена: по возрастанию' },
  { value: 'price_desc', label: 'Цена: по убыванию' },
  { value: 'newest', label: 'Новые' },
  { value: 'popular', label: 'Популярные' },
] as const

const CONDITIONS = [
  { value: ListingCondition.NEW, label: 'Новое' },
  { value: ListingCondition.EXCELLENT, label: 'Отличное' },
  { value: ListingCondition.GOOD, label: 'Хорошее' },
  { value: ListingCondition.FAIR, label: 'Удовлетворительное' },
]

const QUICK_TAGS = [
  { label: '🚣 Байдарки', params: { category: 'water', q: 'байдарка' } },
  { label: '🏄 SUP-доски', params: { category: 'water', q: 'sup' } },
  { label: '⛺ Палатки', params: { category: 'camping', q: 'палатка' } },
  { label: '🚵 Велосипеды', params: { category: 'cycling' } },
  { label: '🎿 Лыжи', params: { category: 'winter', q: 'лыжи' } },
  { label: '🏂 Сноуборд', params: { category: 'winter', q: 'сноуборд' } },
  { label: '🎣 Рыбалка', params: { category: 'fishing' } },
  { label: '⚡ Мгновенная бронь', params: { instantBook: 'true' } },
  { label: '🚚 С доставкой', params: { delivery: 'true' } },
]

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mapVisible, setMapVisible] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  function getParam(key: string) {
    return searchParams.get(key) ?? undefined
  }

  const q = getParam('q')
  const city = getParam('city')
  const categoryParam = getParam('category')
  const priceMinParam = getParam('priceMin')
  const priceMaxParam = getParam('priceMax')
  const pageParam = parseInt(getParam('page') ?? '1')
  const sortParam = (getParam('sort') ?? 'rating') as SearchListingsQuery['sort']
  const instantBookParam = searchParams.get('instantBook') === 'true'
  const deliveryParam = searchParams.get('delivery') === 'true'
  const conditionsParam = searchParams.getAll('condition') as ListingCondition[]

  const query: SearchListingsQuery = {
    q,
    city,
    category: categoryParam,
    priceMin: priceMinParam ? Number(priceMinParam) : undefined,
    priceMax: priceMaxParam ? Number(priceMaxParam) : undefined,
    page: pageParam,
    limit: 18,
    sort: sortParam,
    instantBook: instantBookParam || undefined,
    delivery: deliveryParam || undefined,
    condition: conditionsParam.length > 0 ? conditionsParam : undefined,
  }

  const { data, isLoading } = useSearchListings(query)
  const { data: categories } = useCategories()
  const accessToken = useAuthStore((s) => s.accessToken)
  const isAuthenticated = !!accessToken

  const updateParam = useCallback(
    (updates: Record<string, string | string[] | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        params.delete(key)
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach((v) => params.append(key, v))
          } else {
            params.set(key, value)
          }
        }
      })
      params.set('page', '1')
      router.push(`${pathname}?${params.toString()}`)
    },
    [searchParams, router, pathname],
  )

  function toggleCondition(cond: ListingCondition) {
    const current = conditionsParam.includes(cond)
      ? conditionsParam.filter((c) => c !== cond)
      : [...conditionsParam, cond]
    updateParam({ condition: current.length > 0 ? current : undefined })
  }

  const totalPages = data ? Math.ceil(data.total / (data.limit || 18)) : 1

  const skeletons = Array.from({ length: 9 })

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div className="sticky top-16 z-30 bg-white/90 backdrop-blur-md border-b border-neutral-100">
        <div className="container py-3 flex items-center gap-3">
          {/* Mobile filter toggle */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors lg:hidden',
              sidebarOpen
                ? 'border-brand-300 bg-brand-50 text-brand-700'
                : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50',
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Фильтры
          </button>

          {/* Query / count */}
          <div className="flex items-center gap-2 min-w-0">
            {q && (
              <span className="text-sm text-neutral-600 truncate">
                <span className="text-neutral-400">Запрос:</span>{' '}
                <strong className="text-neutral-900">{q}</strong>
              </span>
            )}
            {!isLoading && data && (
              <span className="text-sm text-neutral-400">
                {data.total.toLocaleString('ru-RU')} объявлений
              </span>
            )}
          </div>

          {/* Right controls */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <select
              value={sortParam ?? 'rating'}
              onChange={(e) => updateParam({ sort: e.target.value })}
              className="input py-2 pr-3 text-sm w-auto cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              onClick={() => setMapVisible((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                mapVisible
                  ? 'border-brand-300 bg-brand-50 text-brand-700'
                  : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50',
              )}
            >
              <MapPin className="w-4 h-4" />
              <span className="sm:hidden">{mapVisible ? 'Список' : 'Карта'}</span>
              <span className="hidden sm:block">{mapVisible ? 'Скрыть карту' : 'Показать карту'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick filter tags */}
      <div className="border-b border-neutral-100 bg-white">
        <div className="container py-2 overflow-x-auto scrollbar-none">
          <div className="flex gap-2 w-max">
            {QUICK_TAGS.map((tag) => {
              const isActive = Object.entries(tag.params).every(([k, v]) => searchParams.get(k) === v)
              return (
                <button
                  key={tag.label}
                  onClick={() => {
                    if (isActive) {
                      updateParam(Object.fromEntries(Object.keys(tag.params).map((k) => [k, undefined])))
                    } else {
                      updateParam(tag.params as unknown as Record<string, string>)
                    }
                  }}
                  className={cn(
                    'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
                    isActive
                      ? 'border-brand-400 bg-brand-50 text-brand-700'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50',
                  )}
                >
                  {tag.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}

      {/* Desktop split-view (lg+, mapVisible=true) */}
      {mapVisible && (
        <div className="hidden lg:flex h-[calc(100vh-64px)] overflow-hidden">
          {/* Left: scrollable listings */}
          <div className="w-[55%] overflow-y-auto px-4 py-6">
            <div className="grid grid-cols-2 gap-4">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => <ListingCard key={i} isLoading />)
                : data?.items.map((listing) => (
                    <div
                      key={listing.id}
                      onMouseEnter={() => setHoveredId(listing.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <ListingCard listing={listing} showMessageBtn={isAuthenticated} />
                    </div>
                  ))}
            </div>

            {/* Empty state */}
            {!isLoading && data?.items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100">
                  <Search className="w-7 h-7 text-neutral-400" />
                </div>
                <p className="text-lg font-semibold text-neutral-900">Ничего не найдено</p>
                <p className="mt-1 text-sm text-neutral-500">Попробуйте изменить фильтры или поисковый запрос</p>
                <button onClick={() => router.push('/search')} className="btn-outline btn mt-6">
                  Сбросить всё
                </button>
              </div>
            )}

            {/* Pagination */}
            {!isLoading && data && totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  className="btn-outline btn btn-sm"
                  disabled={pageParam <= 1}
                  onClick={() => updateParam({ page: String(pageParam - 1) })}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Назад
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const p = pageParam <= 3 ? i + 1
                      : pageParam >= totalPages - 2 ? totalPages - 4 + i
                      : pageParam - 2 + i
                    return (
                      <button
                        key={p}
                        onClick={() => updateParam({ page: String(p) })}
                        className={cn(
                          'h-8 w-8 rounded-lg text-sm font-medium transition-colors',
                          p === pageParam
                            ? 'bg-brand-600 text-white'
                            : 'text-neutral-600 hover:bg-neutral-100',
                        )}
                      >
                        {p}
                      </button>
                    )
                  })}
                </div>
                <button
                  className="btn-outline btn btn-sm"
                  disabled={pageParam >= totalPages}
                  onClick={() => updateParam({ page: String(pageParam + 1) })}
                >
                  Вперёд
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Right: sticky map */}
          <div className="relative w-[45%] sticky top-0 h-[calc(100vh-64px)]">
            {/* Floating back button */}
            <button
              onClick={() => setMapVisible(false)}
              className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-xl bg-white/90 backdrop-blur-sm border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 shadow hover:bg-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Вернуться к списку
            </button>
            <ListingsMap
              listings={data?.items ?? []}
              city={city}
              className="h-full"
              onListingClick={(id) => router.push(`/listing/${id}`)}
              selectedListingId={hoveredId}
            />
          </div>
        </div>
      )}

      {/* Mobile map fullscreen (mapVisible=true) */}
      {mapVisible && (
        <div className="lg:hidden h-[calc(100vh-120px)]">
          <ListingsMap
            listings={data?.items ?? []}
            city={city}
            className="h-full"
            onListingClick={(id) => router.push(`/listing/${id}`)}
          />
        </div>
      )}

      {/* Normal layout: sidebar + grid (desktop always; mobile when map is hidden) */}
      <div className={cn(
        'container py-6 flex gap-6',
        // On desktop with map visible, hide this layout
        mapVisible ? 'lg:hidden' : '',
        // On mobile with map visible, hide this layout
        mapVisible ? 'hidden lg:flex' : '',
      )}>

        {/* Mobile sidebar overlay backdrop */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'shrink-0 space-y-5',
            // Desktop: always visible, static
            'hidden lg:block w-64',
            // Mobile: slide-in panel
            sidebarOpen && '!flex flex-col fixed inset-y-0 left-0 z-50 bg-white w-72 overflow-y-auto p-5 shadow-xl animate-slide-down lg:!static lg:shadow-none lg:p-0 lg:animate-none',
          )}
        >
          {/* Mobile close */}
          <div className="lg:hidden flex items-center justify-between mb-2">
            <span className="text-base font-semibold text-neutral-900">Фильтры</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-500"
            >
              ✕
            </button>
          </div>

          {/* City */}
          <FilterSection title="Город">
            <CityAutocomplete
              value={city ?? ''}
              onChange={(value) => updateParam({ city: value || undefined })}
              placeholder="Любой город"
              fullWidth
            />
          </FilterSection>

          {/* Category */}
          <FilterSection title="Категория">
            <div className="space-y-2">
              {categories?.map((cat) => (
                <label key={cat.id} className="flex items-center gap-2.5 cursor-pointer group">
                  <div className={cn(
                    'h-4 w-4 rounded border-2 flex items-center justify-center transition-colors',
                    categoryParam === cat.slug
                      ? 'border-brand-600 bg-brand-600'
                      : 'border-neutral-300 group-hover:border-brand-400',
                  )}>
                    {categoryParam === cat.slug && (
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                      </svg>
                    )}
                  </div>
                  <input
                    type="radio" name="category" value={cat.slug}
                    checked={categoryParam === cat.slug}
                    onChange={() => updateParam({ category: cat.slug })}
                    className="sr-only"
                  />
                  <span className="text-sm text-neutral-700 group-hover:text-neutral-900">{cat.nameRu}</span>
                </label>
              ))}
              {categoryParam && (
                <button onClick={() => updateParam({ category: undefined })} className="text-xs text-brand-600 hover:underline mt-1">
                  Сбросить
                </button>
              )}
            </div>
          </FilterSection>

          {/* Price */}
          <FilterSection title="Цена за день, ₽">
            <div className="flex gap-2">
              <Input placeholder="от" type="number" min={0} defaultValue={priceMinParam}
                onBlur={(e) => updateParam({ priceMin: e.target.value || undefined })} className="input text-sm" />
              <Input placeholder="до" type="number" min={0} defaultValue={priceMaxParam}
                onBlur={(e) => updateParam({ priceMax: e.target.value || undefined })} className="input text-sm" />
            </div>
          </FilterSection>

          {/* Toggles */}
          <FilterSection title="Опции">
            <div className="space-y-3">
              <FilterToggle
                label="Мгновенное бронирование"
                checked={instantBookParam}
                onChange={(v) => updateParam({ instantBook: v ? 'true' : undefined })}
              />
              <FilterToggle
                label="С доставкой"
                checked={deliveryParam}
                onChange={(v) => updateParam({ delivery: v ? 'true' : undefined })}
              />
            </div>
          </FilterSection>

          {/* Condition */}
          <FilterSection title="Состояние">
            <div className="space-y-2">
              {CONDITIONS.map((c) => (
                <label key={c.value} className="flex items-center gap-2.5 cursor-pointer group">
                  <div className={cn(
                    'h-4 w-4 rounded border-2 flex items-center justify-center transition-colors',
                    conditionsParam.includes(c.value)
                      ? 'border-brand-600 bg-brand-600'
                      : 'border-neutral-300 group-hover:border-brand-400',
                  )}>
                    {conditionsParam.includes(c.value) && (
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                      </svg>
                    )}
                  </div>
                  <input type="checkbox" checked={conditionsParam.includes(c.value)}
                    onChange={() => toggleCondition(c.value)} className="sr-only" />
                  <span className="text-sm text-neutral-700 group-hover:text-neutral-900">{c.label}</span>
                </label>
              ))}
            </div>
          </FilterSection>
        </aside>

        {/* ── Main content ────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">
          {/* Listings grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {isLoading
              ? Array.from({ length: 9 }).map((_, i) => <ListingCard key={i} isLoading />)
              : data?.items.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} showMessageBtn={isAuthenticated} />
                ))}
          </div>

          {/* Empty state */}
          {!isLoading && data?.items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100">
                <Search className="w-7 h-7 text-neutral-400" />
              </div>
              <p className="text-lg font-semibold text-neutral-900">Ничего не найдено</p>
              <p className="mt-1 text-sm text-neutral-500">Попробуйте изменить фильтры или поисковый запрос</p>
              <button onClick={() => router.push('/search')} className="btn-outline btn mt-6">
                Сбросить всё
              </button>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && data && totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                className="btn-outline btn btn-sm"
                disabled={pageParam <= 1}
                onClick={() => updateParam({ page: String(pageParam - 1) })}
              >
                <ChevronLeft className="w-4 h-4" />
                Назад
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = pageParam <= 3 ? i + 1
                    : pageParam >= totalPages - 2 ? totalPages - 4 + i
                    : pageParam - 2 + i
                  return (
                    <button
                      key={p}
                      onClick={() => updateParam({ page: String(p) })}
                      className={cn(
                        'h-8 w-8 rounded-lg text-sm font-medium transition-colors',
                        p === pageParam
                          ? 'bg-brand-600 text-white'
                          : 'text-neutral-600 hover:bg-neutral-100',
                      )}
                    >
                      {p}
                    </button>
                  )
                })}
              </div>
              <button
                className="btn-outline btn btn-sm"
                disabled={pageParam >= totalPages}
                onClick={() => updateParam({ page: String(pageParam + 1) })}
              >
                Вперёд
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">{title}</h3>
      {children}
    </div>
  )
}

function FilterToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-sm text-neutral-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 rounded-full transition-colors duration-200',
          checked ? 'bg-brand-600' : 'bg-neutral-200',
        )}
      >
        <span className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0.5',
        )} />
      </button>
    </label>
  )
}
