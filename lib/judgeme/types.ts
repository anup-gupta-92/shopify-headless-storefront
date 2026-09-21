export interface ReviewRating {
  average: number;
  count: number;
}

export interface Review {
  id: string;
  rating: number;
  title: string;
  body: string;
  reviewerName: string;
  verifiedBuyer: boolean;
  date: string;
  images: string[];
}

export interface ReviewPage {
  reviews: Review[];
  page: number;
  totalPages: number;
}
