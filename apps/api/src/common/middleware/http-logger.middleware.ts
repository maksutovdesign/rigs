import { Injectable, NestMiddleware, Logger } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP')

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req
    const start = Date.now()

    res.on('finish', () => {
      const ms = Date.now() - start
      const { statusCode } = res
      const message = `${method} ${originalUrl} ${statusCode} — ${ms}ms`

      if (statusCode >= 500) this.logger.error(message)
      else if (statusCode >= 400) this.logger.warn(message)
      else this.logger.log(message)
    })

    next()
  }
}
