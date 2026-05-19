import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-50 to-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl font-bold text-neutral-900 mb-4">О Rigs</h1>
          <p className="text-xl text-neutral-500 leading-relaxed">
            Мы создаём инфраструктуру для активного отдыха
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-16 space-y-16">
        {/* Mission */}
        <section>
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">Наша миссия</h2>
          <p className="text-lg text-neutral-600 leading-relaxed">
            Rigs — маркетплейс аренды снаряжения для активного отдыха. Мы соединяем тех, у кого
            есть снаряжение, с теми, кто хочет им воспользоваться. Наша цель — сделать активный
            отдых доступным для каждого, а владение снаряжением — выгодным.
          </p>
        </section>

        {/* Values */}
        <section>
          <h2 className="text-2xl font-bold text-neutral-900 mb-6">Наши ценности</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
              <div className="text-3xl mb-3">🤝</div>
              <h3 className="font-semibold text-neutral-900 mb-2">Доверие</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Верификация личности KYC гарантирует, что все участники — реальные люди.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
              <div className="text-3xl mb-3">🛡️</div>
              <h3 className="font-semibold text-neutral-900 mb-2">Безопасность</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Залог и страховка защищают хоста и арендатора при каждой сделке.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
              <div className="text-3xl mb-3">⭐</div>
              <h3 className="font-semibold text-neutral-900 mb-2">Сообщество</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Рейтинги и отзывы формируют репутацию и поддерживают высокий стандарт сервиса.
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="rounded-2xl bg-neutral-900 text-white p-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Rigs в цифрах</h2>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-4xl font-bold text-brand-400">2 400+</p>
              <p className="text-sm text-neutral-400 mt-1">объявлений</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-brand-400">48</p>
              <p className="text-sm text-neutral-400 mt-1">городов</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-brand-400">15 000+</p>
              <p className="text-sm text-neutral-400 mt-1">аренд</p>
            </div>
          </div>
        </section>

        {/* Team */}
        <section>
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">Команда</h2>
          <p className="text-neutral-600 leading-relaxed">
            Мы — небольшая команда людей, увлечённых активным отдыхом и технологиями.
            Каждый из нас сам пользуется Rigs, поэтому знает, что важно арендаторам
            и хостам. Мы постоянно развиваем платформу, чтобы сделать каждую аренду
            максимально простой и приятной.
          </p>
        </section>

        {/* CTA */}
        <section className="text-center rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 p-10">
          <h2 className="text-2xl font-bold text-neutral-900 mb-3">Готовы зарабатывать?</h2>
          <p className="text-neutral-500 mb-6">
            Разместите своё снаряжение и начните получать доход уже сегодня.
          </p>
          <Link
            href="/host/listings/new"
            className="inline-block bg-brand-600 hover:bg-brand-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            Стать хостом
          </Link>
        </section>
      </div>
    </div>
  )
}
