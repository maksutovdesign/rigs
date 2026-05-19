import { IsOptional, IsString, IsNumber, IsBoolean, IsEnum, IsInt, Min, Max } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type, Transform } from 'class-transformer'

export class SearchListingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() lat?: number
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() lng?: number
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() radius?: number
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string
  @ApiPropertyOptional({ description: 'ISO date string — exclude listings fully booked before this date' })
  @IsOptional() @IsString() dateFrom?: string
  @ApiPropertyOptional({ description: 'ISO date string — exclude listings fully booked after this date' })
  @IsOptional() @IsString() dateTo?: string
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) priceMin?: number
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) priceMax?: number
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() instantBook?: boolean
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() delivery?: boolean
  @ApiPropertyOptional({ enum: ['new', 'excellent', 'good', 'fair'] })
  @IsOptional() @IsEnum(['new', 'excellent', 'good', 'fair']) condition?: string
  @ApiPropertyOptional({ enum: ['price_asc', 'price_desc', 'rating', 'distance', 'newest', 'popular'] })
  @IsOptional() @IsEnum(['price_asc', 'price_desc', 'rating', 'distance', 'newest', 'popular']) sort?: string
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number
}
