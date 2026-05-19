import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/my/', '/host/', '/business/', '/booking/new', '/auth'] },
    sitemap: `${process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://rigs.ru'}/sitemap.xml`,
  }
}
