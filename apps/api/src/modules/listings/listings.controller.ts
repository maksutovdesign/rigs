import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Request, Req, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger'
import { User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ListingsService } from './listings.service'
import { CreateListingDto } from './dto/create-listing.dto'
import { UpdateListingDto } from './dto/update-listing.dto'
import { SearchListingsDto } from './dto/search-listings.dto'
import { BlockDatesDto } from './dto/block-dates.dto'

@ApiTags('Listings')
@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get()
  @ApiOperation({ summary: 'Поиск объявлений' })
  search(@Query() query: SearchListingsDto) {
    return this.listingsService.search(query)
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать объявление' })
  create(@CurrentUser() user: User, @Body() dto: CreateListingDto) {
    return this.listingsService.create(user.id, dto)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Детальная страница объявления' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.listingsService.findById(id, req.user?.id)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить объявление' })
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateListingDto) {
    return this.listingsService.update(user.id, id, dto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Архивировать объявление' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.listingsService.archive(user.id, id)
  }

  @Get(':id/similar')
  @ApiOperation({ summary: 'Похожие объявления' })
  getSimilar(@Param('id') id: string) {
    return this.listingsService.getSimilar(id)
  }

  @Get(':id/viewers')
  @ApiOperation({ summary: 'Количество активных просмотров листинга' })
  async getViewers(@Param('id') id: string) {
    return this.listingsService.getViewerCount(id)
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Зарегистрировать просмотр (TTL 3 мин)' })
  async registerView(@Param('id') id: string, @Req() req: any) {
    const sessionId = req.ip ?? 'anon'
    return this.listingsService.registerView(id, sessionId)
  }

  // ─── Availability ──────────────────────────────────────────────────────────

  @Get(':id/availability')
  @ApiOperation({ summary: 'Сетка доступности и занятые даты' })
  getAvailability(@Param('id') id: string) {
    return this.listingsService.getAvailability(id)
  }

  @Post(':id/availability/block')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Хост блокирует даты' })
  blockDates(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: BlockDatesDto,
  ) {
    return this.listingsService.blockDates(user.id, id, dto)
  }

  @Delete(':id/availability/block')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Хост разблокирует даты' })
  @ApiBody({ schema: { properties: { dates: { type: 'array', items: { type: 'string' } } } } })
  unblockDates(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('dates') dates: string[],
  ) {
    return this.listingsService.unblockDates(user.id, id, dates)
  }
}
