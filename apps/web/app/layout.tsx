import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    default: 'Rigs — аренда снаряжения для активного отдыха',
    template: '%s | Rigs',
  },
  description: 'Аренда катеров, квадроциклов, SUP-досок, палаток и снаряжения для любого активного отдыха.',
  keywords: ['аренда снаряжения', 'прокат спортинвентаря', 'активный отдых', 'аренда катера', 'аренда квадроцикла'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
