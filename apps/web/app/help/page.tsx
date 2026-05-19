import Link from 'next/link'
import { Mail } from 'lucide-react'

const FAQ = [
  {
    q: 'Как забронировать снаряжение?',
    a: 'Найдите нужное снаряжение в каталоге, выберите удобные даты, укажите количество и нажмите «Забронировать». Оплатите онлайн картой или через СБП. Подтверждение и детали получите на телефон.',
  },
  {
    q: 'Как вернуть снаряжение?',
    a: 'Договоритесь с хостом о месте и времени возврата заранее (в чате). После того как хост примет снаряжение, он подтвердит возврат в приложении. Залог разморозится автоматически в течение 48 часов.',
  },
  {
    q: 'Что делать, если снаряжение повреждено?',
    a: 'Зафиксируйте повреждения фото или видео и откройте спор в системе в течение 24 часов после возврата (кнопка «Открыть спор» на странице бронирования). Служба поддержки рассмотрит заявку и вынесет решение.',
  },
  {
    q: 'Когда размораживается залог?',
    a: 'Залог размораживается в течение 48 часов после того, как хост подтвердит возврат снаряжения в приложении. Если спора не было, деньги автоматически возвращаются на вашу карту.',
  },
  {
    q: 'Как стать хостом?',
    a: 'Зарегистрируйтесь на Rigs, пройдите верификацию телефона, при необходимости — верификацию паспорта. Затем перейдите в раздел «Стать хостом» и создайте первое объявление. Это займёт около 10 минут.',
  },
  {
    q: 'Как изменить или отменить бронирование?',
    a: 'Зайдите в «Мои аренды» и откройте нужное бронирование. До начала аренды вы можете запросить отмену. Условия отмены и размер возврата зависят от политики конкретного хоста (указана в объявлении).',
  },
  {
    q: 'Безопасно ли платить на Rigs?',
    a: 'Да. Все платежи обрабатываются через YooKassa — сертифицированную платёжную систему. Данные карты нигде не хранятся на наших серверах. Деньги поступают хосту только после успешного завершения аренды.',
  },
  {
    q: 'Что входит в страховку при аренде?',
    a: 'Страховка покрывает случайные повреждения снаряжения во время аренды. При включении страховки в бронирование стоимость увеличивается на фиксированный процент. Умышленные повреждения страховкой не покрываются.',
  },
]

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-neutral-100 bg-neutral-50">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-sm font-medium text-brand-600 mb-3">Поддержка</p>
          <h1 className="text-4xl font-bold text-neutral-900 mb-4">Помощь</h1>
          <p className="text-lg text-neutral-500">
            Ответы на частые вопросы об аренде на Rigs
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* FAQ */}
        <div className="space-y-3">
          {FAQ.map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-2xl border border-neutral-100 bg-neutral-50 overflow-hidden open:bg-white open:shadow-sm transition-all"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold text-neutral-900 hover:text-brand-700 [&::-webkit-details-marker]:hidden">
                {q}
                <span className="ml-4 shrink-0 text-neutral-400 group-open:rotate-180 transition-transform duration-200">
                  ▾
                </span>
              </summary>
              <div className="px-5 pb-5 text-sm text-neutral-600 leading-relaxed border-t border-neutral-100 pt-4">
                {a}
              </div>
            </details>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-14 rounded-2xl bg-brand-50 border border-brand-100 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 mx-auto mb-4">
            <Mail className="w-5 h-5 text-brand-600" />
          </div>
          <h2 className="text-lg font-semibold text-neutral-900 mb-2">
            Не нашли ответ?
          </h2>
          <p className="text-sm text-neutral-500 mb-5">
            Наша команда поддержки отвечает в рабочие дни с 9:00 до 21:00 МСК
          </p>
          <Link
            href="mailto:support@rigs.ru"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Написать в поддержку
          </Link>
        </div>
      </div>
    </div>
  )
}
