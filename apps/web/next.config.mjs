/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['storage.yandexcloud.net', 'localhost'],
    formats: ['image/webp'],
  },
  experimental: {
    turbo: {},
  },
}

export default nextConfig
