import httpClient from './httpClient'
import type { Collection, RecentCollection } from '../types/collection'
import type {
  CollectionTestSessionResponse,
  SubmitAnswerResponse,
} from '../types/collectionTest'
import type { WordCard } from '../types/wordCard'

export type GetCollectionCardsResponse = {
  cards: WordCard[]
}

export async function fetchCollectionCards(
  collectionId: string
): Promise<GetCollectionCardsResponse> {
  const res = await httpClient.get<GetCollectionCardsResponse>(
    `/collections/${collectionId}/cards`
  )
  return res.data
}

export async function fetchCollections(): Promise<Collection[]> {
  const res = await httpClient.get<Collection[]>('/collections/')
  return res.data
}

export async function fetchCollectionById(
  collectionId: string
): Promise<Collection & { wordCards: WordCard[] }> {
  const res = await httpClient.get<Collection & { wordCards: WordCard[] }>(
    `/collections/${collectionId}`
  )
  return res.data
}

export async function createCollection(name: string): Promise<Collection> {
  const res = await httpClient.post<Collection>('/collections/', { name })
  return res.data
}

export async function fetchRecentCollections(limit = 5): Promise<RecentCollection[]> {
  const res = await httpClient.get<RecentCollection[]>(`/collections/recent?limit=${limit}`)
  return res.data
}

export async function fetchCollectionTest(
  collectionId: string
): Promise<CollectionTestSessionResponse> {
  const res = await httpClient.get<CollectionTestSessionResponse>(
    `/collections/${collectionId}/tests`
  )
  return res.data
}

export async function submitTestAnswer(
  collectionId: string,
  testSessionId: string,
  wordCardId: string
): Promise<SubmitAnswerResponse> {
  const res = await httpClient.post<SubmitAnswerResponse>(
    `/collections/${collectionId}/tests/answers`,
    { testSessionId, wordCardId }
  )
  return res.data
}

export async function resetTestSession(
  collectionId: string
): Promise<{ testSessionId: string }> {
  const res = await httpClient.post<{ testSessionId: string }>(
    `/collections/${collectionId}/tests/reset`
  )
  return res.data
}
