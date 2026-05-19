import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { BusinessService } from './business.service'
import { CreateBusinessProfileDto } from './dto/create-business-profile.dto'
import { UpdateBusinessProfileDto } from './dto/update-business-profile.dto'
import { InviteTeamMemberDto } from './dto/invite-team-member.dto'
import { UpdateSubscriptionDto } from './dto/update-subscription.dto'

@ApiTags('Business')
@Controller('business')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BusinessController {
  private readonly logger = new Logger(BusinessController.name)

  constructor(private readonly businessService: BusinessService) {}

  // ── Profile ──────────────────────────────────────────────────────────────

  @Get('profile')
  @ApiOperation({ summary: 'Получить бизнес-профиль' })
  getProfile(@Request() req: any) {
    return this.businessService.getProfile(req.user.id)
  }

  @Post('profile')
  @ApiOperation({ summary: 'Создать бизнес-профиль' })
  createProfile(@Request() req: any, @Body() dto: CreateBusinessProfileDto) {
    return this.businessService.createProfile(req.user.id, dto)
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Обновить бизнес-профиль' })
  updateProfile(@Request() req: any, @Body() dto: UpdateBusinessProfileDto) {
    return this.businessService.updateProfile(req.user.id, dto)
  }

  // ── Team ─────────────────────────────────────────────────────────────────

  @Get('team')
  @ApiOperation({ summary: 'Список участников команды' })
  getTeam(@Request() req: any) {
    return this.businessService.getTeam(req.user.id)
  }

  @Post('team/invite')
  @ApiOperation({ summary: 'Пригласить участника команды' })
  inviteMember(@Request() req: any, @Body() dto: InviteTeamMemberDto) {
    return this.businessService.inviteMember(req.user.id, dto)
  }

  @Post('team/accept-invite/:token')
  @ApiOperation({ summary: 'Принять приглашение в команду по токену' })
  acceptInvite(@Request() req: any, @Param('token') token: string) {
    return this.businessService.acceptInvite(req.user.id, token)
  }

  @Delete('team/:memberId')
  @ApiOperation({ summary: 'Удалить участника команды' })
  removeMember(@Request() req: any, @Param('memberId') memberId: string) {
    return this.businessService.removeMember(req.user.id, memberId)
  }

  // ── Analytics ─────────────────────────────────────────────────────────────

  @Get('analytics')
  @ApiOperation({ summary: 'Аналитика бизнес-кабинета' })
  getAnalytics(@Request() req: any) {
    return this.businessService.getAnalytics(req.user.id)
  }

  // ── Invoices ──────────────────────────────────────────────────────────────

  @Get('invoices')
  @ApiOperation({ summary: 'Список счетов и актов' })
  getInvoices(@Request() req: any) {
    return this.businessService.getInvoices(req.user.id)
  }

  // ── Subscription ──────────────────────────────────────────────────────────

  @Patch('subscription')
  @ApiOperation({ summary: 'Изменить тарифный план (только downgrade на free без оплаты)' })
  updateSubscription(@Request() req: any, @Body() dto: UpdateSubscriptionDto) {
    if (dto.plan !== 'free') {
      this.logger.warn(
        `User ${req.user.id} attempted to set subscription plan '${dto.plan}' without payment`,
      )
    }
    return this.businessService.updateSubscription(req.user.id, dto.plan)
  }
}
