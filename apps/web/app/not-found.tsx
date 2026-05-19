import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="min-h-[60vh] flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <p className="text-8xl font-extrabold text-brand-600">404</p>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Страница не найдена</h1>
          <p className="mt-2 text-sm text-gray-500">
            Возможно, ссылка устарела или страница была удалена.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/search"
              className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
            >
              Найти снаряжение
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              На главную
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
