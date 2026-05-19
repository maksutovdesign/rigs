import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isBefore, isAfter,
  format, addMonths, subMonths, getDay,
} from 'date-fns'
import { ru } from 'date-fns/locale'

interface CalendarPickerProps {
  startDate: Date | null
  endDate: Date | null
  minDate?: Date
  /** Called when user taps a day. First tap sets start, second sets end. */
  onRangeChange: (start: Date | null, end: Date | null) => void
  /** ISO strings of blocked dates (unavailable) */
  blockedDates?: string[]
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function CalendarPicker({
  startDate,
  endDate,
  minDate,
  onRangeChange,
  blockedDates = [],
}: CalendarPickerProps) {
  const [viewMonth, setViewMonth] = useState(startDate ?? new Date())

  const blocked = new Set(blockedDates.map((d) => format(new Date(d), 'yyyy-MM-dd')))
  const today = new Date()
  const min = minDate ?? today

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Pad start so week begins on Monday (getDay: 0=Sun,1=Mon…)
  const startPad = (getDay(monthStart) + 6) % 7

  function handleDayPress(day: Date) {
    if (isBefore(day, min)) return
    if (blocked.has(format(day, 'yyyy-MM-dd'))) return

    if (!startDate || (startDate && endDate)) {
      // Start fresh
      onRangeChange(day, null)
    } else {
      // Second tap
      if (isBefore(day, startDate)) {
        onRangeChange(day, null)
      } else {
        onRangeChange(startDate, day)
      }
    }
  }

  function dayState(day: Date): 'start' | 'end' | 'in-range' | 'blocked' | 'past' | 'normal' {
    if (isBefore(day, min)) return 'past'
    if (blocked.has(format(day, 'yyyy-MM-dd'))) return 'blocked'
    if (startDate && isSameDay(day, startDate)) return 'start'
    if (endDate && isSameDay(day, endDate)) return 'end'
    if (startDate && endDate && isAfter(day, startDate) && isBefore(day, endDate)) return 'in-range'
    return 'normal'
  }

  return (
    <View style={styles.container}>
      {/* Month navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setViewMonth((m) => subMonths(m, 1))} style={styles.navBtn}>
          <ChevronLeft size={18} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {format(viewMonth, 'LLLL yyyy', { locale: ru })}
        </Text>
        <TouchableOpacity onPress={() => setViewMonth((m) => addMonths(m, 1))} style={styles.navBtn}>
          <ChevronRight size={18} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={styles.weekDay}>{d}</Text>
        ))}
      </View>

      {/* Days grid */}
      <View style={styles.grid}>
        {Array.from({ length: startPad }).map((_, i) => (
          <View key={`pad-${i}`} style={styles.cell} />
        ))}
        {days.map((day) => {
          const state = dayState(day)
          const isDisabled = state === 'past' || state === 'blocked'
          return (
            <TouchableOpacity
              key={day.toISOString()}
              style={[
                styles.cell,
                state === 'start' && styles.cellStart,
                state === 'end' && styles.cellEnd,
                state === 'in-range' && styles.cellInRange,
                isDisabled && styles.cellDisabled,
              ]}
              onPress={() => handleDayPress(day)}
              disabled={isDisabled}
            >
              <Text
                style={[
                  styles.dayText,
                  (state === 'start' || state === 'end') && styles.dayTextSelected,
                  isDisabled && styles.dayTextDisabled,
                ]}
              >
                {format(day, 'd')}
              </Text>
              {state === 'blocked' && <View style={styles.blockedDot} />}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 16, padding: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 15, fontWeight: '600', color: '#111827', textTransform: 'capitalize' },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  cellStart: { backgroundColor: '#16a34a', borderRadius: 8 },
  cellEnd: { backgroundColor: '#16a34a', borderRadius: 8 },
  cellInRange: { backgroundColor: '#dcfce7', borderRadius: 4 },
  cellDisabled: { opacity: 0.35 },
  dayText: { fontSize: 13, color: '#111827' },
  dayTextSelected: { color: '#fff', fontWeight: '700' },
  dayTextDisabled: { color: '#9ca3af' },
  blockedDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ef4444',
  },
})
