import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Star } from 'lucide-react-native'

interface StarRatingProps {
  rating: number
  size?: number
  readonly?: boolean
  onRate?: (value: number) => void
}

export function StarRating({ rating, size = 16, readonly = true, onRate }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5]

  return (
    <View style={styles.row}>
      {stars.map((star) => {
        const filled = rating >= star
        const half = !filled && rating >= star - 0.5

        if (readonly) {
          return (
            <Star
              key={star}
              size={size}
              color={filled || half ? '#f59e0b' : '#d1d5db'}
              fill={filled ? '#f59e0b' : half ? 'none' : 'none'}
            />
          )
        }

        return (
          <TouchableOpacity key={star} onPress={() => onRate?.(star)} hitSlop={4}>
            <Star
              size={size}
              color={rating >= star ? '#f59e0b' : '#d1d5db'}
              fill={rating >= star ? '#f59e0b' : 'none'}
            />
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
  },
})
