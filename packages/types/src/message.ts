import { PublicUser } from './user'

export interface Message {
  id: string
  conversationId: string
  senderId: string
  sender?: PublicUser
  text?: string
  mediaUrl?: string
  isRead: boolean
  createdAt: string
}

export interface Conversation {
  id: string
  bookingId?: string
  listingId?: string
  participant1: string
  participant2: string
  otherParticipant?: PublicUser
  lastMessage?: Message
  lastMessageAt?: string
  unreadCount: number
  createdAt: string
}

export interface SendMessageDto {
  conversationId: string
  text?: string
  mediaUrl?: string
}
