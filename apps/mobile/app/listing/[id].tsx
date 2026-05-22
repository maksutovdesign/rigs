import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Heart, MapPin, Star, Shield, ChevronDown, ChevronUp } from 'lucide-react-native'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { formatPrice } from '@rigs/utils'
import { KycLevel, ListingCondition } from '@rigs/types'
import { useListing } from '../../hooks/use-listings'
import { Avatar } from '../../components/ui/avatar'
import { Badge } from '../../components/ui/badge'
import { StarRating } from '../../components/ui/star-rating'
import type { Review } from '@rigs/types'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const CONDITION_LABELS: Record<ListingCondition, string> = {
  [ListingCondition.NEW]: 'Новое',
  [ListingCondition.EXCELLENT]: 'Отличное',
  [ListingCondition.GOOD]: 'Хорошее',
  [ListingCondition.FAIR]: 'Удовлетворительное',
}

function getHostName(user: { firstName?: string; lastName?: string }): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Хост'
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: listing, isLoading, error } = useListing(id)
  const [activeIndex, setActiveIndex] = useState(0)
  const [descExpanded, setDescExpanded] = useState(false)
  const [wishlist, setWishlist] = useState(false)

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    )
  }

  if (error || !listing) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Не удалось загрузить объявление</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Назад</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const media = listing.media ?? []
  const desc = listing.description ?? ''
  const shortDesc = desc.slice(0, 100)
  const needsExpand = desc.length > 100

  const hostName = listing.host ? getHostName(listing.host) : 'Хост'
  const isSuperHost = (listing.host?.totalRentals ?? 0) > 50
  const isVerified = listing.host?.kycLevel === KycLevel.PASSPORT || listing.host?.kycLevel === KycLevel.FULL

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Gallery */}
        <View>
          <FlatList
            data={media.length > 0 ? media : [{ id: 'placeholder', url: '', type: 'photo', sortOrder: 0, isCover: true }]}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
              setActiveIndex(idx)
            }}
            renderItem={({ item }) =>
              item.url ? (
                <Image source={{ uri: item.url }} style={styles.galleryImage} resizeMode="cover" />
              ) : (
                <View style={[styles.galleryImage, styles.imageFallback]} />
              )
            }
          />

          {/* Dots */}
          {media.length > 1 && (
            <View style={styles.dotsRow}>
              {media.map((_, i) => (
                <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
              ))}
            </View>
          )}

          {/* Back button */}
          <TouchableOpacity style={styles.backOverlay} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#111827" />
          </TouchableOpacity>

          {/* Wishlist */}
          <TouchableOpacity
            style={styles.heartOverlay}
            onPress={() => setWishlist((v) => !v)}
          >
            <Heart size={20} color={wishlist ? '#ef4444' : '#111827'} fill={wishlist ? '#ef4444' : 'none'} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>{listing.title}</Text>

          {/* Category + City */}
          <View style={styles.metaRow}>
            {listing.category && <Badge label={listing.category.nameRu} variant="info" />}
            <View style={styles.cityRow}>
              <MapPin size={14} color="#6b7280" />
              <Text style={styles.cityText}>{listing.city}</Text>
            </View>
          </View>

          {/* Rating */}
          <View style={styles.ratingRow}>
            <StarRating rating={listing.rating ?? 0} size={16} />
            <Text style={styles.ratingText}>
              {listing.rating ? listing.rating.toFixed(1) : '—'}
            </Text>
            <Text style={styles.reviewsText}>({listing.reviewsCount} отзывов)</Text>
            {isVerified && <Badge label="Верифицирован" variant="success" />}
          </View>

          <View style={styles.divider} />

          {/* Host */}
          {listing.host && (
            <View style={styles.hostRow}>
              <Avatar
                uri={listing.host.avatarUrl}
                name={hostName}
                size="md"
              />
              <View style={styles.hostInfo}>
                <Text style={styles.hostName}>{hostName}</Text>
                {isSuperHost && <Badge label="Супер-хост" variant="success" />}
              </View>
              <TouchableOpacity
                style={styles.messageBtn}
                onPress={() => router.push({ pathname: '/chat/[conversationId]', params: { conversationId: listing.hostId } })}
              >
                <Text style={styles.messageBtnText}>Написать</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.divider} />

          {/* Description */}
          {desc.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Описание</Text>
              <Text style={styles.descText}>
                {descExpanded || !needsExpand ? desc : shortDesc + '...'}
              </Text>
              {needsExpand && (
                <TouchableOpacity
                  style={styles.expandBtn}
                  onPress={() => setDescExpanded((v) => !v)}
                >
                  <Text style={styles.expandBtnText}>
                    {descExpanded ? 'Скрыть' : 'Читать полностью'}
                  </Text>
                  {descExpanded ? (
                    <ChevronUp size={16} color="#16a34a" />
                  ) : (
                    <ChevronDown size={16} color="#16a34a" />
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.divider} />

          {/* Характеристики */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Характеристики</Text>
            {listing.brand && <SpecRow label="Бренд" value={listing.brand} />}
            {listing.model && <SpecRow label="Модель" value={listing.model} />}
            {listing.year && <SpecRow label="Год" value={String(listing.year)} />}
            <SpecRow label="Состояние" value={CONDITION_LABELS[listing.condition]} />
            {listing.attributes.map((attr) => (
              <SpecRow
                key={attr.key}
                label={attr.key}
                value={attr.unit ? `${attr.value} ${attr.unit}` : attr.value}
              />
            ))}
          </View>

          {/* Требования */}
          {(listing.requiresPassport || listing.requiresLicense || listing.requiresCert || listing.minAge > 0) && (
            <>
              <View style={styles.divider} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Требования</Text>
                {listing.requiresPassport && (
                  <View style={styles.reqRow}>
                    <Shield size={14} color="#6b7280" />
                    <Text style={styles.reqText}>Паспорт</Text>
                  </View>
                )}
                {listing.requiresLicense && (
                  <View style={styles.reqRow}>
                    <Shield size={14} color="#6b7280" />
                    <Text style={styles.reqText}>Водительские права</Text>
                  </View>
                )}
                {listing.requiresCert && (
                  <View style={styles.reqRow}>
                    <Shield size={14} color="#6b7280" />
                    <Text style={styles.reqText}>Сертификат</Text>
                  </View>
                )}
                {listing.minAge > 0 && (
                  <View style={styles.reqRow}>
                    <Shield size={14} color="#6b7280" />
                    <Text style={styles.reqText}>Минимальный возраст: {listing.minAge} лет</Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Reviews placeholder */}
          <View style={styles.divider} />
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Star size={18} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.sectionTitle}>
                {listing.rating ? listing.rating.toFixed(1) : '—'} · {listing.reviewsCount} отзывов
              </Text>
            </View>
            {listing.reviewsCount === 0 && (
              <Text style={styles.emptyText}>Пока нет отзывов</Text>
            )}
          </View>
        </View>

        {/* Bottom padding for sticky bar */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={styles.stickyBar}>
        <View>
          <Text style={styles.priceLabel}>от</Text>
          <Text style={styles.priceAmount}>
            {listing.priceDaily ? formatPrice(listing.priceDaily) : '—'}
          </Text>
          <Text style={styles.priceUnit}>в день</Text>
        </View>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() =>
            router.push({
              pathname: '/booking/new',
              params: { listingId: listing.id },
            })
          }
        >
          <Text style={styles.bookBtnText}>Забронировать</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={specStyles.row}>
      <Text style={specStyles.label}>{label}</Text>
      <Text style={specStyles.value}>{value}</Text>
    </View>
  )
}

const specStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  label: { fontSize: 14, color: '#6b7280' },
  value: { fontSize: 14, color: '#111827', fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 15, color: '#6b7280' },
  backBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: { color: '#fff', fontWeight: '600' },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: 300,
    backgroundColor: '#e5e7eb',
  },
  imageFallback: { backgroundColor: '#d1d5db' },
  dotsRow: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: { backgroundColor: '#fff', width: 18 },
  backOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 16 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 28,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cityText: { fontSize: 13, color: '#6b7280' },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  ratingText: { fontSize: 14, fontWeight: '600', color: '#111827' },
  reviewsText: { fontSize: 13, color: '#6b7280' },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 16 },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hostInfo: { flex: 1, gap: 4 },
  hostName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  messageBtn: {
    borderWidth: 1,
    borderColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  messageBtnText: { color: '#16a34a', fontSize: 13, fontWeight: '600' },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  descText: { fontSize: 14, color: '#374151', lineHeight: 22 },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  expandBtnText: { color: '#16a34a', fontSize: 14, fontWeight: '600' },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  reqText: { fontSize: 14, color: '#374151' },
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  emptyText: { fontSize: 14, color: '#9ca3af' },
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  priceLabel: { fontSize: 11, color: '#6b7280' },
  priceAmount: { fontSize: 20, fontWeight: '700', color: '#111827' },
  priceUnit: { fontSize: 11, color: '#6b7280' },
  bookBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
