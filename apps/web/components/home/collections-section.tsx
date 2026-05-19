import Link from 'next/link'

const COLLECTIONS = [
  {
    slug: 'water-adventure',
    title: 'Водные приключения',
    subtitle: 'Байдарки, SUP, каяки',
    emoji: '🚣',
    gradient: 'from-sky-400 to-blue-600',
    searchUrl: '/search?category=water',
  },
  {
    slug: 'winter-sport',
    title: 'Зимний спорт',
    subtitle: 'Лыжи, сноуборды, коньки',
    emoji: '🏂',
    gradient: 'from-indigo-400 to-violet-600',
    searchUrl: '/search?category=winter',
  },
  {
    slug: 'camping',
    title: 'Поход в горы',
    subtitle: 'Палатки, рюкзаки, снаряжение',
    emoji: '⛺',
    gradient: 'from-green-400 to-emerald-600',
    searchUrl: '/search?category=camping',
  },
  {
    slug: 'cycling',
    title: 'Велопрогулки',
    subtitle: 'Горные и городские велосипеды',
    emoji: '🚵',
    gradient: 'from-orange-400 to-amber-600',
    searchUrl: '/search?category=cycling',
  },
]

export function CollectionsSection() {
  return (
    <section className="section">
      <div className="container">
        <div className="mb-8">
          <p className="text-sm font-medium text-brand-600 mb-1">Подборки</p>
          <h2 className="text-2xl font-bold text-neutral-900 md:text-3xl">
            Выбери своё приключение
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {COLLECTIONS.map((col) => (
            <Link
              key={col.slug}
              href={col.searchUrl}
              className="group relative overflow-hidden rounded-2xl aspect-[3/4] flex flex-col justify-end p-5 text-white"
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${col.gradient} opacity-90 group-hover:opacity-100 transition-opacity`} />
              {/* Pattern overlay */}
              <div
                className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
                  backgroundSize: '30px 30px',
                }}
              />
              {/* Emoji */}
              <div className="absolute top-5 right-5 text-4xl filter drop-shadow-md group-hover:scale-110 transition-transform duration-300">
                {col.emoji}
              </div>
              {/* Text */}
              <div className="relative z-10">
                <h3 className="font-bold text-lg leading-tight">{col.title}</h3>
                <p className="text-sm text-white/80 mt-1">{col.subtitle}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white/90 group-hover:text-white border border-white/30 rounded-full px-3 py-1 group-hover:bg-white/20 transition-all">
                  Смотреть →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
