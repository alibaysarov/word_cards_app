import httpClient from './httpClient'
import type { WordCard } from '../types/wordCard'

export type CreateCardDto = {
  frontText: string
  rearText: string
  collectionId: string
}

export type UpdateCardDto = {
  frontText: string
  rearText: string
}

export async function createCard(dto: CreateCardDto): Promise<WordCard> {
  const res = await httpClient.post<WordCard>('/cards/', dto)
  return res.data
}

export async function updateCard(cardId: string, dto: UpdateCardDto): Promise<WordCard> {
  const res = await httpClient.put<WordCard>(`/cards/${cardId}`, dto)
  return res.data
}

export async function deleteCard(cardId: string): Promise<void> {
  await httpClient.delete(`/cards/${cardId}`)
}
