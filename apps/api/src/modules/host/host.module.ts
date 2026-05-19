import { Module } from '@nestjs/common'
import { HostController } from './host.controller'
import { HostService } from './host.service'
import { ListingsModule } from '../listings/listings.module'

@Module({
  imports: [ListingsModule],
  controllers: [HostController],
  providers: [HostService],
  exports: [HostService],
})
export class HostModule {}
