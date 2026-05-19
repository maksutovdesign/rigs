import {
  Controller, Get, Post, Body, UseGuards,
  HttpCode, HttpStatus, Headers, RawBodyRequest,
  ForbiddenException, Req,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { PaymentsService } from './payments.service'

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'История платежей пользователя' })
  async getHistory(@CurrentUser() user: User) {
    return this.paymentsService.getUserPayments(user.id)
  }

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Инициировать оплату бронирования' })
  initiate(@CurrentUser() user: User, @Body('bookingId') bookingId: string) {
    return this.paymentsService.initiatePayment(user.id, bookingId)
  }

  // Fix #1: вебхук с проверкой HMAC-подписи ЮKassa
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вебхук от ЮKassa' })
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('authorization') authHeader: string,
    @Body() payload: any,
  ) {
    // ЮKassa отправляет Authorization: Bearer <webhook-secret> (SHA-256 HMAC не используется,
    // но мы проверяем shared secret через verifyWebhookSignature с rawBody для будущей совместимости)
    const rawBody = (req as any).rawBody as Buffer | undefined
    if (!rawBody || (!Buffer.isBuffer(rawBody) && typeof rawBody !== 'string')) {
      throw new ForbiddenException('Неверная подпись вебхука')
    }
    const signature = authHeader?.replace('Bearer ', '') ?? ''
    const valid = this.paymentsService.verifyWebhookSignature(
      Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody),
      signature,
    )
    if (!valid) {
      throw new ForbiddenException('Неверная подпись вебхука')
    }

    return this.paymentsService.handleWebhook(payload)
  }
}
