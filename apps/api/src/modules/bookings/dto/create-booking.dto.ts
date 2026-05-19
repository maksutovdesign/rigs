import { IsString, IsDateString, IsBoolean, IsOptional, IsEnum, IsInt, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateBookingDto {
  @ApiProperty() @IsString() listingId: string
  @ApiProperty() @IsDateString() startDate: string
  @ApiProperty() @IsDateString() endDate: string
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) quantity?: number
  @ApiProperty({ enum: ['pickup', 'delivery'] }) @IsEnum(['pickup', 'delivery']) deliveryType: string
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryAddress?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() withInsurance?: boolean
}
