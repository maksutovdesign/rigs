import { Controller, Get, Post, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { MessagesService } from './messages.service'
import { CreateConversationDto } from './dto/create-conversation.dto'
import { SendMessageDto } from './dto/send-message.dto'

@ApiTags('Messages')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Список диалогов' })
  getConversations(@Request() req: any) {
    return this.messagesService.getConversations(req.user.id)
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Начать диалог' })
  createConversation(@Request() req: any, @Body() dto: CreateConversationDto) {
    return this.messagesService.createOrGetConversation(req.user.id, dto)
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Сообщения диалога' })
  getMessages(@Request() req: any, @Param('id') id: string) {
    return this.messagesService.getMessages(req.user.id, id)
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Отправить сообщение' })
  sendMessage(@Request() req: any, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.messagesService.sendMessage(req.user.id, id, dto)
  }

  @Post('conversations/:id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Пометить сообщения как прочитанные' })
  markRead(@Request() req: any, @Param('id') id: string) {
    return this.messagesService.markRead(req.user.id, id)
  }

  @Get('messages/unread-count')
  @ApiOperation({ summary: 'Количество непрочитанных сообщений' })
  unreadCount(@Request() req: any) {
    return this.messagesService.unreadCount(req.user.id)
  }
}
