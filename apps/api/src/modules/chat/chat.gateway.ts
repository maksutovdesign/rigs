import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'

interface AuthSocket extends Socket {
  userId: string
  firstName?: string
}

@WebSocketGateway({
  namespace: 'chat',
  cors: { origin: '*', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server
  private readonly logger = new Logger(ChatGateway.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Connection lifecycle ──────────────────────────────────────────────────

  async handleConnection(socket: AuthSocket) {
    try {
      const token =
        (socket.handshake.auth['token'] as string | undefined) ??
        (socket.handshake.query['token'] as string | undefined)

      if (!token) throw new WsException('No token')

      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      })

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
      if (!user || user.status === 'banned') throw new WsException('Unauthorized')

      socket.userId = user.id
      socket.firstName = user.firstName ?? undefined

      // Auto-join rooms for all existing conversations
      const convs = await this.prisma.conversation.findMany({
        where: { OR: [{ participant1Id: user.id }, { participant2Id: user.id }] },
        select: { id: true },
      })
      for (const conv of convs) {
        await socket.join(`conv:${conv.id}`)
      }

      this.logger.log(`Connected: ${user.id} (${convs.length} rooms)`)
    } catch (err: any) {
      this.logger.warn(`WS auth failed: ${err.message}`)
      socket.disconnect(true)
    }
  }

  handleDisconnect(socket: AuthSocket) {
    this.logger.log(`Disconnected: ${socket.userId ?? 'unknown'}`)
  }

  // ─── Events ────────────────────────────────────────────────────────────────

  /** Join a single conversation room (for newly created conversations). */
  @SubscribeMessage('join_conversation')
  async onJoin(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: data.conversationId },
    })
    if (!conv) return

    const isMember =
      conv.participant1Id === socket.userId || conv.participant2Id === socket.userId
    if (!isMember) return

    await socket.join(`conv:${data.conversationId}`)
  }

  /** Send a message — persists to DB, broadcasts to room, triggers push. */
  @SubscribeMessage('send_message')
  async onSendMessage(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { conversationId: string; text?: string; mediaUrl?: string },
  ) {
    const { conversationId, text, mediaUrl } = data
    if (!text?.trim() && !mediaUrl) return

    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    })
    if (!conv) return

    const isMember =
      conv.participant1Id === socket.userId || conv.participant2Id === socket.userId
    if (!isMember) throw new WsException('Not a conversation member')

    const message = await this.prisma.message.create({
      data: { conversationId, senderId: socket.userId, text, mediaUrl },
      include: { sender: { select: { id: true, firstName: true, avatarUrl: true } } },
    })

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: message.createdAt },
    })

    // Broadcast to all members in the room (including sender for echo)
    this.server.to(`conv:${conversationId}`).emit('new_message', message)

    // Push notification to the other participant
    const recipientId =
      conv.participant1Id === socket.userId ? conv.participant2Id : conv.participant1Id

    const senderName = socket.firstName ?? 'Пользователь'
    await this.notifications.notifyNewMessage(recipientId, senderName, conversationId)

    return message
  }

  /** Mark all messages in a conversation as read by the current user. */
  @SubscribeMessage('mark_read')
  async onMarkRead(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await this.prisma.message.updateMany({
      where: {
        conversationId: data.conversationId,
        isRead: false,
        senderId: { not: socket.userId },
      },
      data: { isRead: true },
    })

    // Let the other side know messages were seen
    this.server
      .to(`conv:${data.conversationId}`)
      .emit('messages_read', { conversationId: data.conversationId, by: socket.userId })
  }

  /** Typing indicator — just relay, no DB write. */
  @SubscribeMessage('typing')
  onTyping(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    socket.to(`conv:${data.conversationId}`).emit('user_typing', {
      conversationId: data.conversationId,
      userId: socket.userId,
      isTyping: data.isTyping,
    })
  }

  // ─── Called from REST (MessagesService) ───────────────────────────────────

  emitNewMessage(conversationId: string, message: unknown) {
    this.server.to(`conv:${conversationId}`).emit('new_message', message)
  }
}
