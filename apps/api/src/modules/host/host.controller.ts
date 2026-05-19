import { Controller, Get, Post, Query, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { HostService } from './host.service'
import { ListingsService } from '../listings/listings.service'

@ApiTags('Host')
@Controller('host')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HostController {
  constructor(
    private readonly hostService: HostService,
    private readonly listingsService: ListingsService,
  ) {}

  @Get('listings')
  @ApiOperation({ summary: 'Объявления хоста (с пагинацией)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMyListings(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listingsService.getMyListings(req.user.id, page ? Number(page) : 1, limit ? Number(limit) : 12)
  }

  @Get('stats')
  @ApiOperation({ summary: 'Сводная статистика хоста' })
  getStats(@Request() req: any) {
    return this.hostService.getStats(req.user.id)
  }

  @Get('analytics')
  @ApiOperation({ summary: 'График выручки за последние N месяцев' })
  @ApiQuery({ name: 'months', required: false, type: Number })
  getAnalytics(@Request() req: any, @Query('months') months?: string) {
    return this.hostService.getRevenueChart(req.user.id, months ? Number(months) : 6)
  }

  @Get('top-listings')
  @ApiOperation({ summary: 'Топ объявлений хоста по бронированиям' })
  getTopListings(@Request() req: any) {
    return this.hostService.getTopListings(req.user.id)
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Календарь занятости объявлений хоста' })
  @ApiQuery({ name: 'listingId', required: false, type: String })
  getCalendar(@Request() req: any, @Query('listingId') listingId?: string) {
    return this.hostService.getCalendar(req.user.id, listingId)
  }

  @Get('payouts/stats')
  @ApiOperation({ summary: 'Баланс и статистика выплат хоста' })
  getPayoutStats(@Request() req: any) {
    return this.hostService.getPayoutStats(req.user.id)
  }

  @Get('payouts')
  @ApiOperation({ summary: 'История выплат хоста' })
  getPayouts(@Request() req: any) {
    return this.hostService.getPayouts(req.user.id)
  }

  @Post('payouts/request')
  @ApiOperation({ summary: 'Запросить выплату' })
  requestPayout(@Request() req: any) {
    return this.hostService.requestPayout(req.user.id)
  }
}
