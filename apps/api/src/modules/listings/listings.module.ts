import { Module } from '@nestjs/common'
import { ListingsController } from './listings.controller'
import { ListingsService } from './listings.service'
import { SearchModule } from '../search/search.module'

@Module({
  imports: [SearchModule],
  controllers: [ListingsController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}
