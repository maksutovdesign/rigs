import { IsPhoneNumber, IsString, Length } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class VerifyOtpDto {
  @ApiProperty({ example: '+79991234567' })
  @IsPhoneNumber('RU')
  phone: string

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code: string
}
