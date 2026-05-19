import { View, Text, StyleSheet } from 'react-native'

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: '#dcfce7', text: '#16a34a' },
  warning: { bg: '#fef9c3', text: '#ca8a04' },
  danger: { bg: '#fee2e2', text: '#dc2626' },
  info: { bg: '#dbeafe', text: '#2563eb' },
  default: { bg: '#f3f4f6', text: '#6b7280' },
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const colors = VARIANT_STYLES[variant]
  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
})
