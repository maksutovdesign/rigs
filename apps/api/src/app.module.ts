import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { HttpLoggerMiddleware } from './common/middleware/http-logger.middleware'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { CategoriesModule } from './modules/categories/categories.module'
import { ListingsModule } from './modules/listings/listings.module'
import { BookingsModule } from './modules/bookings/bookings.module'
import { PaymentsModule } from './modules/payments/payments.module'
import { ReviewsModule } from './modules/reviews/reviews.module'
import { MessagesModule } from './modules/messages/messages.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { SearchModule } from './modules/search/search.module'
import { AdminModule } from './modules/admin/admin.module'
import { HostModule } from './modules/host/host.module'
import { ChatModule } from './modules/chat/chat.module'
import { UploadModule } from './modules/upload/upload.module'
import { RedisModule } from './redis/redis.module'
import { BusinessModule } from './modules/business/business.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    EventEmitterModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ListingsModule,
    BookingsModule,
    PaymentsModule,
    ReviewsModule,
    MessagesModule,
    NotificationsModule,
    SearchModule,
    AdminModule,
    HostModule,
    ChatModule,
    UploadModule,
    BusinessModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('*')
  }
}
