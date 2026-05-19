'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Heart, Star, MapPin, Zap, BadgeCheck, MessageCircle } from 'lucide-react'
import { formatPrice } from '@rigs/utils'
import type { Listing } from '@rigs/types'
import { KycLevel } from '@rigs/types'
import { cn } from '@/lib/utils'

interface ListingCardProps {
  listing?: Listing
  isLoading?: boolean
  wishlisted?: boolean
  onWishlistToggle?: (id: string) => void
  className?: string
  showMessageBtn?: boolean
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl overflow-hidden bg-white border border-neutral-100', className)}>
      <div className="aspect-[4/3] skeleton" />
      <div className="p-3.5 space-y-2.5">
        <div className="skeleton h-3 w-16 rounded-full" />
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-2/5 rounded" />
        <div className="flex items-center gap-2 pt-1">
          <div className="skeleton h-5 w-5 rounded-full shrink-0" />
          <div className="skeleton h-3 w-24 rounded" />
        </div>
        <div className="skeleton h-5 w-1/3 rounded mt-1" />
      </div>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function ListingCard({
  listing,
  isLoading = false,
  wishlisted = false,
  onWishlistToggle,
  className,
  showMessageBtn = false,
}: ListingCardProps) {
  const [isFaved, setIsFaved] = useState(wishlisted)
  const [imgError, setImgError] = useState(false)
  const [hovered, setHovered] = useState(false)

  if (isLoading || !listing) return <SkeletonCard className={className} />

  const coverMedia = listing.media?.find((m) => m.isCover) ?? listing.media?.[0]
  const hostName = [listing.host?.firstName, listing.host?.lastName].filter(Boolean).join(' ') || 'Хост'
  const isVerified = listing.host?.kycLevel && listing.host.kycLevel !== KycLevel.NONE
  const hasRating = listing.rating && Number(listing.rating) > 0
  const price = listing.priceDaily ?? listing.priceHourly
  const priceUnit = listing.priceDaily ? '/ день' : listing.priceHourly ? '/ час' : ''

  function handleWishlist(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsFaved((prev) => !prev)
    onWishlistToggle?.(listing!.id)
  }

  return (
    <Link
      href={`/listing/${listing.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'group relative block rounded-2xl overflow-hidden bg-white border border-neutral-100',
        'hover:shadow-md hover:border-neutral-200 transition-all duration-200 hover:-translate-y-0.5',
        className,
      )}
    >
      {/* ── Cover photo ───────────────────────────────────────────── */}
      <div className="relative aspect-[4/3] bg-neutral-100 overflow-hidden">
        {coverMedia && !imgError ? (
          <Image
            src={coverMedia.url}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200">
            <svg className="w-10 h-10 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Gradient overlay for badges legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Wishlist button */}
        <button
          onClick={handleWishlist}
          className={cn(
            'absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full',
            'bg-white/90 backdrop-blur-sm shadow-sm',
            'hover:scale-110 active:scale-95 transition-transform duration-150',
          )}
          aria-label={isFaved ? 'Убрать из избранного' : 'В избранное'}
        >
          <Heart
            className={cn(
              'w-4 h-4 transition-colors duration-150',
              isFaved ? 'fill-rose-500 text-rose-500' : 'text-neutral-500',
            )}
          />
        </button>

        {/* Instant book badge */}
        {listing.instantBook && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/95 px-2 py-0.5 text-xs font-semibold text-amber-900 backdrop-blur-sm shadow-sm">
              <Zap className="w-3 h-3 fill-amber-900" />
              Мгновенно
            </span>
          </div>
        )}
      </div>

      {/* ── Card body ─────────────────────────────────────────────── */}
      <div className="p-3.5">
        {/* Category + city */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          {listing.category?.nameRu && (
            <span className="text-2xs font-semibold text-brand-600 uppercase tracking-wide truncate">
              {listing.category.nameRu}
            </span>
          )}
          {listing.city && (
            <span className="flex items-center gap-0.5 text-2xs text-neutral-400 shrink-0">
              <MapPin className="w-2.5 h-2.5" />
              {listing.city}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-neutral-900 line-clamp-2 leading-snug mb-2">
          {listing.title}
        </h3>

        {/* Host row */}
        <div className="flex items-center gap-1.5 mb-2">
          {listing.host?.avatarUrl ? (
            <Image
              src={listing.host.avatarUrl}
              alt={hostName}
              width={18}
              height={18}
              className="rounded-full object-cover ring-1 ring-neutral-200"
            />
          ) : (
            <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand-100 text-2xs font-semibold text-brand-700 ring-1 ring-neutral-200">
              {hostName[0]?.toUpperCase() ?? 'H'}
            </div>
          )}
          <span className="text-xs text-neutral-500 truncate">{hostName}</span>
          {isVerified && (
            <BadgeCheck className="w-3.5 h-3.5 text-brand-500 shrink-0" />
          )}
        </div>

        {/* Rating + price row */}
        <div className="flex items-center justify-between gap-2">
          {/* Rating */}
          <div className="flex items-center gap-1">
            {hasRating ? (
              <>
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                <span className="text-xs font-semibold text-neutral-700">
                  {Number(listing.rating).toFixed(1)}
                </span>
                <span className="text-xs text-neutral-400">({listing.reviewsCount})</span>
              </>
            ) : (
              <span className="text-xs text-neutral-400">Нет отзывов</span>
            )}
          </div>

          {/* Price */}
          {price && (
            <div className="flex items-baseline gap-0.5 shrink-0">
              <span className="text-sm font-bold text-neutral-900">
                {formatPrice(price)}
              </span>
              <span className="text-2xs text-neutral-400">{priceUnit}</span>
            </div>
          )}
        </div>

        {/* Message host button */}
        {showMessageBtn && listing.host?.id && (
          <Link
            href={`/my/messages?userId=${listing.host.id}`}
            onClick={(e) => e.stopPropagation()}
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-brand-600 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Написать хосту
          </Link>
        )}
      </div>

      {/* Hover quick-info panel */}
      <div className={cn(
        'absolute inset-x-0 bottom-0 bg-white/98 backdrop-blur-sm border-t border-neutral-100 p-3 transition-all duration-200',
        hovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
      )}>
        {listing.description && (
          <p className="text-xs text-neutral-500 line-clamp-2 mb-2">{listing.description}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-neutral-400">
          {listing.reviewsCount > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {Number(listing.rating ?? 0).toFixed(1)} ({listing.reviewsCount})
            </span>
          )}
          {listing.bookingsCount > 0 && (
            <span>{listing.bookingsCount} аренд</span>
          )}
          {listing.quantity != null && listing.quantity > 1 && (
            <span>×{listing.quantity} шт.</span>
          )}
        </div>
      </div>
    </Link>
  )
}
