import { Search, CreditCard, Package, Star } from 'lucide-react'

const STEPS = [
  {
    icon: Search,
    color: 'bg-blue-100 text-blue-600',
    step: '01',
    title: 'Найди снаряжение',
    description: 'Ищи по категории, городу или карте. Фильтруй по дате, цене, состоянию.',
  },
  {
    icon: CreditCard,
    color: 'bg-brand-100 text-brand-700',
    step: '02',
    title: 'Бронируй онлайн',
    description: 'Выбери даты, оплати картой или СБП. Залог замораживается автоматически.',
  },
  {
    icon: Package,
    color: 'bg-amber-100 text-amber-700',
    step: '03',
    title: 'Забирай и отдыхай',
    description: 'Встреться с хостом или получи доставку. Подтвердите выдачу кодом.',
  },
  {
    icon: Star,
    color: 'bg-rose-100 text-rose-600',
    step: '04',
    title: 'Возвращай и отзыв',
    description: 'Верни снаряжение, подтверди возврат. Залог разморозится за 48 часов.',
  },
]

export function HowItWorks() {
  return (
    <section className="section bg-neutral-50">
      <div className="container">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-brand-600 mb-2">Просто и прозрачно</p>
          <h2 className="text-2xl font-bold text-neutral-900 md:text-3xl">
            Как это работает
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.step} className="relative">
              {/* Connector line (desktop) */}
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-7 left-[calc(50%+2.5rem)] right-0 h-px bg-neutral-200 z-0" />
              )}

              <div className="relative z-10 flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-neutral-100 shadow-xs hover:shadow-sm transition-shadow">
                {/* Icon */}
                <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${s.color} mb-4`}>
                  <s.icon className="w-6 h-6" />
                </div>

                {/* Step number */}
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-widest mb-2">
                  Шаг {s.step}
                </span>

                <h3 className="text-sm font-semibold text-neutral-900 mb-2">{s.title}</h3>
                <p className="text-xs text-neutral-500 leading-relaxed">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
