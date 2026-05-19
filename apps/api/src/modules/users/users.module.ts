import { Module } from '@nestjs/common'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'
import { WishlistsController, WishlistAliasController } from './wishlists.controller'
import { WishlistsService } from './wishlists.service'
import { WishlistPriceScheduler } from './wishlist-price.scheduler'
import { ReferralsService } from './referrals.service'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [NotificationsModule],
  controllers: [UsersController, WishlistsController, WishlistAliasController],
  providers: [UsersService, WishlistsService, WishlistPriceScheduler, ReferralsService],
  exports: [UsersService, WishlistsService, ReferralsService],
})
export class UsersModule {}
