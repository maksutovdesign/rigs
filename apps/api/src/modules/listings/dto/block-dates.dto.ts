import { IsArray, IsDateString, IsOptional, IsString, ArrayNotEmpty } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class BlockDatesDto {
  @ApiProperty({ example: ['2025-07-01', '2025-07-02'], type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsDateString({}, { each: true })
  dates!: string[]

  @ApiPropertyOptional({ example: 'Техническое обслуживание' })
  @IsOptional()
  @IsString()
  reason?: string
}
