import { IsArray, IsString, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CheckinDto {
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) photos: string[]
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string
}
