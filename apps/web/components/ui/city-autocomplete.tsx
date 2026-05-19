'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

export interface CityAutocompleteProps {
  value: string
  onChange: (city: string) => void
  placeholder?: string
  className?: string
  label?: string
  error?: string
  fullWidth?: boolean
}

const DADATA_URL = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address'

export function CityAutocomplete({
  value,
  onChange,
  placeholder = 'Введите город',
  className,
  label,
  error,
  fullWidth = false,
}: CityAutocompleteProps) {
  const dadataKey = process.env.NEXT_PUBLIC_DADATA_KEY

  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!dadataKey || query.length < 2) {
        setSuggestions([])
        setOpen(false)
        return
      }
      setLoading(true)
      try {
        const res = await fetch(DADATA_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${dadataKey}`,
          },
          body: JSON.stringify({
            query,
            count: 5,
            from_bound: { value: 'city' },
            to_bound: { value: 'city' },
          }),
        })
        if (!res.ok) return
        const json = await res.json()
        const cities: string[] = (json.suggestions ?? [])
          .map((s: any) => s.data?.city as string | undefined)
          .filter((c: string | undefined): c is string => !!c)
        setSuggestions(cities)
        setOpen(cities.length > 0)
      } catch {
        // silently ignore errors
      } finally {
        setLoading(false)
      }
    },
    [dadataKey],
  )

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    onChange(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchSuggestions(val), 300)
  }

  function handleSelect(city: string) {
    onChange(city)
    setSuggestions([])
    setOpen(false)
  }

  const inputClass = cn(
    'h-10 rounded-xl border px-3 text-sm text-gray-900 placeholder-gray-400',
    'transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
    'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
    error ? 'border-red-400 focus:ring-red-400' : 'border-gray-300',
    fullWidth && 'w-full',
    loading && 'pr-9',
    className,
  )

  // Fallback: no Dadata key
  if (!dadataKey) {
    return (
      <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
        {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')} ref={wrapperRef}>
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={inputClass}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {open && suggestions.length > 0 && (
          <ul className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map((city) => (
              <li
                key={city}
                onMouseDown={() => handleSelect(city)}
                className="px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 cursor-pointer"
              >
                {city}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
