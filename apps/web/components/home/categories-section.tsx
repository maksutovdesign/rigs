import Link from 'next/link'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  { slug: 'water',    icon: '🚤', name: 'Водный\nотдых',    color: 'from-blue-50 to-sky-100',    border: 'hover:border-sky-300' },
  { slug: 'winter',   icon: '🏂', name: 'Зимний\nотдых',   color: 'from-indigo-50 to-blue-100', border: 'hover:border-indigo-300' },
  { slug: 'mountain', icon: '🧗', name: 'Горный\nтуризм',  color: 'from-stone-50 to-neutral-100',border: 'hover:border-stone-300' },
  { slug: 'cycling',  icon: '🚵', name: 'Велоспорт',       color: 'from-orange-50 to-amber-100', border: 'hover:border-orange-300' },
  { slug: 'camping',  icon: '⛺', name: 'Кемпинг',         color: 'from-green-50 to-emerald-100',border: 'hover:border-green-300' },
  { slug: 'fishing',  icon: '🎣', name: 'Рыбалка',         color: 'from-teal-50 to-cyan-100',   border: 'hover:border-teal-300' },
  { slug: 'atv',      icon: '🏍', name: 'Квадроциклы',     color: 'from-red-50 to-rose-100',    border: 'hover:border-red-300' },
  { slug: 'air',      icon: '🪂', name: 'Воздушный\nотдых',color: 'from-violet-50 to-purple-100',border: 'hover:border-violet-300' },
]

export function CategoriesSection() {
  return (
    <section className="section bg-neutral-50">
      <div className="container">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm font-medium text-brand-600 mb-1">Чем займёшься?</p>
            <h2 className="text-2xl font-bold text-neutral-900 md:text-3xl">
              Категории снаряжения
            </h2>
          </div>
          <Link
            href="/search"
            className="hidden sm:block text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            Все категории →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 xs:grid-cols-4 md:grid-cols-4 lg:grid-cols-8">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/search?category=${cat.slug}`}
              className={cn(
                'group flex flex-col items-center gap-3 rounded-xl border border-neutral-200 bg-white',
                'p-4 text-center transition-all duration-200',
                'hover:shadow-md hover:-translate-y-0.5',
                cat.border,
              )}
            >
              {/* Icon in gradient circle */}
              <div className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-2xl',
                'transition-transform duration-200 group-hover:scale-110',
                cat.color,
              )}>
                {cat.icon}
              </div>
              <span className="text-xs font-medium text-neutral-700 leading-tight whitespace-pre-line group-hover:text-neutral-900">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
