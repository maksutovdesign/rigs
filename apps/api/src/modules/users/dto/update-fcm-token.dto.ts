import { IsString, IsNotEmpty, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateFcmTokenDto {
  @ApiProperty({ example: 'fGH1k2mN3pQ4rS5t...' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token!: string
}
