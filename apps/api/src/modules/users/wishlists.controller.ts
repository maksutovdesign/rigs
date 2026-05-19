import { Controller, Get, Post, Delete, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { WishlistsService } from './wishlists.service'

// ─── Primary route: /users/me/wishlists ──────────────────────────────────────
@ApiTags('Wishlists')
@Controller('users/me/wishlists')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @Get()
  @ApiOperation({ summary: 'Мои избранные объявления' })
  findAll(@Request() req: any) {
    return this.wishlistsService.findAll(req.user.id)
  }

  @Post(':listingId')
  @ApiOperation({ summary: 'Добавить в избранное' })
  add(@Request() req: any, @Param('listingId') listingId: string) {
    return this.wishlistsService.add(req.user.id, listingId)
  }

  @Delete(':listingId')
  @ApiOperation({ summary: 'Убрать из избранного' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req: any, @Param('listingId') listingId: string) {
    return this.wishlistsService.remove(req.user.id, listingId)
  }
}

// ─── Alias route: /users/wishlist (used by web client) ───────────────────────
@ApiTags('Wishlists')
@Controller('users/wishlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WishlistAliasController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @Get()
  @ApiOperation({ summary: 'Мои избранные объявления (alias)' })
  findAll(@Request() req: any) {
    return this.wishlistsService.findAll(req.user.id)
  }

  @Post(':listingId')
  @ApiOperation({ summary: 'Добавить в избранное (alias)' })
  add(@Request() req: any, @Param('listingId') listingId: string) {
    return this.wishlistsService.add(req.user.id, listingId)
  }

  @Delete(':listingId')
  @ApiOperation({ summary: 'Убрать из избранного (alias)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req: any, @Param('listingId') listingId: string) {
    return this.wishlistsService.remove(req.user.id, listingId)
  }
}
