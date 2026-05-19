'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react'
import type { ListingMedia } from '@rigs/types'
import { cn } from '@/lib/utils'

interface ListingGalleryProps {
  media: ListingMedia[]
  title: string
}

export function ListingGallery({ media, title }: ListingGalleryProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const photos = media.filter((m) => m.type === 'photo')
  const sorted = [...photos].sort((a, b) => a.sortOrder - b.sortOrder)
  const cover = sorted.find((m) => m.isCover) ?? sorted[0]

  if (sorted.length === 0) {
    return (
      <div className="aspect-[16/9] bg-gray-100 rounded-2xl flex items-center justify-center text-gray-300">
        <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    )
  }

  function openModal(index: number) {
    setActiveIndex(index)
    setModalOpen(true)
  }

  function prev() {
    setActiveIndex((i) => (i - 1 + sorted.length) % sorted.length)
  }

  function next() {
    setActiveIndex((i) => (i + 1) % sorted.length)
  }

  return (
    <>
      {/* Main view */}
      <div className="space-y-2">
        {/* Main large photo */}
        <div
          className="relative aspect-[16/9] rounded-2xl overflow-hidden cursor-pointer bg-gray-100"
          onClick={() => openModal(0)}
        >
          {cover && (
            <Image
              src={cover.url}
              alt={title}
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover"
            />
          )}
          {sorted.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setModalOpen(true) }}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white text-gray-700 text-sm font-medium px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors shadow"
            >
              <LayoutGrid className="w-4 h-4" />
              Показать все фото ({sorted.length})
            </button>
          )}
        </div>

        {/* Thumbnails */}
        {sorted.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {sorted.map((photo, i) => (
              <button
                key={photo.id}
                onClick={() => openModal(i)}
                className={cn(
                  'relative flex-none w-20 h-16 rounded-xl overflow-hidden border-2 transition-colors',
                  i === 0 ? 'border-brand-600' : 'border-transparent hover:border-gray-300',
                )}
              >
                <Image
                  src={photo.url}
                  alt={`Фото ${i + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setModalOpen(false)}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
            onClick={() => setModalOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm">
            {activeIndex + 1} / {sorted.length}
          </div>

          {/* Prev */}
          {sorted.length > 1 && (
            <button
              className="absolute left-4 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
              onClick={(e) => { e.stopPropagation(); prev() }}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Image */}
          <div
            className="relative w-full max-w-5xl max-h-[80vh] aspect-[16/9] mx-16"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={sorted[activeIndex]!.url}
              alt={`${title} — фото ${activeIndex + 1}`}
              fill
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-contain"
            />
          </div>

          {/* Next */}
          {sorted.length > 1 && (
            <button
              className="absolute right-4 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
              onClick={(e) => { e.stopPropagation(); next() }}
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Grid of all photos */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 overflow-x-auto max-w-lg px-4">
            {sorted.map((photo, i) => (
              <button
                key={photo.id}
                onClick={(e) => { e.stopPropagation(); setActiveIndex(i) }}
                className={cn(
                  'relative flex-none w-12 h-9 rounded-lg overflow-hidden border-2 transition-colors',
                  i === activeIndex ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100',
                )}
              >
                <Image src={photo.url} alt="" fill sizes="48px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
