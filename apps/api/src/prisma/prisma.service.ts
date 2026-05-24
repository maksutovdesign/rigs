import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  constructor() {
    super({
      // Show slow / error queries; suppress verbose query logs in production
      log:
        process.env['NODE_ENV'] === 'development'
          ? [
              { emit: 'stdout', level: 'warn' },
              { emit: 'stdout', level: 'error' },
            ]
          : [{ emit: 'stdout', level: 'error' }],
    })
  }

  async onModuleInit() {
    await this.$connect()
    this.logger.log('Prisma connected')
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
