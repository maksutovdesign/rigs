import { View, Text, StyleSheet } from 'react-native'
import { formatPrice } from '@rigs/utils'

interface PriceRowProps {
  label: string
  amount: number
  bold?: boolean
  currency?: string
}

export function PriceRow({ label, amount, bold = false, currency = 'RUB' }: PriceRowProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, bold && styles.boldText]}>{label}</Text>
      <Text style={[styles.amount, bold && styles.boldText]}>{formatPrice(amount, currency)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: {
    fontSize: 14,
    color: '#374151',
  },
  amount: {
    fontSize: 14,
    color: '#111827',
  },
  boldText: {
    fontWeight: '700',
    fontSize: 15,
    color: '#111827',
  },
})
