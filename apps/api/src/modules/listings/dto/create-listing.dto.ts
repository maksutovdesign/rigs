import {
  IsString, IsNumber, IsBoolean, IsOptional, IsEnum,
  IsArray, Min, Max, IsInt,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class ListingAttributeDto {
  @IsString() key: string
  @IsString() value: string
  @IsOptional() @IsString() unit?: string
}

export class CreateListingDto {
  @ApiProperty() @IsInt() categoryId: number
  @ApiProperty() @IsString() title: string
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string
  @ApiPropertyOptional() @IsOptional() @IsEnum(['equipment', 'experience', 'location', 'package']) listingType?: string
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string
  @ApiProperty() @IsString() city: string
  @ApiPropertyOptional() @IsOptional() @IsString() region?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number
  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string
  @ApiPropertyOptional() @IsOptional() @IsInt() year?: number
  @ApiPropertyOptional() @IsOptional() @IsEnum(['new', 'excellent', 'good', 'fair']) condition?: string
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) quantity?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) priceHourly?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) priceDaily?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) priceWeekly?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) priceMonthly?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) depositAmount?: number
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) minRentalHours?: number
  @ApiPropertyOptional() @IsOptional() @IsInt() maxRentalDays?: number
  @ApiPropertyOptional() @IsOptional() @IsBoolean() instantBook?: boolean
  @ApiPropertyOptional() @IsOptional() @IsBoolean() deliveryAvailable?: boolean
  @ApiPropertyOptional() @IsOptional() @IsInt() deliveryRadiusKm?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() deliveryPricePerKm?: number
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresPassport?: boolean
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresLicense?: boolean
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresCert?: boolean
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(14) @Max(99) minAge?: number
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[]
  @ApiPropertyOptional({ type: [ListingAttributeDto] })
  @IsOptional() @IsArray() @Type(() => ListingAttributeDto) attributes?: ListingAttributeDto[]
}
