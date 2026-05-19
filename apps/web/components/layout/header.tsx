'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Menu, X, Search, Bell, ChevronDown, LogOut, User, Heart, LayoutDashboard, Shield, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { UserRole, SubscriptionPlan } from '@rigs/types'

const NAV_LINKS = [
  { href: '/search',          label: 'Найти' },
  { href: '/host/dashboard',  label: 'Сдать в аренду' },
]

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, accessToken, logout } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Detect scroll for header shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const userName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Профиль' : ''

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        'bg-white/90 backdrop-blur-lg border-b',
        scrolled ? 'border-neutral-200 shadow-sm' : 'border-transparent',
      )}
    >
      <div className="container">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <span className="text-base font-black text-white leading-none">R</span>
            </div>
            <span className="text-xl font-black tracking-tight text-neutral-900">
              rigs
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
                  isActive(href)
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100',
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">

            {/* Search shortcut (desktop) */}
            <button
              onClick={() => router.push('/search')}
              className="hidden md:flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-400 hover:bg-white hover:border-neutral-300 hover:text-neutral-600 transition-all duration-150"
              aria-label="Поиск"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="text-xs">Поиск...</span>
              <kbd className="hidden lg:inline-flex items-center rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-xs text-neutral-400">
                ⌘K
              </kbd>
            </button>

            {accessToken && user ? (
              <>
                {/* Notifications */}
                <Link
                  href="/my/notifications"
                  className="relative flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                  aria-label="Уведомления"
                >
                  <Bell className="w-4.5 h-4.5" />
                  {/* Unread dot */}
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand-600 ring-2 ring-white" />
                </Link>

                {/* User menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border px-2 py-1.5 transition-all duration-150',
                      userMenuOpen
                        ? 'border-brand-300 bg-brand-50'
                        : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50',
                    )}
                  >
                    {user.avatarUrl ? (
                      <Image
                        src={user.avatarUrl}
                        alt={userName}
                        width={28}
                        height={28}
                        className="rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
                        {userName[0]?.toUpperCase() ?? 'U'}
                      </div>
                    )}
                    <span className="hidden lg:block text-sm font-medium text-neutral-800 max-w-24 truncate">
                      {userName}
                    </span>
                    <ChevronDown
                      className={cn('w-3.5 h-3.5 text-neutral-400 transition-transform duration-200', userMenuOpen && 'rotate-180')}
                    />
                  </button>

                  {/* Dropdown */}
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-neutral-200 bg-white shadow-lg animate-scale-in origin-top-right z-50">
                      {/* User info */}
                      <div className="px-4 py-3 border-b border-neutral-100">
                        <p className="text-sm font-semibold text-neutral-900">{userName}</p>
                        <p className="text-xs text-neutral-500 truncate">{user.phone}</p>
                      </div>

                      <div className="p-1.5 space-y-0.5">
                        <DropdownItem href="/my/profile" icon={User} label="Мой профиль" />
                        <DropdownItem href="/my/wishlist" icon={Heart} label="Избранное" />
                        <DropdownItem href="/my/rentals" icon={LayoutDashboard} label="Мои аренды" />
                        <DropdownItem href="/my/messages" icon={Bell} label="Сообщения" />

                        {(user.role === UserRole.HOST || user.role === UserRole.BOTH) && (
                          <>
                            <div className="my-1 h-px bg-neutral-100" />
                            <DropdownItem href="/host/dashboard" icon={LayoutDashboard} label="Панель хоста" />
                          </>
                        )}

                        {user.subscriptionPlan === SubscriptionPlan.BUSINESS ? (
                          <>
                            <div className="my-1 h-px bg-neutral-100" />
                            <DropdownItem href="/business" icon={Building2} label="Бизнес-кабинет" />
                          </>
                        ) : (
                          <>
                            <div className="my-1 h-px bg-neutral-100" />
                            <Link
                              href="/business/upgrade"
                              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-brand-600 hover:bg-brand-50 transition-colors"
                            >
                              <Building2 className="w-4 h-4" />
                              Перейти на Бизнес
                            </Link>
                          </>
                        )}

                        {user.role === UserRole.ADMIN && (
                          <>
                            <div className="my-1 h-px bg-neutral-100" />
                            <DropdownItem href="/admin" icon={Shield} label="Администрирование" />
                          </>
                        )}
                      </div>

                      <div className="p-1.5 border-t border-neutral-100">
                        <button
                          onClick={() => { logout(); setUserMenuOpen(false); router.push('/') }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Выйти
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth"
                  className="hidden md:block px-4 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  Войти
                </Link>
                <Link
                  href="/auth"
                  className="btn-primary btn-sm"
                >
                  Начать
                </Link>
              </div>
            )}

            {/* Mobile burger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
              aria-label={mobileOpen ? 'Закрыть меню' : 'Открыть меню'}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-neutral-100 bg-white animate-slide-down">
          <div className="container py-4 space-y-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(href)
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-neutral-700 hover:bg-neutral-100',
                )}
              >
                {label}
              </Link>
            ))}
            {!accessToken && (
              <div className="pt-3 flex gap-2">
                <Link href="/auth" className="btn-outline btn flex-1">Войти</Link>
                <Link href="/auth" className="btn-primary btn flex-1">Регистрация</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

function DropdownItem({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
    >
      <Icon className="w-4 h-4 text-neutral-400" />
      {label}
    </Link>
  )
}
