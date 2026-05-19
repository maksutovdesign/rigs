import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
  ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { BookingsService } from './bookings.service'
import { CreateBookingDto } from './dto/create-booking.dto'
import { CheckinDto } from './dto/checkin.dto'

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Создать заявку на бронирование' })
  create(@CurrentUser() user: User, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(user.id, dto)
  }

  @Get()
  @ApiOperation({ summary: 'Мои аренды (арендатор)' })
  findMyRentals(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.bookingsService.findByRenter(user.id, page, limit)
  }

  @Get('host')
  @ApiOperation({ summary: 'Мои аренды (хост)' })
  findHostBookings(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.bookingsService.findByHost(user.id, page, limit)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Детали бронирования' })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.bookingsService.findById(user.id, id)
  }

  @Patch(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Подтвердить (хост)' })
  confirm(@CurrentUser() user: User, @Param('id') id: string) {
    return this.bookingsService.confirm(user.id, id)
  }

  @Patch(':id/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отклонить (хост)' })
  decline(@CurrentUser() user: User, @Param('id') id: string, @Body('reason') reason?: string) {
    return this.bookingsService.decline(user.id, id, reason)
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отменить (арендатор или хост)' })
  cancel(@CurrentUser() user: User, @Param('id') id: string, @Body('reason') reason?: string) {
    return this.bookingsService.cancel(user.id, id, reason)
  }

  @Post(':id/checkin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Выдача снаряжения' })
  checkin(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: CheckinDto) {
    return this.bookingsService.checkin(user.id, id, dto)
  }

  @Post(':id/checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Возврат снаряжения' })
  checkout(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: CheckinDto) {
    return this.bookingsService.checkout(user.id, id, dto)
  }

  @Post(':id/dispute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Открыть спор по бронированию' })
  dispute(@CurrentUser() user: User, @Param('id') id: string, @Body('reason') reason: string) {
    return this.bookingsService.createDispute(user.id, id, reason)
  }
}
