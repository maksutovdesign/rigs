import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CATEGORIES = [
  { id: 1, parentId: null, slug: 'water', nameRu: 'Водный отдых', nameEn: 'Water Recreation', sortOrder: 1 },
  { id: 2, parentId: 1, slug: 'motorboats', nameRu: 'Моторные суда', sortOrder: 1 },
  { id: 3, parentId: 1, slug: 'rowing', nameRu: 'Гребные суда', sortOrder: 2 },
  { id: 4, parentId: 1, slug: 'sup', nameRu: 'SUP и серфинг', sortOrder: 3 },
  { id: 5, parentId: 1, slug: 'diving', nameRu: 'Подводное плавание', sortOrder: 4 },
  { id: 6, parentId: null, slug: 'winter', nameRu: 'Зимний отдых', nameEn: 'Winter Recreation', sortOrder: 2 },
  { id: 7, parentId: 6, slug: 'skiing', nameRu: 'Горные лыжи', sortOrder: 1 },
  { id: 8, parentId: 6, slug: 'snowboard', nameRu: 'Сноуборд', sortOrder: 2 },
  { id: 9, parentId: 6, slug: 'snowmobile', nameRu: 'Снегоходы', sortOrder: 3 },
  { id: 10, parentId: 6, slug: 'tubing', nameRu: 'Тюбинги и санки', sortOrder: 4 },
  { id: 11, parentId: null, slug: 'mountain', nameRu: 'Горный туризм', nameEn: 'Mountain & Climbing', sortOrder: 3 },
  { id: 12, parentId: 11, slug: 'climbing', nameRu: 'Скалолазание', sortOrder: 1 },
  { id: 13, parentId: 11, slug: 'trekking', nameRu: 'Треккинг', sortOrder: 2 },
  { id: 14, parentId: null, slug: 'cycling', nameRu: 'Велоспорт', nameEn: 'Cycling', sortOrder: 4 },
  { id: 15, parentId: 14, slug: 'mtb', nameRu: 'Горные велосипеды (MTB)', sortOrder: 1 },
  { id: 16, parentId: 14, slug: 'e-bike', nameRu: 'Электровелосипеды', sortOrder: 2 },
  { id: 17, parentId: null, slug: 'atv', nameRu: 'Наземный экстрим', nameEn: 'Land Adventure', sortOrder: 5 },
  { id: 18, parentId: 17, slug: 'quad', nameRu: 'Квадроциклы', sortOrder: 1 },
  { id: 19, parentId: 17, slug: 'buggy', nameRu: 'Багги / UTV', sortOrder: 2 },
  { id: 20, parentId: null, slug: 'fishing', nameRu: 'Рыбалка', nameEn: 'Fishing', sortOrder: 6 },
  { id: 21, parentId: 20, slug: 'fishing-rods', nameRu: 'Удилища и катушки', sortOrder: 1 },
  { id: 22, parentId: 20, slug: 'fishing-boats', nameRu: 'Лодки для рыбалки', sortOrder: 2 },
  { id: 23, parentId: null, slug: 'camping', nameRu: 'Кемпинг и туризм', nameEn: 'Camping', sortOrder: 7 },
  { id: 24, parentId: 23, slug: 'tents', nameRu: 'Палатки', sortOrder: 1 },
  { id: 25, parentId: 23, slug: 'sleeping-bags', nameRu: 'Спальники и коврики', sortOrder: 2 },
  { id: 26, parentId: 23, slug: 'cooking', nameRu: 'Приготовление пищи', sortOrder: 3 },
  { id: 27, parentId: null, slug: 'air', nameRu: 'Воздушный отдых', nameEn: 'Air Sports', sortOrder: 8 },
  { id: 28, parentId: 27, slug: 'paragliding', nameRu: 'Параглайдинг', sortOrder: 1 },
  { id: 29, parentId: 27, slug: 'drones', nameRu: 'Дроны', sortOrder: 2 },
  { id: 30, parentId: null, slug: 'beach', nameRu: 'Пляжный отдых', nameEn: 'Beach', sortOrder: 9 },
  { id: 31, parentId: null, slug: 'kids', nameRu: 'Детский отдых', nameEn: 'Kids', sortOrder: 10 },
  { id: 32, parentId: null, slug: 'locations', nameRu: 'Базы отдыха', nameEn: 'Locations', sortOrder: 11 },
]

async function main() {
  console.log('🌱 Seeding categories...')

  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: cat,
      create: cat,
    })
  }

  console.log(`✅ Seeded ${CATEGORIES.length} categories`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
