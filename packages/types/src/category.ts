export interface Category {
  id: number
  parentId?: number
  slug: string
  nameRu: string
  nameEn?: string
  iconUrl?: string
  coverUrl?: string
  sortOrder: number
  isActive: boolean
  children?: Category[]
}

export interface CategoryTree extends Category {
  children: CategoryTree[]
}
