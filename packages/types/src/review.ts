import { ReviewRole } from './enums'
import { PublicUser } from './user'

export interface Review {
  id: string
  bookingId: string
  reviewerId: string
  reviewer?: PublicUser
  revieweeId: string
  listingId: string
  role: ReviewRole
  rating: number
  ratingAccuracy?: number
  ratingCondition?: number
  ratingCommunication?: number
  text?: string
  isPublished: boolean
  createdAt: string
}

export interface CreateReviewDto {
  bookingId: string
  rating: number
  ratingAccuracy?: number
  ratingCondition?: number
  ratingCommunication?: number
  text?: string
}

export interface ReviewStats {
  averageRating: number
  totalReviews: number
  ratingAccuracy?: number
  ratingCondition?: number
  ratingCommunication?: number
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
}
