'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth.store'

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')

  useEffect(() => {
    if (!accessToken) {
      // Redirect to auth with next pointing back here
      router.replace(`/auth?next=/business/team/accept/${params.token}`)
      return
    }
    if (status !== 'idle') return

    setStatus('loading')
    api
      .post(`/business/team/accept-invite/${params.token}`)
      .then(() => setStatus('success'))
      .catch((err: any) => {
        setErrorMsg(err?.response?.data?.message ?? 'Не удалось принять приглашение')
        setStatus('error')
      })
  }, [accessToken, params.token, status, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-10 max-w-md w-full text-center space-y-5 shadow-sm">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-brand-600 mx-auto animate-spin" />
            <p className="text-gray-600">Принимаем приглашение…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
            <h1 className="text-xl font-bold text-gray-900">Вы вступили в команду!</h1>
            <p className="text-gray-500 text-sm">
              Приглашение успешно принято. Теперь вы являетесь участником команды.
            </p>
            <Button fullWidth onClick={() => router.replace('/my/profile')}>
              В профиль
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-14 h-14 text-red-400 mx-auto" />
            <h1 className="text-xl font-bold text-gray-900">Не удалось принять приглашение</h1>
            <p className="text-red-500 text-sm">{errorMsg}</p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => router.replace('/')}>
                На главную
              </Button>
              <Button fullWidth onClick={() => setStatus('idle')}>
                Повторить
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
