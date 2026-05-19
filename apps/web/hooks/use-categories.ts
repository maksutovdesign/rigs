'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CategoryTree } from '@rigs/types'

export function useCategories() {
  return useQuery<CategoryTree[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<CategoryTree[]>('/categories')
      return data
    },
    staleTime: 10 * 60 * 1000,
  })
}
