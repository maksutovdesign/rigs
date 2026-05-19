import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { useSendOtp, useVerifyOtp } from '@/hooks/use-auth'

export default function AuthScreen() {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [serverError, setServerError] = useState<string | null>(null)

  const sendOtp = useSendOtp()
  const verifyOtp = useVerifyOtp()

  // ── Normalize phone to E.164 (+7XXXXXXXXXX) ──────────────────────────
  function normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '')
    if (digits.startsWith('8') && digits.length === 11) {
      return '+7' + digits.slice(1)
    }
    if (digits.startsWith('7') && digits.length === 11) {
      return '+' + digits
    }
    if (digits.length === 10) {
      return '+7' + digits
    }
    return '+' + digits
  }

  async function handleSendCode() {
    setServerError(null)
    const normalized = normalizePhone(phone)
    sendOtp.mutate(
      { phone: normalized },
      {
        onSuccess: () => {
          setPhone(normalized)
          setStep('otp')
        },
        onError: (err: Error) => {
          setServerError(err.message ?? 'Не удалось отправить код')
        },
      },
    )
  }

  async function handleVerify() {
    setServerError(null)
    verifyOtp.mutate(
      { phone, code },
      {
        onError: (err: Error) => {
          setServerError(err.message ?? 'Неверный код')
        },
      },
    )
  }

  const isSending = sendOtp.isPending
  const isVerifying = verifyOtp.isPending

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        {/* Logo */}
        <Text style={styles.logo}>Rigs</Text>

        {/* Title */}
        <Text style={styles.title}>
          {step === 'phone' ? 'Введи номер телефона' : 'Введи код из SMS'}
        </Text>

        {/* Server error */}
        {serverError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{serverError}</Text>
          </View>
        )}

        {step === 'phone' ? (
          <>
            <TextInput
              value={phone}
              onChangeText={(t) => {
                setPhone(t)
                setServerError(null)
              }}
              placeholder="+7 (999) 123-45-67"
              keyboardType="phone-pad"
              style={styles.input}
              editable={!isSending}
              returnKeyType="done"
              onSubmitEditing={handleSendCode}
            />
            <TouchableOpacity
              style={[styles.btn, isSending && styles.btnDisabled]}
              onPress={handleSendCode}
              disabled={isSending || phone.length < 10}
              activeOpacity={0.8}
            >
              {isSending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Получить код</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Нажимая «Получить код», вы соглашаетесь с{' '}
              <Text style={styles.link}>условиями использования</Text>
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.hint}>
              Код отправлен на{' '}
              <Text style={styles.hintPhone}>{phone}</Text>
            </Text>

            <TextInput
              value={code}
              onChangeText={(t) => {
                setCode(t.replace(/\D/g, ''))
                setServerError(null)
                // Auto-submit on 6 digits
                if (t.replace(/\D/g, '').length === 6 && !isVerifying) {
                  verifyOtp.mutate(
                    { phone, code: t.replace(/\D/g, '') },
                    { onError: (err: Error) => setServerError(err.message ?? 'Неверный код') },
                  )
                }
              }}
              placeholder="• • • • • •"
              keyboardType="number-pad"
              maxLength={6}
              style={[styles.input, styles.otpInput]}
              editable={!isVerifying}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.btn, (isVerifying || code.length < 6) && styles.btnDisabled]}
              onPress={handleVerify}
              disabled={isVerifying || code.length < 6}
              activeOpacity={0.8}
            >
              {isVerifying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Войти</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setStep('phone')
                setCode('')
                setServerError(null)
                sendOtp.reset()
                verifyOtp.reset()
              }}
              disabled={isVerifying}
            >
              <Text style={styles.back}>Изменить номер</Text>
            </TouchableOpacity>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  logo: { fontSize: 36, fontWeight: '700', color: '#16a34a', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 24, color: '#111' },
  hint: { color: '#6b7280', marginBottom: 12, fontSize: 14 },
  hintPhone: { fontWeight: '600', color: '#111' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    color: '#111',
  },
  otpInput: { textAlign: 'center', letterSpacing: 8, fontSize: 24 },
  btn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: '#a7f3c0', },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  back: { marginTop: 16, textAlign: 'center', color: '#16a34a', fontSize: 14 },
  errorBox: {
    backgroundColor: '#fff1f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  errorText: { color: '#e11d48', fontSize: 14 },
  disclaimer: { marginTop: 16, fontSize: 12, color: '#9ca3af', textAlign: 'center' },
  link: { color: '#16a34a', textDecorationLine: 'underline' },
})
