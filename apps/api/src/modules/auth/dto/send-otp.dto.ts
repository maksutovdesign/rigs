import { IsPhoneNumber } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class SendOtpDto {
  @ApiProperty({ example: '+79991234567' })
  @IsPhoneNumber('RU')
  phone: string
}
