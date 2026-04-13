import httpClient from './httpClient'
import type { Sentence } from '../types/sentence'

export async function fetchSentences(collectionId: string): Promise<Sentence[]> {
  const res = await httpClient.get<Sentence[]>(`/collections/${collectionId}/sentences`)
  return res.data
}

export async function generateSentences(collectionId: string): Promise<Sentence[]> {
  const res = await httpClient.post<Sentence[]>(
    `/collections/${collectionId}/sentences/generate`
  )
  return res.data
}
