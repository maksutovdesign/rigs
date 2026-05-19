export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <p className="text-sm text-neutral-400 mb-6">Действует с 1 января 2024 г.</p>

        <h1 className="text-4xl font-bold text-neutral-900 mb-10">
          Политика конфиденциальности
        </h1>

        <div className="space-y-8 text-neutral-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-neutral-900 mb-3">
              Какие данные мы собираем
            </h2>
            <p>Мы собираем следующие данные при использовании платформы:</p>
            <ul className="mt-3 space-y-1.5 list-disc list-inside text-neutral-600">
              <li>Номер телефона, имя и адрес электронной почты</li>
              <li>История аренд и бронирований</li>
              <li>Геолокация — только при выполнении поиска снаряжения</li>
              <li>Паспортные данные — при прохождении верификации KYC</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 mb-3">
              Как мы используем данные
            </h2>
            <p>Собранные данные используются исключительно в следующих целях:</p>
            <ul className="mt-3 space-y-1.5 list-disc list-inside text-neutral-600">
              <li>Обеспечение работы сервиса и функционала платформы</li>
              <li>Улучшение качества рекомендаций и поиска</li>
              <li>Отправка уведомлений о бронированиях и статусах аренд</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 mb-3">Передача данных</h2>
            <p>
              Мы не продаём и не передаём ваши персональные данные третьим лицам в коммерческих
              целях. Данные, необходимые для обработки платежей, передаются платёжным системам
              исключительно в объёме, необходимом для проведения транзакций.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 mb-3">Безопасность</h2>
            <p>
              Все данные передаются по зашифрованному соединению. Паспортные данные хранятся
              в зашифрованном виде с использованием алгоритма AES-256. Мы регулярно проводим
              аудит систем безопасности.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 mb-3">Ваши права</h2>
            <p>
              Вы вправе запросить удаление аккаунта и всех связанных данных, а также экспорт
              своих данных в машиночитаемом формате. Для этого обратитесь на{' '}
              <a
                href="mailto:support@rigs.ru"
                className="text-brand-600 hover:underline font-medium"
              >
                support@rigs.ru
              </a>
              . Мы обработаем запрос в течение 30 дней.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 mb-3">Cookie</h2>
            <p>
              Платформа использует файлы cookie для поддержания сессии авторизации и
              анонимной аналитики поведения пользователей. Вы можете отключить cookie
              в настройках браузера, однако это может повлиять на работу сервиса.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 mb-3">Контакты</h2>
            <p>
              По вопросам конфиденциальности обращайтесь:{' '}
              <a
                href="mailto:privacy@rigs.ru"
                className="text-brand-600 hover:underline font-medium"
              >
                privacy@rigs.ru
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
