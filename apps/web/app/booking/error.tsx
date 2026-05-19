'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function BookingError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-900">Ошибка при оформлении бронирования</p>
        <p className="mt-1 text-sm text-gray-500">Пожалуйста, попробуйте ещё раз. Ваши данные не потеряны.</p>
        <div className="mt-6 flex gap-3 justify-center">
          <button onClick={reset} className="rounded-xl bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">
            Повторить
          </button>
          <Link href="/my/rentals" className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Мои аренды
          </Link>
        </div>
      </div>
    </div>
  )
}
