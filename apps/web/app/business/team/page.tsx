'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/store/auth.store'
import { useTeam, useInviteMember, useRemoveMember } from '@/hooks/use-business'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { BadgeVariant } from '@/components/ui/badge'

type TeamMemberRole = 'owner' | 'manager' | 'staff'
type TeamMemberStatus = 'pending' | 'active' | 'removed'

interface InviteForm {
  email: string
  role: TeamMemberRole
}

const ROLE_LABEL: Record<TeamMemberRole, string> = {
  owner: 'Владелец',
  manager: 'Менеджер',
  staff: 'Сотрудник',
}

const ROLE_BADGE_VARIANT: Record<TeamMemberRole, BadgeVariant> = {
  owner: 'success',
  manager: 'info',
  staff: 'default',
}

const STATUS_LABEL: Record<TeamMemberStatus, string> = {
  pending: 'Ожидает',
  active: 'Активен',
  removed: 'Удалён',
}

const STATUS_BADGE_VARIANT: Record<TeamMemberStatus, BadgeVariant> = {
  pending: 'warning',
  active: 'success',
  removed: 'default',
}

function getInitials(firstName?: string | null, lastName?: string | null, email?: string | null) {
  if (firstName && lastName) return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  if (firstName) return firstName.charAt(0).toUpperCase()
  if (email) return email.charAt(0).toUpperCase()
  return '?'
}

export default function BusinessTeamPage() {
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { data: team, isLoading } = useTeam()
  const inviteMember = useInviteMember()
  const removeMember = useRemoveMember()
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteForm>({
    defaultValues: { email: '', role: 'staff' },
  })

  useEffect(() => {
    if (!accessToken) router.replace('/auth')
  }, [accessToken, router])

  if (!accessToken) return null

  const activeMembers =
    (team as unknown as Array<{
      id: string
      email?: string | null
      firstName?: string | null
      lastName?: string | null
      role?: string
      status?: string
      inviteToken?: string | null
    }>)?.filter((m) => m.status !== 'removed') ?? []

  async function onInvite(values: InviteForm) {
    await inviteMember.mutateAsync(values as unknown as import('@rigs/types').InviteTeamMemberDto)
    reset()
  }

  function handleCopyLink(token: string) {
    const link = `${window.location.origin}/business/team/accept/${token}`
    navigator.clipboard.writeText(link).then(() => {
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 2000)
    })
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Команда
              {!isLoading && activeMembers.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  {activeMembers.length}{' '}
                  {activeMembers.length === 1
                    ? 'участник'
                    : activeMembers.length < 5
                    ? 'участника'
                    : 'участников'}
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Управляйте доступом сотрудников</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => router.push('/business')}>
            ← Назад
          </Button>
        </div>

        {/* Invite form */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Пригласить участника</h2>
          <form onSubmit={handleSubmit(onInvite)} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                fullWidth
                placeholder="email@company.ru"
                type="email"
                {...register('email', {
                  required: 'Укажите email',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Некорректный email',
                  },
                })}
                error={errors.email?.message}
              />
            </div>
            <div className="w-full sm:w-44">
              <select
                className="h-10 w-full rounded-xl border border-gray-300 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
                {...register('role')}
              >
                <option value="staff">Сотрудник</option>
                <option value="manager">Менеджер</option>
              </select>
            </div>
            <Button type="submit" loading={inviteMember.isPending} className="shrink-0">
              Пригласить
            </Button>
          </form>
        </div>

        {/* Members list */}
        <div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-neutral-100 p-4 h-16 animate-pulse" />
              ))}
            </div>
          ) : activeMembers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-100 p-10 text-center">
              <div className="w-12 h-12 rounded-full bg-neutral-100 mx-auto mb-3 flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
              <p className="text-gray-500 font-medium">Вы единственный участник</p>
              <p className="text-xs text-gray-400 mt-1">
                Пригласите коллег для совместной работы
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeMembers.map((member) => {
                const role = (member.role ?? 'staff') as TeamMemberRole
                const status = (member.status ?? 'active') as TeamMemberStatus
                const displayName =
                  [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email || 'Участник'
                const initials = getInitials(member.firstName, member.lastName, member.email)
                return (
                  <div
                    key={member.id}
                    className="bg-white rounded-2xl border border-neutral-100 p-4 flex items-center gap-4"
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                      <span className="text-brand-700 text-sm font-bold">{initials}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                      {member.email && displayName !== member.email && (
                        <p className="text-xs text-gray-400 truncate">{member.email}</p>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={ROLE_BADGE_VARIANT[role]}>
                        {ROLE_LABEL[role] ?? role}
                      </Badge>
                      <Badge variant={STATUS_BADGE_VARIANT[status]}>
                        {STATUS_LABEL[status] ?? status}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {status === 'pending' && member.inviteToken && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyLink(member.inviteToken!)}
                        >
                          {copiedToken === member.inviteToken ? 'Скопировано ✓' : 'Копировать ссылку'}
                        </Button>
                      )}
                      {role !== 'owner' && (
                        <Button
                          variant="danger"
                          size="sm"
                          loading={removeMember.isPending}
                          onClick={() => removeMember.mutate(member.id)}
                        >
                          Удалить
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
