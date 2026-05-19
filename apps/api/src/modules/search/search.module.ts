import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { Client } from '@elastic/elasticsearch'
import { SearchController } from './search.controller'
import { SearchService } from './search.service'

export const ELASTIC_CLIENT = 'ELASTIC_CLIENT'

@Module({
  imports: [ConfigModule],
  controllers: [SearchController],
  providers: [
    {
      provide: ELASTIC_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Client({ node: config.get('ELASTICSEARCH_URL', 'http://localhost:9200') }),
    },
    SearchService,
  ],
  exports: [SearchService, ELASTIC_CLIENT],
})
export class SearchModule {}
