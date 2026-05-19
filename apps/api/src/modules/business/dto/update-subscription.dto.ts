import { IsEnum } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { SubscriptionPlan } from '@prisma/client'

export class UpdateSubscriptionDto {
  @ApiProperty({ enum: SubscriptionPlan })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan
}
