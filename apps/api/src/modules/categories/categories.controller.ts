import { Controller, Get, Param } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { CategoriesService } from './categories.service'

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Дерево всех категорий' })
  findAll() {
    return this.categoriesService.findTree()
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Категория по slug' })
  findOne(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug)
  }
}
