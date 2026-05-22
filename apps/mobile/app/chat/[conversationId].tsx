import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Send } from 'lucide-react-native'
import { format } from 'date-fns'
import { io, Socket } from 'socket.io-client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useAuthStore } from '../../store/auth.store'
import { Avatar } from '../../components/ui/avatar'
import type { Message, Conversation } from '@rigs/types'

const API_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001'

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useConversation(id: string) {
  return useQuery<Conversation>({
    queryKey: ['conversations', id],
    queryFn: async () => {
      const { data } = await api.get<Conversation>(`/conversations/${id}`)
      return data
    },
    enabled: !!id,
  })
}

function useMessages(conversationId: string) {
  return useQuery<Message[]>({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data } = await api.get<Message[]>(`/conversations/${conversationId}/messages`)
      return data
    },
    enabled: !!conversationId,
  })
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>()
  const router = useRouter()
  const { user, accessToken } = useAuthStore()
  const queryClient = useQueryClient()

  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isOtherTyping, setIsOtherTyping] = useState(false)
  const listRef = useRef<FlatList>(null)
  const socketRef = useRef<Socket | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: conversation } = useConversation(conversationId)
  const { data: messages = [], isLoading } = useMessages(conversationId)

  const other = conversation?.otherParticipant
  const otherName = other
    ? [other.firstName, other.lastName].filter(Boolean).join(' ') || 'Пользователь'
    : 'Загрузка...'

  // ─── WebSocket ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!accessToken) return

    const socket = io(`${API_URL}/chat`, {
      auth: { token: accessToken },
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join_conversation', { conversationId })
      socket.emit('mark_read', { conversationId })
    })

    socket.on('new_message', (msg: Message) => {
      queryClient.setQueryData<Message[]>(['messages', msg.conversationId], (prev = []) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    })

    socket.on('user_typing', ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      if (userId !== user?.id) setIsOtherTyping(isTyping)
    })

    socket.on('messages_read', () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [accessToken, conversationId, queryClient, user?.id])

  // ─── Scroll to end on new messages ────────────────────────────────────────

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true })
    }
  }, [messages.length])

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleTyping = useCallback((value: string) => {
    setText(value)
    if (!socketRef.current) return
    socketRef.current.emit('typing', { conversationId, isTyping: true })
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', { conversationId, isTyping: false })
    }, 2000)
    // socketRef and typingTimerRef are intentionally omitted from deps —
    // React guarantees ref objects are stable across renders.
  }, [conversationId])

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || !socketRef.current) return
    setIsSending(true)
    setText('')
    try {
      socketRef.current.emit('send_message', { conversationId, text: trimmed })
    } finally {
      setIsSending(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#111827" />
        </TouchableOpacity>
        <Avatar uri={other?.avatarUrl} name={otherName} size="sm" />
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerName} numberOfLines={1}>{otherName}</Text>
          {isOtherTyping && (
            <Text style={styles.typingLabel}>печатает…</Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#16a34a" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item: Message) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }: { item: Message }) => {
              const isMine = item.senderId === user?.id
              return (
                <View style={[styles.bubbleWrapper, isMine ? styles.bubbleMineWrapper : styles.bubbleTheirsWrapper]}>
                  {!isMine && (
                    <Avatar
                      uri={item.sender?.avatarUrl}
                      name={[item.sender?.firstName, item.sender?.lastName].filter(Boolean).join(' ')}
                      size="sm"
                    />
                  )}
                  <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    {item.text ? (
                      <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
                        {item.text}
                      </Text>
                    ) : null}
                    <Text style={[styles.bubbleTime, isMine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs]}>
                      {format(new Date(item.createdAt), 'HH:mm')}
                      {isMine ? (item.isRead ? ' ✓✓' : ' ✓') : ''}
                    </Text>
                  </View>
                </View>
              )
            }}
          />
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            value={text}
            onChangeText={handleTyping}
            placeholder="Сообщение..."
            style={styles.textInput}
            multiline
            maxLength={1000}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || isSending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTextBlock: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  typingLabel: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  messagesList: { padding: 16, gap: 10, flexGrow: 1 },
  bubbleWrapper: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  bubbleMineWrapper: { justifyContent: 'flex-end' },
  bubbleTheirsWrapper: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  bubbleMine: { backgroundColor: '#16a34a', borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: '#f3f4f6', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextMine: { color: '#fff' },
  bubbleTextTheirs: { color: '#111827' },
  bubbleTime: { fontSize: 10, alignSelf: 'flex-end' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.7)' },
  bubbleTimeTheirs: { color: '#9ca3af' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  sendBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
})
