import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { SearchService } from './search.service'

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Полнотекстовый поиск' })
  search(@Query('q') q: string) {
    return this.searchService.search(q)
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Подсказки поиска' })
  suggestions(@Query('q') q: string) {
    return this.searchService.getSuggestions(q)
  }
}
