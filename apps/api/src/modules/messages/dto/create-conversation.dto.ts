import { IsString, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateConversationDto {
  @ApiProperty() @IsString() participantId: string
  @ApiPropertyOptional() @IsOptional() @IsString() bookingId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() listingId?: string
}
