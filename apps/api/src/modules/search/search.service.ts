import { Injectable, Inject, Logger } from '@nestjs/common'
import { Client } from '@elastic/elasticsearch'
import { PrismaService } from '../../prisma/prisma.service'
import { ELASTIC_CLIENT } from './search.module'

export const LISTINGS_INDEX = 'rigs_listings'

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name)

  constructor(
    @Inject(ELASTIC_CLIENT) private readonly elastic: Client,
    private readonly prisma: PrismaService,
  ) {}

  // Index a listing when it becomes active (called by ListingsService)
  async indexListing(listingId: string): Promise<void> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { category: { select: { nameRu: true, slug: true } } },
    })
    if (!listing) return

    await this.elastic.index({
      index: LISTINGS_INDEX,
      id: listingId,
      document: {
        id: listing.id,
        title: listing.title,
        description: listing.description ?? '',
        city: listing.city,
        region: listing.region ?? '',
        tags: listing.tags,
        priceDaily: listing.priceDaily ? Number(listing.priceDaily) : null,
        priceHourly: listing.priceHourly ? Number(listing.priceHourly) : null,
        categorySlug: listing.category?.slug ?? '',
        categoryName: listing.category?.nameRu ?? '',
        instantBook: listing.instantBook,
        rating: listing.rating ? Number(listing.rating) : null,
        status: listing.status,
        createdAt: listing.createdAt,
      },
    }).catch((err) => {
      this.logger.warn(`Failed to index listing ${listingId}: ${err.message}`)
    })
  }

  // Remove from index when listing is deactivated
  async removeListing(listingId: string): Promise<void> {
    await this.elastic.delete({ index: LISTINGS_INDEX, id: listingId }).catch(() => {})
  }

  async search(q: string, opts?: { city?: string; category?: string; priceMin?: number; priceMax?: number }) {
    try {
      const must: any[] = [
        { term: { status: 'active' } },
        {
          multi_match: {
            query: q,
            fields: ['title^3', 'description', 'tags^2', 'categoryName'],
            type: 'best_fields',
            fuzziness: 'AUTO',
          },
        },
      ]

      const filter: any[] = []
      if (opts?.city) filter.push({ match: { city: opts.city } })
      if (opts?.category) filter.push({ term: { categorySlug: opts.category } })
      if (opts?.priceMin || opts?.priceMax) {
        filter.push({ range: { priceDaily: { gte: opts.priceMin, lte: opts.priceMax } } })
      }

      const result = await this.elastic.search({
        index: LISTINGS_INDEX,
        query: { bool: { must, filter } },
        size: 20,
        _source: ['id'],
      })

      const ids = result.hits.hits.map((h) => h._id as string)
      if (ids.length === 0) return []

      // Fetch full data from Prisma to stay consistent with other endpoints
      const listings = await this.prisma.listing.findMany({
        where: { id: { in: ids } },
        include: { media: { where: { isCover: true }, take: 1 }, category: true },
      })

      // Preserve Elasticsearch score order
      const map = new Map(listings.map((l) => [l.id, l]))
      return ids.map((id) => map.get(id)).filter(Boolean)

    } catch (err: any) {
      // Elasticsearch not available — fall back to Prisma LIKE search
      this.logger.warn(`Elasticsearch unavailable, using Prisma fallback: ${err.message}`)
      return this.prismaFallback(q, opts)
    }
  }

  async getSuggestions(q: string) {
    try {
      const result = await this.elastic.search({
        index: LISTINGS_INDEX,
        query: {
          bool: {
            must: [
              { term: { status: 'active' } },
              { match_phrase_prefix: { title: { query: q, max_expansions: 10 } } },
            ],
          },
        },
        size: 8,
        _source: ['title', 'categoryName'],
      })

      return result.hits.hits.map((h: any) => ({
        text: h._source.title,
        category: h._source.categoryName,
      }))
    } catch {
      const listings = await this.prisma.listing.findMany({
        where: { status: 'active', title: { contains: q, mode: 'insensitive' } },
        select: { title: true, category: { select: { nameRu: true } } },
        take: 8,
      })
      return listings.map((l) => ({ text: l.title, category: l.category.nameRu }))
    }
  }

  private async prismaFallback(q: string, opts?: { city?: string; category?: string }) {
    return this.prisma.listing.findMany({
      where: {
        status: 'active',
        ...(opts?.city && { city: { contains: opts.city, mode: 'insensitive' } }),
        ...(opts?.category && { category: { slug: opts.category } }),
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { tags: { has: q.toLowerCase() } },
        ],
      },
      include: { media: { where: { isCover: true }, take: 1 }, category: true },
      take: 20,
    })
  }
}
