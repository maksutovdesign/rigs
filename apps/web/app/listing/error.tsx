'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ListingError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-900">Не удалось загрузить объявление</p>
        <p className="mt-1 text-sm text-gray-500">Попробуйте обновить страницу или вернуться к поиску.</p>
        <div className="mt-6 flex gap-3 justify-center">
          <button onClick={reset} className="rounded-xl bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">
            Повторить
          </button>
          <Link href="/search" className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            К поиску
          </Link>
        </div>
      </div>
    </div>
  )
}
