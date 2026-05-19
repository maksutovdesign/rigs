import {
  Controller, Get, Patch, Put, Delete,
  Body, Param, UseGuards, Request,
  HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UsersService } from './users.service'
import { ReferralsService } from './referrals.service'
import { UpdateUserDto } from './dto/update-user.dto'
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto'

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly referralsService: ReferralsService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Текущий пользователь' })
  getMe(@Request() req: any) {
    return this.usersService.findById(req.user.id)
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить профиль' })
  updateMe(@Request() req: any, @Body() dto: UpdateUserDto) {
    return this.usersService.update(req.user.id, dto)
  }

  // ─── FCM push token ──────────────────────────────────────────────────────────

  @Put('me/fcm-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Сохранить FCM-токен для push-уведомлений' })
  async updateFcmToken(@Request() req: any, @Body() dto: UpdateFcmTokenDto) {
    await this.usersService.updateFcmToken(req.user.id, dto.token)
  }

  @Delete('me/fcm-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить FCM-токен (выход из уведомлений)' })
  async clearFcmToken(@Request() req: any) {
    await this.usersService.clearFcmToken(req.user.id)
  }

  // ─── Referral program ────────────────────────────────────────────────────────

  @Get('me/referral')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить/создать реферальный код' })
  async getReferral(@Request() req: any) {
    const code = await this.referralsService.getOrCreateCode(req.user.id)
    return { code, shareUrl: `${process.env['SITE_URL'] ?? 'https://rigs.ru'}/?ref=${code}` }
  }

  @Get('me/referral/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Статистика рефералов' })
  getReferralStats(@Request() req: any) {
    return this.referralsService.getStats(req.user.id)
  }

  // ─── Public profile ──────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Публичный профиль пользователя' })
  getPublicProfile(@Param('id') id: string) {
    return this.usersService.findPublicProfile(id)
  }

  @Get(':id/public')
  @ApiOperation({ summary: 'Публичный профиль пользователя/хоста' })
  getHostPublicProfile(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id)
  }
}
