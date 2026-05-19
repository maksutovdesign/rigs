import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import * as sharp from 'sharp'
import { v4 as uuid } from 'uuid'

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name)
  private readonly s3: S3Client
  private readonly bucket: string
  private readonly publicBaseUrl: string

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.bucket = config.get<string>('S3_BUCKET', 'rigs-media')
    const endpoint = config.get<string>('S3_ENDPOINT', 'https://storage.yandexcloud.net')

    // Yandex Object Storage public URL: https://<bucket>.storage.yandexcloud.net/<key>
    // MinIO (local dev): http://localhost:9000/<bucket>/<key>  (path-style)
    const isYandex = endpoint.includes('yandexcloud.net')
    this.publicBaseUrl = isYandex
      ? `https://${this.bucket}.storage.yandexcloud.net`
      : `${endpoint}/${this.bucket}`

    this.s3 = new S3Client({
      endpoint,
      credentials: {
        accessKeyId: config.get('S3_ACCESS_KEY') ?? '',
        secretAccessKey: config.get('S3_SECRET_KEY') ?? '',
      },
      region: config.get('S3_REGION', 'us-east-1'),
      forcePathStyle: !isYandex, // MinIO needs path-style; Yandex needs virtual-hosted
    })
  }

  // ─── Temp upload (no listing ID yet — used by the listing creation wizard) ───

  async uploadTemp(userId: string, file: Express.Multer.File): Promise<{ url: string }> {
    const isImage = file.mimetype.startsWith('image/')
    let buffer = file.buffer

    if (isImage) {
      buffer = await sharp(buffer).webp({ quality: 85 }).toBuffer()
    }

    const key = `temp/${userId}/${uuid()}.${isImage ? 'webp' : 'mp4'}`
    const url = await this.uploadToS3(key, buffer, isImage ? 'image/webp' : 'video/mp4')
    return { url }
  }

  // ─── Listing media (listing must already exist and belong to userId) ─────────

  async uploadListingMedia(userId: string, listingId: string, file: Express.Multer.File) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } })
    if (!listing) throw new NotFoundException('Объявление не найдено')
    if (listing.hostId !== userId) throw new ForbiddenException('Нет доступа к этому объявлению')

    const isImage = file.mimetype.startsWith('image/')
    let buffer = file.buffer

    if (isImage) {
      buffer = await sharp(buffer).webp({ quality: 85 }).toBuffer()
    }

    const key = `listings/${listingId}/${uuid()}.${isImage ? 'webp' : 'mp4'}`
    const url = await this.uploadToS3(key, buffer, isImage ? 'image/webp' : 'video/mp4')

    return this.prisma.listingMedia.create({
      data: { listingId, url, type: isImage ? 'photo' : 'video' },
    })
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const buffer = await sharp(file.buffer).resize(256, 256).webp({ quality: 80 }).toBuffer()
    const key = `avatars/${userId}/${uuid()}.webp`
    const url = await this.uploadToS3(key, buffer, 'image/webp')

    await this.prisma.user.update({ where: { id: userId }, data: { avatarUrl: url } })

    return { url }
  }

  private async uploadToS3(key: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    }))
    return `${this.publicBaseUrl}/${key}`
  }
}
