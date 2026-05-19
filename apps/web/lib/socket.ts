import { io, Socket } from 'socket.io-client'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const CHAT_NS = `${API_URL}/chat`

let chatSocket: Socket | null = null

export function getChatSocket(token: string): Socket {
  if (chatSocket?.connected) return chatSocket

  chatSocket = io(CHAT_NS, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  })

  return chatSocket
}

export function disconnectChatSocket() {
  chatSocket?.disconnect()
  chatSocket = null
}
