import { IsEmail, IsEnum } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { TeamRole } from '@prisma/client'

export class InviteTeamMemberDto {
  @ApiProperty()
  @IsEmail()
  email: string

  @ApiProperty({ enum: TeamRole })
  @IsEnum(TeamRole)
  role: TeamRole
}
