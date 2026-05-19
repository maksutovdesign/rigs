import { IsString, IsOptional, IsEmail, IsUrl, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateBusinessProfileDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  companyName: string

  @ApiPropertyOptional({ maxLength: 12 })
  @IsOptional()
  @IsString()
  @MaxLength(12)
  inn?: string

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  legalAddress?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  contactEmail?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  website?: string

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string
}
