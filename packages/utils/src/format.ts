export function maskPhone(phone: string): string {
  return phone.replace(/(\+\d{1,3})\d+(\d{2})$/, '$1*****$2')
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

export function generateOtp(length = 6): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('')
}

export function generateCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/**
 * Russian pluralization helper.
 *
 *   plural(1, ['день', 'дня', 'дней'])  // 'день'
 *   plural(2, ['день', 'дня', 'дней'])  // 'дня'
 *   plural(5, ['день', 'дня', 'дней'])  // 'дней'
 *   plural(11, ['день', 'дня', 'дней']) // 'дней'  (11–14 is the tricky case)
 *   plural(22, ['день', 'дня', 'дней']) // 'дня'
 */
export function plural(
  n: number,
  forms: [string, string, string],
): string {
  const abs = Math.abs(n) % 100
  const tens = abs % 10
  if (abs > 10 && abs < 20) return forms[2]
  if (tens > 1 && tens < 5) return forms[1]
  if (tens === 1) return forms[0]
  return forms[2]
}

