import { IsString, IsOptional } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class SendMessageDto {
  @ApiPropertyOptional() @IsOptional() @IsString() text?: string
  @ApiPropertyOptional() @IsOptional() @IsString() mediaUrl?: string
}
