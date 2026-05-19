import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateReviewDto {
  @ApiProperty() @IsString() bookingId: string
  @ApiProperty({ minimum: 1, maximum: 5 }) @IsInt() @Min(1) @Max(5) rating: number
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) ratingAccuracy?: number
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) ratingCondition?: number
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) ratingCommunication?: number
  @ApiPropertyOptional() @IsOptional() @IsString() text?: string
}
