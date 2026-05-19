import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ReviewsService } from './reviews.service'
import { CreateReviewDto } from './dto/create-review.dto'

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Оставить отзыв' })
  create(@Request() req: any, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(req.user.id, dto)
  }

  @Get('listing/:id')
  @ApiOperation({ summary: 'Отзывы на объявление' })
  findByListing(@Param('id') id: string) {
    return this.reviewsService.findByListing(id)
  }

  @Get('user/:id')
  @ApiOperation({ summary: 'Отзывы пользователя' })
  findByUser(@Param('id') id: string) {
    return this.reviewsService.findByUser(id)
  }
}
