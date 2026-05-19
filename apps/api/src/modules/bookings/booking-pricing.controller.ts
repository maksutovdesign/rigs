import { Controller, Post, Body } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { IsString, IsDateString, IsBoolean, IsOptional, IsEnum } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PrismaService } from '../../prisma/prisma.service'
import { calcSubtotal, calcBookingTotal } from '@rigs/utils'
import { NotFoundException } from '@nestjs/common'

class PricingPreviewDto {
  @ApiProperty() @IsString() listingId: string
  @ApiProperty() @IsDateString() startDate: string
  @ApiProperty() @IsDateString() endDate: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() withInsurance?: boolean
  @ApiPropertyOptional() @IsOptional() @IsEnum(['pickup', 'delivery']) deliveryType?: string
}

@ApiTags('Bookings')
@Controller('bookings/pricing-preview')
export class BookingPricingController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Предварительный расчёт стоимости' })
  async preview(@Body() dto: PricingPreviewDto) {
    const listing = await this.prisma.listing.findUnique({ where: { id: dto.listingId } })
    if (!listing) throw new NotFoundException('Объявление не найдено')

    const start = new Date(dto.startDate)
    const end = new Date(dto.endDate)

    const subtotal = calcSubtotal(
      {
        priceHourly: listing.priceHourly ? Number(listing.priceHourly) : undefined,
        priceDaily: listing.priceDaily ? Number(listing.priceDaily) : undefined,
        priceWeekly: listing.priceWeekly ? Number(listing.priceWeekly) : undefined,
        priceMonthly: listing.priceMonthly ? Number(listing.priceMonthly) : undefined,
      },
      start,
      end,
    )

    const ms = end.getTime() - start.getTime()
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24))

    return {
      ...calcBookingTotal({
        subtotal,
        withInsurance: dto.withInsurance,
        deliveryFee: dto.deliveryType === 'delivery' ? 500 : 0,
      }),
      depositAmount: listing.depositAmount ? Number(listing.depositAmount) : 0,
      days,
      pricePerDay: listing.priceDaily ? Number(listing.priceDaily) : subtotal / days,
    }
  }
}
