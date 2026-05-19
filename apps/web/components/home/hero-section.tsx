'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

const POPULAR_TAGS = [
  { label: '🚤 Катер',      q: 'катер' },
  { label: '🏄 SUP-доска',  q: 'sup доска' },
  { label: '🏍 Квадроцикл', q: 'квадроцикл' },
  { label: '🏔 Сноуборд',   q: 'сноуборд' },
  { label: '⛺ Кемпинг',    q: 'палатка' },
  { label: '🎣 Рыбалка',    q: 'лодка рыбалка' },
]

const STATS = [
  { value: '2 400+', label: 'объявлений' },
  { value: '48',     label: 'городов' },
  { value: '4.9',    label: 'рейтинг' },
]

export function HeroSection() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [focused, setFocused] = useState(false)

  function handleSearch(e?: React.FormEvent) {
    e?.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (city.trim()) params.set('city', city.trim())
    router.push(`/search?${params.toString()}`)
  }

  function handleTag(q: string) {
    router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <section className="relative overflow-hidden bg-[#0d2e14] text-white">
      {/* Background texture overlay */}
      <div className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(ellipse at 20% 50%, #15803d 0%, transparent 60%),
                            radial-gradient(ellipse at 80% 20%, #166534 0%, transparent 50%)`,
        }}
      />
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      <div className="container relative py-20 md:py-28 lg:py-36">
        <div className="mx-auto max-w-3xl text-center">

          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-green-300 backdrop-blur-sm mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            Маркетплейс снаряжения для активного отдыха
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-black tracking-tight leading-[1.08] md:text-5xl lg:text-6xl">
            Бери в аренду.
            <br />
            <span className="text-gradient-brand">Не покупай.</span>
          </h1>

          <p className="mt-5 text-base md:text-lg text-neutral-300 max-w-xl mx-auto leading-relaxed">
            Катера, квадроциклы, сноуборды, SUP-доски — любое снаряжение для активного отдыха рядом с тобой
          </p>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className={cn(
              'mt-8 flex overflow-hidden rounded-2xl bg-white transition-all duration-300',
              focused ? 'shadow-[0_0_0_3px_rgb(34_197_94_/_0.3),0_16px_40px_-4px_rgb(0_0_0_/_0.25)]' : 'shadow-[0_8px_32px_-4px_rgb(0_0_0_/_0.30)]',
            )}
          >
            {/* Main query input */}
            <div className="flex flex-1 items-center gap-2.5 px-4 py-1">
              <Search className="w-4 h-4 text-neutral-400 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Что хочешь арендовать?"
                className="flex-1 py-3 text-sm text-neutral-900 placeholder-neutral-400 outline-none bg-transparent"
                aria-label="Что ищете"
              />
            </div>

            {/* City divider + input (desktop) */}
            <div className="hidden sm:flex items-center">
              <div className="w-px h-7 bg-neutral-200" />
              <div className="flex items-center gap-2 px-4">
                <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="Город"
                  className="w-32 py-3 text-sm text-neutral-900 placeholder-neutral-400 outline-none bg-transparent"
                  aria-label="Город"
                />
              </div>
            </div>

            <div className="p-2">
              <button
                type="submit"
                className="h-full rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 active:scale-[0.98] transition-all duration-200 shadow-[0_4px_12px_rgb(22_163_74_/_0.35)]"
              >
                Найти
              </button>
            </div>
          </form>

          {/* Popular tags */}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {POPULAR_TAGS.map(({ label, q }) => (
              <button
                key={q}
                onClick={() => handleTag(q)}
                className="rounded-full border border-white/15 bg-white/8 px-4 py-1.5 text-sm font-medium text-neutral-200 hover:bg-white/15 hover:border-white/30 hover:text-white transition-all duration-150 backdrop-blur-sm"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-16 flex justify-center gap-12 md:gap-20">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-black text-white md:text-3xl">{value}</div>
              <div className="mt-0.5 text-xs text-neutral-400 uppercase tracking-wide">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
