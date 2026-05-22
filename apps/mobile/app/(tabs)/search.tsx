import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useState, useEffect } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { Search, SlidersHorizontal, Map, MapPin, List } from 'lucide-react-native'
import type { Listing } from '@rigs/types'
import { useSearchListings } from '../../hooks/use-listings'
import { ListingCard } from '../../components/listings/listing-card'

type ViewMode = 'list' | 'map'

const PRICE_FILTERS = [
  { label: 'До 1 000 ₽', max: 1000 },
  { label: '1 000 – 3 000 ₽', min: 1000, max: 3000 },
  { label: '3 000 – 10 000 ₽', min: 3000, max: 10000 },
  { label: 'От 10 000 ₽', min: 10000 },
]

export default function SearchScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ q?: string; category?: string }>()
  const [query, setQuery] = useState(params.q ?? '')
  const [submittedQuery, setSubmittedQuery] = useState(params.q ?? '')
  const [selectedCategory, setSelectedCategory] = useState(params.category ?? '')
  const [selectedPrice, setSelectedPrice] = useState<{ min?: number; max?: number } | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const { data, isLoading, isFetching } = useSearchListings({
    q: submittedQuery || undefined,
    category: selectedCategory || undefined,
    priceMin: selectedPrice?.min,
    priceMax: selectedPrice?.max,
    limit: 20,
  })

  const listings = data?.items ?? []
  const total = data?.total ?? 0

  useEffect(() => {
    if (params.q) setSubmittedQuery(params.q)
    if (params.category) setSelectedCategory(params.category)
  }, [params.q, params.category])

  function handleSubmit() {
    setSubmittedQuery(query)
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Search bar */}
      <View style={styles.topBar}>
        <View style={styles.searchBar}>
          <Search size={18} color="#9ca3af" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Поиск снаряжения..."
            style={styles.searchInput}
            autoFocus={!params.q}
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setSubmittedQuery('') }}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.mapToggle} onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}>
          {viewMode === 'list' ? <Map size={20} color="#374151" /> : <SlidersHorizontal size={20} color="#374151" />}
        </TouchableOpacity>

      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        {PRICE_FILTERS.map((f) => {
          const isActive = selectedPrice?.min === f.min && selectedPrice?.max === f.max
          return (
            <TouchableOpacity
              key={f.label}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setSelectedPrice(isActive ? null : { min: f.min, max: f.max })}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* View mode toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
          onPress={() => setViewMode('list')}
        >
          <List size={16} color={viewMode === 'list' ? '#fff' : '#6b7280'} />
          <Text style={[styles.toggleBtnText, viewMode === 'list' && styles.toggleBtnTextActive]}>Список</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
          onPress={() => setViewMode('map')}
        >
          <MapPin size={16} color={viewMode === 'map' ? '#fff' : '#6b7280'} />
          <Text style={[styles.toggleBtnText, viewMode === 'map' && styles.toggleBtnTextActive]}>Карта</Text>
        </TouchableOpacity>
      </View>

      {/* Results header */}
      {!isLoading && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {total > 0 ? `${total} результатов` : 'Ничего не найдено'}
          </Text>
          {isFetching && <ActivityIndicator size="small" color="#16a34a" />}
        </View>
      )}

      {viewMode === 'map' ? (
        <View style={styles.mapPlaceholder}>
          <MapPin size={48} color="#d1d5db" />
          <Text style={styles.mapPlaceholderTitle}>Карта</Text>
          <Text style={styles.mapPlaceholderSub}>
            {listings.length > 0
              ? `${listings.length} объявлений в районе "${submittedQuery || 'вашего города'}"`
              : 'Введите город для поиска'}
          </Text>
          <Text style={styles.mapPlaceholderHint}>Интерактивная карта будет доступна в следующем обновлении</Text>
        </View>
      ) : isLoading ? (
        <FlashList
          data={Array.from({ length: 5 })}
          keyExtractor={(_, i) => `skeleton-${i}`}
          contentContainerStyle={styles.listContent}
          numColumns={1}
          renderItem={() => <ListingCard skeleton width={undefined} />}
        />
      ) : listings.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Ничего не найдено</Text>
          <Text style={styles.emptySubtitle}>
            Попробуй изменить запрос или сбросить фильтры
          </Text>
          {(selectedCategory || selectedPrice) && (
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => { setSelectedCategory(''); setSelectedPrice(null) }}
            >
              <Text style={styles.resetBtnText}>Сбросить фильтры</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlashList
          data={listings}
          keyExtractor={(item: Listing) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }: { item: Listing }) => (
            <View style={styles.cardWrapper}>
              <ListingCard listing={item} width={undefined} />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111827' },
  clearBtn: { color: '#9ca3af', fontSize: 14, paddingHorizontal: 4 },
  mapToggle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  filtersScroll: { flexGrow: 0, backgroundColor: '#fff' },
  filtersContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  filterChipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  filterChipText: { fontSize: 13, color: '#374151' },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsCount: { fontSize: 13, color: '#6b7280' },
  viewToggle: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  toggleBtnActive: { backgroundColor: '#16a34a' },
  toggleBtnText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  toggleBtnTextActive: { color: '#fff' },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  mapPlaceholderTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
  mapPlaceholderSub: { fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 32 },
  mapPlaceholderHint: { fontSize: 12, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 32 },
  listContent: { padding: 12 },
  cardWrapper: { marginBottom: 14 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  resetBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#16a34a',
  },
  resetBtnText: { color: '#16a34a', fontWeight: '600' },
})
