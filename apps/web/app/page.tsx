import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rigs — аренда снаряжения для активного отдыха',
  description: 'Арендуй байдарки, палатки, велосипеды и другое снаряжение у проверенных хозяев рядом с тобой. Быстро, безопасно, выгодно.',
  openGraph: {
    title: 'Rigs — аренда снаряжения',
    description: 'Арендуй снаряжение для активного отдыха у проверенных хозяев',
    type: 'website',
  },
}

import { HeroSection } from '@/components/home/hero-section'
import { CategoriesSection } from '@/components/home/categories-section'
import { CollectionsSection } from '@/components/home/collections-section'
import { FeaturedListings } from '@/components/home/featured-listings'
import { HowItWorks } from '@/components/home/how-it-works'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <CategoriesSection />
        <CollectionsSection />
        <FeaturedListings />
        <HowItWorks />
      </main>
      <Footer />
    </>
  )
}
