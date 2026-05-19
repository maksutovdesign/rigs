'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Send } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'
import { getChatSocket, disconnectChatSocket } from '@/lib/socket'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Conversation, Message } from '@rigs/types'
import { formatDateShort } from '@rigs/utils'
import { cn } from '@/lib/utils'

function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await api.get<Conversation[]>('/conversations')
      return data
    },
  })
}

function useMessages(conversationId: string | null) {
  return useQuery<Message[]>({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data } = await api.get<Message[]>(`/conversations/${conversationId}/messages`)
      return data
    },
    enabled: !!conversationId,
  })
}

export default function MessagesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: conversations, isLoading: convsLoading } = useConversations()
  const { data: messages, isLoading: msgsLoading } = useMessages(activeConvId)

  // ─── Redirect if unauthenticated ─────────────────────────────────────────

  useEffect(() => {
    if (!accessToken) router.replace('/auth')
  }, [accessToken, router])

  // ─── Auto-open from URL param ────────────────────────────────────────────

  useEffect(() => {
    const convId = searchParams.get('conversationId')
    if (convId) setActiveConvId(convId)
  }, [searchParams])

  // ─── WebSocket setup ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!accessToken) return

    const socket = getChatSocket(accessToken)

    socket.on('new_message', (msg: Message) => {
      // Prepend/append message to the cached messages list
      queryClient.setQueryData<Message[]>(['messages', msg.conversationId], (prev = []) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      // Update conversation list preview
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    })

    socket.on('messages_read', ({ conversationId }: { conversationId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    })

    socket.on('user_typing', ({ conversationId, userId, isTyping }: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (conversationId !== activeConvId) return
      setTypingUsers((prev) => {
        const next = new Set(prev)
        isTyping ? next.add(userId) : next.delete(userId)
        return next
      })
    })

    return () => {
      socket.off('new_message')
      socket.off('messages_read')
      socket.off('user_typing')
    }
  }, [accessToken, queryClient, activeConvId])

  // ─── Join conversation room when it changes ───────────────────────────────

  useEffect(() => {
    if (!accessToken || !activeConvId) return
    const socket = getChatSocket(accessToken)
    socket.emit('join_conversation', { conversationId: activeConvId })
    socket.emit('mark_read', { conversationId: activeConvId })
    setTypingUsers(new Set())
  }, [accessToken, activeConvId])

  // ─── Scroll to bottom on new messages ────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── Cleanup socket on unmount ────────────────────────────────────────────

  useEffect(() => {
    return () => {
      disconnectChatSocket()
    }
  }, [])

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleTyping = useCallback(() => {
    if (!accessToken || !activeConvId) return
    const socket = getChatSocket(accessToken)
    socket.emit('typing', { conversationId: activeConvId, isTyping: true })
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      socket.emit('typing', { conversationId: activeConvId, isTyping: false })
    }, 2000)
  }, [accessToken, activeConvId])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !activeConvId || !accessToken) return

    const msg = text.trim()
    setText('')
    setIsSending(true)

    try {
      const socket = getChatSocket(accessToken)
      socket.emit('send_message', { conversationId: activeConvId, text: msg })
    } finally {
      setIsSending(false)
    }
  }

  const activeConv = conversations?.find((c) => c.id === activeConvId)

  if (!accessToken) return null

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Conversation list */}
      <aside className={cn(
        'w-full md:w-80 shrink-0 bg-white border-r border-gray-200 flex-col',
        mobileChatOpen ? 'hidden md:flex' : 'flex',
      )}>
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">Сообщения</h1>
        </div>
        {convsLoading ? (
          <div className="space-y-3 p-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : conversations?.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-4 text-center">
            Нет переписок
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            {conversations?.map((conv) => {
              const other = conv.otherParticipant
              const name = [other?.firstName, other?.lastName].filter(Boolean).join(' ') || 'Пользователь'
              return (
                <button
                  key={conv.id}
                  onClick={() => { setActiveConvId(conv.id); setMobileChatOpen(true) }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left',
                    activeConvId === conv.id && 'bg-brand-50 border-r-2 border-brand-600',
                  )}
                >
                  {other?.avatarUrl ? (
                    <Image
                      src={other.avatarUrl}
                      alt={name}
                      width={40}
                      height={40}
                      className="rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-400 shrink-0">
                      {name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 truncate">{name}</span>
                      {conv.lastMessageAt && (
                        <span className="text-xs text-gray-400 shrink-0 ml-1">
                          {formatDateShort(conv.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {conv.lastMessage?.text ?? 'Нет сообщений'}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="w-5 h-5 bg-brand-600 text-white text-xs rounded-full flex items-center justify-center shrink-0">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </aside>

      {/* Message thread */}
      <main className={cn(
        'flex-col min-w-0 flex-1',
        !mobileChatOpen ? 'hidden md:flex' : 'flex',
      )}>
        {activeConvId ? (
          <>
            {/* Thread header */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
              <button
                onClick={() => { setMobileChatOpen(false); setActiveConvId(null) }}
                className="md:hidden flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 transition-colors shrink-0"
              >
                ← Назад
              </button>
              {activeConv?.otherParticipant?.avatarUrl ? (
                <Image
                  src={activeConv.otherParticipant.avatarUrl}
                  alt=""
                  width={36}
                  height={36}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-400">
                  {[activeConv?.otherParticipant?.firstName, activeConv?.otherParticipant?.lastName]
                    .filter(Boolean).join(' ')[0]?.toUpperCase() ?? 'П'}
                </div>
              )}
              <div>
                <span className="font-medium text-gray-900">
                  {[activeConv?.otherParticipant?.firstName, activeConv?.otherParticipant?.lastName]
                    .filter(Boolean).join(' ') || 'Пользователь'}
                </span>
                {typingUsers.size > 0 && (
                  <p className="text-xs text-gray-400 animate-pulse">печатает…</p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {msgsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-10 rounded-2xl animate-pulse',
                        i % 2 === 0 ? 'ml-12 bg-gray-200' : 'mr-12 bg-brand-100',
                      )}
                    />
                  ))}
                </div>
              ) : (
                messages?.map((msg) => {
                  const isOwn = msg.senderId === user?.id
                  return (
                    <div
                      key={msg.id}
                      className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                          isOwn
                            ? 'bg-brand-600 text-white rounded-br-sm'
                            : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm',
                        )}
                      >
                        {msg.text}
                        <span
                          className={cn(
                            'block text-right text-xs mt-1',
                            isOwn ? 'text-brand-200' : 'text-gray-400',
                          )}
                        >
                          {formatDateShort(msg.createdAt)}
                          {isOwn && (
                            <span className="ml-1">{msg.isRead ? '✓✓' : '✓'}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
              <input
                type="text"
                value={text}
                onChange={(e) => { setText(e.target.value); handleTyping() }}
                placeholder="Написать сообщение..."
                className="flex-1 h-10 border border-gray-300 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="submit"
                disabled={!text.trim() || isSending}
                className="w-10 h-10 bg-brand-600 text-white rounded-xl flex items-center justify-center hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-lg font-medium text-gray-500">Выберите переписку</p>
              <p className="text-sm mt-1">или начните новую из страницы объявления</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
