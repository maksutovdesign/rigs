import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Category } from '@rigs/types'

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<Category[]>('/categories')
      return data
    },
    staleTime: 5 * 60_000,
  })
}
