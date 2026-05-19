import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { MapPin, Star, Zap } from 'lucide-react-native'
import { formatPrice } from '@rigs/utils'
import type { Listing } from '@rigs/types'
import { Badge } from '../ui/badge'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = SCREEN_WIDTH * 0.72

interface ListingCardProps {
  listing?: Listing
  skeleton?: boolean
  width?: number
}

export function ListingCard({ listing, skeleton = false, width = CARD_WIDTH }: ListingCardProps) {
  const router = useRouter()

  if (skeleton) {
    return (
      <View style={[styles.card, { width }]}>
        <View style={[styles.image, styles.skeleton]} />
        <View style={styles.body}>
          <View style={[styles.skeletonLine, { width: '40%', height: 16, marginBottom: 6 }]} />
          <View style={[styles.skeletonLine, { width: '90%', height: 14, marginBottom: 4 }]} />
          <View style={[styles.skeletonLine, { width: '60%', height: 12, marginBottom: 8 }]} />
          <View style={[styles.skeletonLine, { width: '50%', height: 14 }]} />
        </View>
      </View>
    )
  }

  if (!listing) return null

  const coverUri = listing.media.find((m) => m.isCover)?.url ?? listing.media[0]?.url

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.card, { width }]}
      onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
    >
      <View style={styles.imageWrapper}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imageFallback]} />
        )}
        {listing.category && (
          <View style={styles.categoryBadge}>
            <Badge label={listing.category.nameRu} variant="info" />
          </View>
        )}
        {listing.instantBook && (
          <View style={styles.instantBadge}>
            <Zap size={12} color="#fff" fill="#fff" />
            <Text style={styles.instantText}>Мгновенно</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>

        <View style={styles.cityRow}>
          <MapPin size={12} color="#6b7280" />
          <Text style={styles.city}>{listing.city}</Text>
        </View>

        <View style={styles.ratingRow}>
          <Star size={12} color="#f59e0b" fill="#f59e0b" />
          <Text style={styles.ratingText}>
            {listing.rating ? listing.rating.toFixed(1) : '—'}
          </Text>
          <Text style={styles.reviewsText}>({listing.reviewsCount})</Text>
        </View>

        <Text style={styles.price}>
          {listing.priceDaily ? `${formatPrice(listing.priceDaily)} / день` : '—'}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: '#e5e7eb',
  },
  imageFallback: {
    backgroundColor: '#d1d5db',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  instantBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16a34a',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  instantText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  body: {
    padding: 12,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 20,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  city: {
    fontSize: 12,
    color: '#6b7280',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  reviewsText: {
    fontSize: 12,
    color: '#6b7280',
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  skeleton: {
    backgroundColor: '#e5e7eb',
  },
  skeletonLine: {
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
  },
})
