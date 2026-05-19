import Link from 'next/link'

const POSTS = [
  {
    slug: '#',
    category: 'Снаряжение',
    categoryColor: 'bg-blue-100 text-blue-700',
    title: 'Как правильно выбрать сплавное снаряжение',
    excerpt:
      'Байдарка, каяк или SUP-борд? Разбираемся, какое снаряжение подойдёт для первого сплава, и на что обратить внимание при аренде.',
    date: '15 марта 2024',
    readTime: '5 мин',
    gradient: 'from-blue-400 to-cyan-500',
  },
  {
    slug: '#',
    category: 'Маршруты',
    categoryColor: 'bg-green-100 text-green-700',
    title: '5 маршрутов для горного туризма в Карелии',
    excerpt:
      'Карелия — рай для любителей пеших походов. Мы собрали пять маршрутов разной сложности — от прогулочных до серьёзных трекингов.',
    date: '8 марта 2024',
    readTime: '8 мин',
    gradient: 'from-green-400 to-emerald-500',
  },
  {
    slug: '#',
    category: 'Советы хостам',
    categoryColor: 'bg-amber-100 text-amber-700',
    title: 'Как стать успешным хостом на Rigs',
    excerpt:
      'Качественные фото, честное описание и быстрые ответы — три кита успешного хоста. Делимся советами от топ-арендодателей платформы.',
    date: '1 марта 2024',
    readTime: '6 мин',
    gradient: 'from-amber-400 to-orange-500',
  },
]

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-neutral-100 bg-neutral-50">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-sm font-medium text-brand-600 mb-3">Блог Rigs</p>
          <h1 className="text-4xl font-bold text-neutral-900 mb-4">
            Советы, маршруты и истории
          </h1>
          <p className="text-lg text-neutral-500 max-w-xl mx-auto">
            Всё о снаряжении, активном отдыхе и жизни сообщества Rigs
          </p>
        </div>
      </div>

      {/* Posts */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {POSTS.map((post) => (
            <Link
              key={post.title}
              href={post.slug}
              className="group rounded-2xl border border-neutral-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Cover gradient */}
              <div className={`h-44 bg-gradient-to-br ${post.gradient}`} />

              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${post.categoryColor}`}>
                    {post.category}
                  </span>
                  <span className="text-xs text-neutral-400">{post.readTime}</span>
                </div>

                <h2 className="text-base font-semibold text-neutral-900 mb-2 group-hover:text-brand-600 transition-colors leading-snug">
                  {post.title}
                </h2>
                <p className="text-sm text-neutral-500 leading-relaxed line-clamp-3 mb-4">
                  {post.excerpt}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">{post.date}</span>
                  <span className="text-sm font-medium text-brand-600 group-hover:underline">
                    Читать →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <p className="text-center text-neutral-400 mt-12 text-sm">
          Скоро больше статей — следите за обновлениями
        </p>
      </div>
    </div>
  )
}
