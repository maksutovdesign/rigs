import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50 py-12">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <span className="text-lg font-bold text-brand-600">Rigs</span>
            <p className="mt-2 text-sm text-gray-500">Аренда снаряжения для активного отдыха</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Снаряжение</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              <li><Link href="/category/water">Водный отдых</Link></li>
              <li><Link href="/category/winter">Зимний отдых</Link></li>
              <li><Link href="/category/camping">Кемпинг</Link></li>
              <li><Link href="/category/cycling">Велоспорт</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Платформа</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              <li><Link href="/host/dashboard">Стать хостом</Link></li>
              <li><Link href="/blog">Блог</Link></li>
              <li><Link href="/help">Помощь</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Компания</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              <li><Link href="/about">О нас</Link></li>
              <li><Link href="/privacy">Конфиденциальность</Link></li>
              <li><Link href="/terms">Условия</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-6 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} Rigs. Все права защищены.
        </div>
      </div>
    </footer>
  )
}
