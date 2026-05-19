import { PartialType } from '@nestjs/swagger'
import { CreateBusinessProfileDto } from './create-business-profile.dto'

export class UpdateBusinessProfileDto extends PartialType(CreateBusinessProfileDto) {}
