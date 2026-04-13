export type WordCard = {
  id: string
  frontText: string
  RearText: string
  collectionId: string
}

export type MatchTile = {
  id: string
  text: string
  side: 'term' | 'definition'
  matched: boolean
  glowing: boolean
  shaking: boolean
}
