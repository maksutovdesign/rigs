/** Typed Socket.io event contracts for the /chat namespace. */

export interface MessagePayload {
  id: string
  conversationId: string
  senderId: string
  text?: string | null
  mediaUrl?: string | null
  isRead: boolean
  createdAt: Date | string
  sender: {
    id: string
    firstName: string | null
    avatarUrl: string | null
  }
}

export interface TypingPayload {
  conversationId: string
  userId: string
  isTyping: boolean
}

export interface MessagesReadPayload {
  conversationId: string
  by: string
}

// Events the server sends to clients
export interface ServerToClientEvents {
  new_message: (message: MessagePayload) => void
  user_typing: (payload: TypingPayload) => void
  messages_read: (payload: MessagesReadPayload) => void
}

// Events clients send to the server
export interface ClientToServerEvents {
  join_conversation: (data: { conversationId: string }) => void
  send_message: (data: { conversationId: string; text?: string; mediaUrl?: string }) => void
  mark_read: (data: { conversationId: string }) => void
  typing: (data: { conversationId: string; isTyping: boolean }) => void
}
