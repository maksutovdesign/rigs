import { Injectable, NotFoundException, ForbiddenException, Optional } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateConversationDto } from './dto/create-conversation.dto'
import { SendMessageDto } from './dto/send-message.dto'
import { ChatGateway } from '../chat/chat.gateway'

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    // Optional: ChatGateway is not available during unit tests that don't import ChatModule
    @Optional() private readonly chatGateway: ChatGateway | null,
  ) {}

  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ participant1Id: userId }, { participant2Id: userId }] },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        participant1: { select: { id: true, firstName: true, avatarUrl: true } },
        participant2: { select: { id: true, firstName: true, avatarUrl: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
    })

    // Attach unreadCount per conversation
    const withUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await this.prisma.message.count({
          where: { conversationId: conv.id, isRead: false, senderId: { not: userId } },
        })
        return { ...conv, unreadCount }
      }),
    )

    return withUnread
  }

  async createOrGetConversation(userId: string, dto: CreateConversationDto) {
    const otherUserId = dto.participantId

    const existing = await this.prisma.conversation.findFirst({
      where: {
        OR: [
          { participant1Id: userId, participant2Id: otherUserId },
          { participant1Id: otherUserId, participant2Id: userId },
        ],
        ...(dto.bookingId && { bookingId: dto.bookingId }),
      },
    })

    if (existing) return existing

    return this.prisma.conversation.create({
      data: {
        participant1Id: userId,
        participant2Id: otherUserId,
        bookingId: dto.bookingId,
        listingId: dto.listingId,
      },
    })
  }

  async getMessages(userId: string, conversationId: string) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } })
    if (!conv) throw new NotFoundException()
    if (conv.participant1Id !== userId && conv.participant2Id !== userId) {
      throw new ForbiddenException()
    }

    return this.prisma.message.findMany({
      where: { conversationId },
      include: { sender: { select: { id: true, firstName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    })
  }

  async markRead(userId: string, conversationId: string) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } })
    if (!conv) throw new NotFoundException()
    if (conv.participant1Id !== userId && conv.participant2Id !== userId) {
      throw new ForbiddenException()
    }

    await this.prisma.message.updateMany({
      where: { conversationId, isRead: false, senderId: { not: userId } },
      data: { isRead: true },
    })
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.message.count({
      where: {
        isRead: false,
        senderId: { not: userId },
        conversation: { OR: [{ participant1Id: userId }, { participant2Id: userId }] },
      },
    })
    return { count }
  }

  async sendMessage(userId: string, conversationId: string, dto: SendMessageDto) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } })
    if (!conv) throw new NotFoundException()
    if (conv.participant1Id !== userId && conv.participant2Id !== userId) {
      throw new ForbiddenException()
    }

    const message = await this.prisma.message.create({
      data: { conversationId, senderId: userId, text: dto.text, mediaUrl: dto.mediaUrl },
      include: { sender: { select: { id: true, firstName: true, avatarUrl: true } } },
    })

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: message.createdAt },
    })

    // Fan out via WebSocket for clients that use REST instead of WS
    this.chatGateway?.emitNewMessage(conversationId, message)

    return message
  }
}
