'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useSendOtp, useVerifyOtp } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  const d = digits.startsWith('7') ? digits.slice(1) : digits
  let result = '+7'
  if (d.length > 0) result += ' (' + d.slice(0, 3)
  if (d.length >= 3) result += ') ' + d.slice(3, 6)
  if (d.length >= 6) result += '-' + d.slice(6, 8)
  if (d.length >= 8) result += '-' + d.slice(8, 10)
  return result
}

function normalizePhone(display: string): string {
  const digits = display.replace(/\D/g, '')
  return digits.startsWith('7') ? `+${digits}` : `+7${digits}`
}

export default function AuthPage() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [phoneDisplay, setPhoneDisplay] = useState('+7 ')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [phoneError, setPhoneError] = useState('')
  const [otpError, setOtpError] = useState('')
  const [countdown, setCountdown] = useState(0)

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Start countdown when step becomes 'otp'
  useEffect(() => {
    if (step === 'otp') {
      setCountdown(60)
    }
  }, [step])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const sendOtp = useSendOtp()
  const verifyOtp = useVerifyOtp()

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    const digits = raw.replace(/\D/g, '')
    const clamped = digits.startsWith('7') ? digits.slice(0, 11) : digits.slice(0, 10)
    setPhoneDisplay(formatPhoneDisplay(clamped.startsWith('7') ? clamped : '7' + clamped))
    setPhone(normalizePhone(clamped))
    setPhoneError('')
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 11) {
      setPhoneError('Введите корректный номер телефона')
      return
    }
    try {
      await sendOtp.mutateAsync({ phone })
      setStep('otp')
    } catch {
      setPhoneError('Ошибка отправки кода. Попробуйте ещё раз.')
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    setOtpError('')
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newOtp = [...otp]
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] ?? ''
    }
    setOtp(newOtp)
    otpRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) {
      setOtpError('Введите все 6 цифр кода')
      return
    }
    try {
      await verifyOtp.mutateAsync({ phone, code })
    } catch {
      setOtpError('Неверный код. Попробуйте ещё раз.')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-3xl font-black text-brand-600 tracking-tight">Rigs</span>
          </Link>
          <p className="mt-1 text-gray-500 text-sm">Аренда снаряжения для активного отдыха</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {step === 'phone' ? (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Вход или регистрация</h1>
              <p className="text-sm text-gray-500 mb-6">
                Введите номер телефона и мы отправим код подтверждения
              </p>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <Input
                  label="Номер телефона"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phoneDisplay}
                  onChange={handlePhoneChange}
                  error={phoneError}
                  fullWidth
                  autoFocus
                />
                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  loading={sendOtp.isPending}
                >
                  Получить код
                </Button>
              </form>
              <p className="mt-4 text-xs text-center text-gray-400">
                Продолжая, вы соглашаетесь с{' '}
                <Link href="/terms" className="text-brand-600 hover:underline">
                  условиями использования
                </Link>{' '}
                и{' '}
                <Link href="/privacy" className="text-brand-600 hover:underline">
                  политикой конфиденциальности
                </Link>
              </p>
            </>
          ) : (
            <>
              <button
                onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setOtpError('') }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Назад
              </button>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Введите код</h1>
              <p className="text-sm text-gray-500 mb-6">
                Код отправлен на номер <strong>{phoneDisplay}</strong>
              </p>
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="flex gap-2 justify-between">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      autoFocus={i === 0}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      className="w-12 h-14 text-center text-xl font-bold border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                    />
                  ))}
                </div>
                {otpError && <p className="text-xs text-red-500 text-center">{otpError}</p>}
                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  loading={verifyOtp.isPending}
                >
                  Подтвердить
                </Button>
                <button
                  type="button"
                  disabled={countdown > 0}
                  onClick={() => {
                    sendOtp.mutate({ phone })
                    setCountdown(60)
                  }}
                  className={cn(
                    'w-full text-sm transition-colors',
                    countdown > 0
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-brand-600 hover:underline',
                  )}
                >
                  {countdown > 0 ? `Отправить снова (${countdown})` : 'Отправить снова'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
