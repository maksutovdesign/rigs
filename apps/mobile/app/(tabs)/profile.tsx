import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as SecureStore from 'expo-secure-store'
import * as ImagePicker from 'expo-image-picker'
import { api } from '../../lib/api'
import {
  ShoppingBag,
  Package,
  Heart,
  MessageCircle,
  Bell,
  LogOut,
  ChevronRight,
} from 'lucide-react-native'
import { maskPhone } from '@rigs/utils'
import { KycLevel } from '@rigs/types'
import { useAuthStore } from '../../store/auth.store'
import { useCurrentUser } from '../../hooks/use-auth'
import { Avatar } from '../../components/ui/avatar'
import { Badge } from '../../components/ui/badge'
import { StarRating } from '../../components/ui/star-rating'

function kycLabel(level: KycLevel): string {
  const map: Record<KycLevel, string> = {
    [KycLevel.NONE]: 'Не верифицирован',
    [KycLevel.PHONE]: 'Телефон подтверждён',
    [KycLevel.PASSPORT]: 'Паспорт подтверждён',
    [KycLevel.FULL]: 'Полная верификация',
  }
  return map[level] ?? level
}

function kycVariant(level: KycLevel) {
  if (level === KycLevel.FULL || level === KycLevel.PASSPORT) return 'success' as const
  if (level === KycLevel.PHONE) return 'info' as const
  return 'default' as const
}

export default function ProfileScreen() {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { isLoading } = useCurrentUser()

  const fullName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Пользователь' : ''

  async function handleAvatarEdit() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Нет доступа', 'Разрешите доступ к галерее в настройках')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    })
    if (result.canceled) return
    const uri = result.assets[0].uri
    const filename = uri.split('/').pop() ?? 'avatar.jpg'
    const formData = new FormData()
    // React Native 0.81: blob-like object for multipart upload
    formData.append('file', { uri, name: filename, type: 'image/jpeg' } as unknown as Blob)
    try {
      const { data: updated } = await api.patch<{ avatarUrl: string }>('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      useAuthStore.getState().setUser({ ...useAuthStore.getState().user!, avatarUrl: updated.avatarUrl })
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить фото')
    }
  }

  function handleLogout() {
    Alert.alert('Выйти из аккаунта?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('access_token')
          await SecureStore.deleteItemAsync('refresh_token')
          logout()
        },
      },
    ])
  }

  if (isLoading && !user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.guestContainer}>
          <Text style={styles.guestTitle}>Добро пожаловать в Rigs</Text>
          <Text style={styles.guestSubtitle}>
            Войдите, чтобы бронировать снаряжение и создавать объявления
          </Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.loginBtnText}>Войти</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const menuItems = [
    { icon: ShoppingBag, label: 'Мои аренды', onPress: () => router.push('/rentals') },
    { icon: Package, label: 'Мои объявления', onPress: () => router.push('/host/listings') },
    { icon: Heart, label: 'Избранное', onPress: () => router.push('/wishlist') },
    { icon: MessageCircle, label: 'Сообщения', onPress: () => router.push('/(tabs)/messages') },
    { icon: Bell, label: 'Уведомления', onPress: () => router.push('/notifications') },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Профиль</Text>
        </View>

        {/* Avatar + info */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <Avatar uri={user.avatarUrl} name={fullName} size="xl" />
            <TouchableOpacity style={styles.avatarEditBtn} onPress={handleAvatarEdit}>
              <Text style={styles.avatarEditIcon}>✏️</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fullName}>{fullName}</Text>
          <Text style={styles.phone}>{maskPhone(user.phone)}</Text>
          {user.email && <Text style={styles.email}>{user.email}</Text>}
        </View>

        {/* Ratings */}
        <View style={styles.ratingsCard}>
          <View style={styles.ratingItem}>
            <Text style={styles.ratingLabel}>Как арендатор</Text>
            {user.ratingAsRenter ? (
              <>
                <StarRating rating={user.ratingAsRenter} size={14} />
                <Text style={styles.ratingValue}>{user.ratingAsRenter.toFixed(1)}</Text>
              </>
            ) : (
              <Text style={styles.ratingEmpty}>—</Text>
            )}
          </View>
          <View style={styles.ratingDivider} />
          <View style={styles.ratingItem}>
            <Text style={styles.ratingLabel}>Как хост</Text>
            {user.ratingAsHost ? (
              <>
                <StarRating rating={user.ratingAsHost} size={14} />
                <Text style={styles.ratingValue}>{user.ratingAsHost.toFixed(1)}</Text>
              </>
            ) : (
              <Text style={styles.ratingEmpty}>—</Text>
            )}
          </View>
        </View>

        {/* KYC badge */}
        <View style={styles.kycSection}>
          <Badge label={kycLabel(user.kycLevel)} variant={kycVariant(user.kycLevel)} />
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <item.icon size={20} color="#374151" />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <ChevronRight size={18} color="#d1d5db" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color="#ef4444" />
          <Text style={styles.logoutText}>Выйти</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  guestTitle: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center' },
  guestSubtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  loginBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 14,
    paddingHorizontal: 48,
    paddingVertical: 15,
    marginTop: 8,
  },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#f9fafb',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  avatarWrapper: { position: 'relative', marginBottom: 8 },
  avatarEditBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  avatarEditIcon: { fontSize: 14 },
  fullName: { fontSize: 20, fontWeight: '700', color: '#111827' },
  phone: { fontSize: 14, color: '#6b7280' },
  email: { fontSize: 14, color: '#6b7280' },
  ratingsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginTop: 12,
    borderRadius: 14,
    marginHorizontal: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  ratingItem: { flex: 1, alignItems: 'center', gap: 6 },
  ratingLabel: { fontSize: 12, color: '#6b7280' },
  ratingValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  ratingEmpty: { fontSize: 15, color: '#d1d5db' },
  ratingDivider: { width: 1, backgroundColor: '#e5e7eb' },
  kycSection: { paddingHorizontal: 16, paddingVertical: 12 },
  menu: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuLabel: { flex: 1, fontSize: 15, color: '#111827' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: { fontSize: 15, color: '#ef4444', fontWeight: '600' },
})
