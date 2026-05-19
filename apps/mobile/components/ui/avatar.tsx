import { View, Text, Image, StyleSheet } from 'react-native'

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_MAP: Record<AvatarSize, number> = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
}

const FONT_MAP: Record<AvatarSize, number> = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 32,
}

interface AvatarProps {
  uri?: string
  name?: string
  size?: AvatarSize
}

function getInitials(name?: string): string {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase()
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase()
}

export function Avatar({ uri, name, size = 'md' }: AvatarProps) {
  const dimension = SIZE_MAP[size]
  const fontSize = FONT_MAP[size]

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.base, { width: dimension, height: dimension, borderRadius: dimension / 2 }]}
      />
    )
  }

  return (
    <View
      style={[
        styles.base,
        styles.fallback,
        { width: dimension, height: dimension, borderRadius: dimension / 2 },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  fallback: {
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#16a34a',
    fontWeight: '700',
  },
})
