'use client'

import { useState, useCallback } from 'react'
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl'
import { formatPrice } from '@rigs/utils'
import type { Listing } from '@rigs/types'
import { cn } from '@/lib/utils'
import 'mapbox-gl/dist/mapbox-gl.css'

interface ListingsMapProps {
  listings: Listing[]
  /** City to center on (falls back to Moscow). */
  city?: string
  onListingClick?: (id: string) => void
  onListingHover?: (id: string | null) => void
  selectedListingId?: string | null
  className?: string
}

function getCoords(listing: Listing): { lng: number; lat: number } | null {
  if (listing.geoPoint) return listing.geoPoint
  if (listing.latitude != null && listing.longitude != null)
    return { lat: Number(listing.latitude), lng: Number(listing.longitude) }
  return null
}

const CITY_CENTERS: Record<string, [number, number]> = {
  'москва':          [37.617, 55.755],
  'санкт-петербург': [30.315, 59.939],
  'новосибирск':     [82.920, 54.989],
  'екатеринбург':    [60.597, 56.838],
  'сочи':            [39.720, 43.585],
}

function cityCenter(city?: string): [number, number] {
  if (!city) return [37.617, 55.755]
  return CITY_CENTERS[city.toLowerCase()] ?? [37.617, 55.755]
}

function pinLabel(listing: Listing): string {
  if (listing.priceDaily)  return formatPrice(Number(listing.priceDaily))
  if (listing.priceHourly) return formatPrice(Number(listing.priceHourly))
  return '—'
}

export function ListingsMap({ listings, city, onListingClick, onListingHover, selectedListingId, className }: ListingsMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = listings.find((l) => l.id === selectedId)
  const [lng, lat] = cityCenter(city)

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

  // Fallback when token is not configured
  if (!MAPBOX_TOKEN) {
    return (
      <div className={cn('rounded-2xl overflow-hidden bg-neutral-100 flex flex-col items-center justify-center gap-2', className)}>
        <span className="text-2xl">🗺️</span>
        <p className="text-sm text-neutral-400 font-medium">
          {city ?? 'Местоположение'}
        </p>
        <p className="text-xs text-neutral-300">Карта недоступна</p>
      </div>
    )
  }

  // Only listings that carry geo coordinates get pins
  const geoListings = listings.filter((l) => getCoords(l) != null)

  const handleMarkerClick = useCallback(
    (e: { originalEvent: MouseEvent }, id: string) => {
      e.originalEvent.stopPropagation()
      setSelectedId((prev) => (prev === id ? null : id))
    },
    [],
  )

  return (
    <div className={cn('rounded-2xl overflow-hidden', className)}>
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ longitude: lng, latitude: lat, zoom: 10 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        onClick={() => setSelectedId(null)}
      >
        <NavigationControl position="top-right" />

        {geoListings.map((listing) => {
          const coords = getCoords(listing)!
          const isSelected = selectedId === listing.id || selectedListingId === listing.id
          return (
            <Marker
              key={listing.id}
              longitude={coords.lng}
              latitude={coords.lat}
              onClick={(e) => handleMarkerClick(e, listing.id)}
            >
              <button
                aria-label={listing.title}
                className={cn(
                  'rounded-full px-2 py-1 text-xs font-semibold shadow-md border transition-all',
                  isSelected
                    ? 'bg-brand-600 text-white border-brand-700 scale-110'
                    : 'bg-white text-gray-900 border-gray-200 hover:border-brand-400 hover:bg-brand-50',
                )}
              >
                {pinLabel(listing)}
              </button>
            </Marker>
          )
        })}

        {selected && getCoords(selected) && (
          <Popup
            longitude={getCoords(selected)!.lng}
            latitude={getCoords(selected)!.lat}
            onClose={() => setSelectedId(null)}
            closeOnClick={false}
            closeButton
            maxWidth="220px"
            offset={16}
          >
            <div className="p-1 space-y-1">
              <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">
                {selected.title}
              </p>
              <p className="text-xs text-gray-500">{selected.city}</p>
              {selected.priceDaily && (
                <p className="text-sm font-bold text-brand-600">
                  {formatPrice(Number(selected.priceDaily))}&nbsp;/ день
                </p>
              )}
              <button
                className="mt-1 w-full text-xs text-center font-medium text-brand-600 hover:underline"
                onClick={() => onListingClick?.(selected.id)}
              >
                Открыть объявление →
              </button>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}
