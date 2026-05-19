import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import * as Location from 'expo-location'
import { FlashList } from '@shopify/flash-list'
import { MapPin } from 'lucide-react-native'
import type { Listing } from '@rigs/types'
import { useSearchListings } from '../../hooks/use-listings'
import { ListingCard } from '../../components/listings/listing-card'

const QUICK_CATEGORIES = [
  { emoji: '🚤', label: 'Катер', slug: 'water' },
  { emoji: '🏂', label: 'Сноуборд', slug: 'winter' },
  { emoji: '🏍️', label: 'Квадро', slug: 'atv' },
  { emoji: '🛶', label: 'Байдарка', slug: 'water' },
  { emoji: '⛺', label: 'Палатка', slug: 'camping' },
  { emoji: '🎣', label: 'Рыбалка', slug: 'fishing' },
  { emoji: '🚵', label: 'Велик', slug: 'cycling' },
  { emoji: '🪂', label: 'Параплан', slug: 'air' },
]

export default function HomeScreen() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Popular listings
  const { data: popularData, isLoading: popularLoading } = useSearchListings({
    sort: 'popular',
    limit: 10,
  })
  const popularListings = popularData?.items ?? []

  // Nearby listings
  const { data: nearbyData, isLoading: nearbyLoading } = useSearchListings(
    location
      ? { lat: location.lat, lng: location.lng, radius: 50, limit: 10 }
      : undefined,
  )
  const nearbyListings = nearbyData?.items ?? []

  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude })
    })()
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.logo}>Rigs</Text>
        </View>

        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Аренда снаряжения{'\n'}рядом с тобой</Text>
          <TouchableOpacity
            style={styles.searchBar}
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/(tabs)/search', params: { q: '' } })}
          >
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Катер, сноуборд, палатка..."
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={() =>
                router.push({ pathname: '/(tabs)/search', params: { q: query } })
              }
            />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Категории</Text>
          <View style={styles.categoriesGrid}>
            {QUICK_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={`${cat.slug}-${cat.label}`}
                style={styles.categoryCard}
                onPress={() =>
                  router.push({ pathname: '/(tabs)/search', params: { category: cat.slug } })
                }
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Popular */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Популярное</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
              <Text style={styles.seeAll}>Все</Text>
            </TouchableOpacity>
          </View>

          {popularLoading ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {Array.from({ length: 3 }).map((_, i) => (
                <View key={i} style={styles.popularCardWrapper}>
                  <ListingCard skeleton />
                </View>
              ))}
            </ScrollView>
          ) : popularListings.length === 0 ? (
            <Text style={styles.placeholder}>Нет объявлений</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalListContent}
            >
              {popularListings.map((item: Listing) => (
                <View key={item.id} style={styles.popularCardWrapper}>
                  <ListingCard listing={item} />
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Nearby */}
        {(location || nearbyLoading) && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.nearbyTitleRow}>
                <MapPin size={16} color="#16a34a" />
                <Text style={styles.sectionTitle}>Рядом с тобой</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
                <Text style={styles.seeAll}>Все</Text>
              </TouchableOpacity>
            </View>

            {nearbyLoading ? (
              <ActivityIndicator color="#16a34a" />
            ) : nearbyListings.length === 0 ? (
              <Text style={styles.placeholder}>Нет объявлений рядом</Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalListContent}
              >
                {nearbyListings.map((item: Listing) => (
                  <View key={item.id} style={styles.popularCardWrapper}>
                    <ListingCard listing={item} />
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 16, paddingTop: 8 },
  logo: { fontSize: 24, fontWeight: '700', color: '#16a34a' },
  heroSection: { backgroundColor: '#16a34a', padding: 24, marginTop: 8 },
  heroTitle: { fontSize: 26, fontWeight: '700', color: '#fff', lineHeight: 34 },
  searchBar: { marginTop: 16, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16 },
  searchInput: { height: 48, fontSize: 15, color: '#111' },
  section: { padding: 16, marginTop: 8 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nearbyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  seeAll: { fontSize: 14, color: '#16a34a', fontWeight: '600' },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryCard: {
    width: '22%',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryEmoji: { fontSize: 24 },
  categoryLabel: { fontSize: 11, marginTop: 4, color: '#374151', textAlign: 'center' },
  horizontalListContent: { gap: 12, paddingRight: 8 },
  popularCardWrapper: { marginRight: 0 },
  placeholder: { color: '#9ca3af', fontSize: 14 },
})
