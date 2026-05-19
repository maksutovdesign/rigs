import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  FlatList,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { api } from '../../lib/api'
import { formatPrice } from '@rigs/utils'
import type { Listing } from '@rigs/types'

function useWishlist() {
  return useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const { data } = await api.get('/users/me/wishlist')
      return data as Listing[]
    },
  })
}

function useRemoveFromWishlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (listingId: string) => {
      await api.delete(`/users/me/wishlist/${listingId}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  })
}

export default function WishlistScreen() {
  const router = useRouter()
  const { data: listings = [], isLoading } = useWishlist()
  const { mutate: removeFromWishlist } = useRemoveFromWishlist()

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Избранное</Text>
        {listings.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{listings.length}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🤍</Text>
          <Text style={styles.emptyTitle}>Здесь появятся понравившиеся объявления</Text>
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => router.push('/(tabs)/search')}
          >
            <Text style={styles.searchBtnText}>Найти снаряжение</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item: Listing) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: { item: Listing }) => {
            const cover = item.media?.find((m) => m.isCover) ?? item.media?.[0]
            const priceDaily = item.priceDaily
            const city = item.city

            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.75}
                onPress={() =>
                  router.push({ pathname: '/listing/[id]', params: { id: item.id } })
                }
              >
                {cover ? (
                  <Image source={{ uri: cover.url }} style={styles.cardImage} />
                ) : (
                  <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                    <Text style={styles.cardImagePlaceholderText}>📷</Text>
                  </View>
                )}
                <View style={styles.cardBody}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {city ? <Text style={styles.cardCity}>{city}</Text> : null}
                    {priceDaily ? (
                      <Text style={styles.cardPrice}>
                        {formatPrice(priceDaily)}/день
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeFromWishlist(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.removeBtnIcon}>❤️</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  countBadge: {
    backgroundColor: '#16a34a',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  emptyIcon: { fontSize: 48, marginBottom: 4 },
  emptyTitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  searchBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 11,
    marginTop: 4,
  },
  searchBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardImage: {
    width: 100,
    height: 75,
  },
  cardImagePlaceholder: {
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImagePlaceholderText: { fontSize: 24 },
  cardBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardInfo: { flex: 1 },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
    lineHeight: 19,
  },
  cardCity: { fontSize: 12, color: '#6b7280', marginBottom: 3 },
  cardPrice: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  removeBtn: { paddingLeft: 8 },
  removeBtnIcon: { fontSize: 20 },
})
