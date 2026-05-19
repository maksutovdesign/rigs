import { PartialType } from '@nestjs/swagger'
import { CreateListingDto } from './create-listing.dto'
import { IsOptional, IsEnum } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateListingDto extends PartialType(CreateListingDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['draft', 'active', 'paused', 'archived'])
  status?: string
}
