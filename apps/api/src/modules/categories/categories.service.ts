import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findTree() {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })

    const map = new Map(categories.map((c) => [c.id, { ...c, children: [] as any[] }]))
    const roots: any[] = []

    for (const cat of map.values()) {
      if (cat.parentId) {
        map.get(cat.parentId)?.children.push(cat)
      } else {
        roots.push(cat)
      }
    }

    return roots
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: { children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
    })
    if (!category) throw new NotFoundException('Категория не найдена')
    return category
  }
}
