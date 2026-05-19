import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { BookingsController } from './bookings.controller'
import { BookingsService } from './bookings.service'
import { BookingsScheduler } from './bookings.scheduler'
import { BookingPricingController } from './booking-pricing.controller'
import { PaymentsModule } from '../payments/payments.module'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [ScheduleModule.forRoot(), PaymentsModule, NotificationsModule],
  controllers: [BookingsController, BookingPricingController],
  providers: [BookingsService, BookingsScheduler],
  exports: [BookingsService],
})
export class BookingsModule {}
