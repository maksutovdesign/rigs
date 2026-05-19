import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { UserRole } from '@rigs/types'
import { AdminService } from './admin.service'

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Метрики платформы' })
  getDashboard() {
    return this.adminService.getDashboard()
  }

  @Get('moderation')
  @ApiOperation({ summary: 'Очередь модерации объявлений' })
  getModerationQueue() {
    return this.adminService.getModerationQueue()
  }

  @Patch('listings/:id/approve')
  @ApiOperation({ summary: 'Одобрить объявление' })
  approveListing(@Param('id') id: string) {
    return this.adminService.approveListing(id)
  }

  @Patch('listings/:id/reject')
  @ApiOperation({ summary: 'Отклонить объявление' })
  rejectListing(@Param('id') id: string, @Body('reason') reason: string) {
    return this.adminService.rejectListing(id, reason)
  }

  @Patch('users/:id/ban')
  @ApiOperation({ summary: 'Заблокировать пользователя' })
  banUser(@Param('id') id: string) {
    return this.adminService.banUser(id)
  }

  @Get('disputes')
  @ApiOperation({ summary: 'Список активных споров' })
  getDisputes() {
    return this.adminService.getDisputes()
  }

  @Patch('disputes/:id/resolve')
  @ApiOperation({ summary: 'Разрешить спор' })
  resolveDispute(
    @Param('id') id: string,
    @Body('decision') decision: 'refund_renter' | 'release_host',
  ) {
    return this.adminService.resolveDispute(id, decision)
  }
}
