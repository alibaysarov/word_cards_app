export type Collection = {
  id: string
  name: string
  userId: string
  createdAt: string
  updatedAt: string
}

export type RecentCollection = Collection & {
  cardCount: number
}
