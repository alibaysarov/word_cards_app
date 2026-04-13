import { Request, Response } from "express"
import AuthError from "../exceptions/AuthError"
import { prisma } from "../database/prisma"
import { CollectionCreateDto } from "../dto/collection"
import { SubmitTestAnswerDto } from "../dto/collectionTest"
import ServerError from "../exceptions/ServerError"
import NotFoundError from "../exceptions/NotFoundError"

function pickRandom<T>(arr: T[], count: number): T[] {
    const copy = [...arr]
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy.slice(0, count)
}

function shuffle<T>(arr: T[]): T[] {
    return pickRandom(arr, arr.length)
}

class CollectionController {

    async create(req: Request, res: Response) {
        const { userId } = req

        if (!userId) {
            throw new AuthError("Не авторизованы")
        }
        
        const body: CollectionCreateDto = req.body
        try {
            const created = await prisma.collection.create({
                data: {
                    userId,
                    name: body.name
                }
            });
            return res.status(201).json(created)
        } catch (err) {
            console.error(err)
            throw new ServerError()
        }

    }

    async getById(req: Request, res: Response) {

        try {
            const { userId } = req

            if (!userId) {
                throw new AuthError("Не авторизованы")
            }
            const collectionId = String(req.params.collectionId);

            const collection = await prisma.collection.findFirst({
                where: {
                    id: collectionId
                },
                include: {
                    wordCards: true
                }
            });
            
            if (collection == null) {
                throw new NotFoundError()
            }
            return res.status(200).json(collection)
        } catch (err) {

            if (err instanceof AuthError) {
                throw err
            }

            if (err instanceof AuthError) {
                throw err
            }
            throw new ServerError()
        }
    }

    async getByUser(req: Request, res: Response) {
        const { userId } = req

        if (!userId) {
            throw new AuthError("Не авторизованы")
        }

        const collections = await prisma.collection.findMany({
            where: {
                userId: userId
            }
        });

        return res.status(200).json(collections)
    }

    async getRecent(req: Request, res: Response) {
        const { userId } = req

        if (!userId) {
            throw new AuthError("Не авторизованы")
        }

        const parsedLimit = parseInt(String(req.query.limit), 10)
        const limit = Math.min(Math.max(Number.isNaN(parsedLimit) ? 5 : parsedLimit, 1), 20)

        const collections = await prisma.collection.findMany({
            where: {
                userId
            },
            orderBy: {
                updatedAt: 'desc'
            },
            take: limit,
            include: {
                _count: {
                    select: {
                        wordCards: true
                    }
                }
            }
        })

        const result = collections.map((c) => ({
            id: c.id,
            name: c.name,
            userId: c.userId,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            cardCount: c._count.wordCards
        }))

        return res.status(200).json(result)
    }

    async getCards(req: Request, res: Response) {
        try {
            const { userId } = req

            if (!userId) {
                throw new AuthError("Не авторизованы")
            }

            const collectionId = String(req.params.collectionId)

            const collection = await prisma.collection.findFirst({
                where: {
                    id: collectionId,
                    userId
                }
            })

            if (collection == null) {
                throw new NotFoundError()
            }

            const cards = await prisma.wordCard.findMany({
                where: {
                    collectionId
                }
            })

            return res.status(200).json({ cards })
        } catch (err) {
            if (err instanceof AuthError) {
                throw err
            }

            if (err instanceof NotFoundError) {
                throw err
            }

            throw new ServerError()
        }
    }

    async getTestQuestions(req: Request, res: Response): Promise<void> {
        try {
            const collectionId = String(req.params.collectionId)
            const { userId } = req

            if (!userId) {
                throw new AuthError("Не авторизованы")
            }

            const collection = await prisma.collection.findFirst({
                where: {
                    id: collectionId,
                    userId
                }
            })

            if (collection == null) {
                throw new NotFoundError()
            }

            const wordCards = await prisma.wordCard.findMany({
                where: {
                    collectionId
                }
            })

            // find-or-create active test session
            let testSession = await prisma.collectionTest.findFirst({
                where: { collectionId, userId, completedAt: null },
                include: { answers: { select: { wordCardId: true } } },
            })

            if (testSession == null) {
                testSession = await prisma.collectionTest.create({
                    data: { collectionId, userId },
                    include: { answers: { select: { wordCardId: true } } },
                })
            }

            const answeredCardIds = testSession.answers.map((a) => a.wordCardId)

            if (wordCards.length < 4) {
                res.status(400).json({ message: "Для теста нужно минимум 4 карточки" })
                return
            }

            const questions = wordCards.map((card) => {
                const distractors = pickRandom(
                    wordCards.filter((candidate) => candidate.id !== card.id),
                    3
                ).map((candidate) => candidate.RearText)

                const options = shuffle([card.RearText, ...distractors])

                return {
                    id: card.id,
                    question: card.frontText,
                    options,
                    correctAnswer: card.RearText
                }
            })

            res.status(200).json({ questions, testSessionId: testSession.id, answeredCardIds })
            return
        } catch (err) {
            if (err instanceof AuthError) {
                throw err
            }

            if (err instanceof NotFoundError) {
                throw err
            }

            throw new ServerError()
        }
    }

    async submitTestAnswer(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req
            if (!userId) throw new AuthError("Не авторизованы")

            const collectionId = String(req.params.collectionId)
            const { testSessionId, wordCardId }: SubmitTestAnswerDto = req.body

            // verify the session belongs to this user and collection
            const testSession = await prisma.collectionTest.findFirst({
                where: { id: testSessionId, userId, collectionId, completedAt: null },
            })
            if (testSession == null) throw new NotFoundError()

            // upsert answer (idempotent)
            await prisma.collectionTestAnswer.upsert({
                where: { testId_wordCardId: { testId: testSessionId, wordCardId } },
                create: { testId: testSessionId, wordCardId },
                update: { answeredAt: new Date() },
            })

            const totalCount = await prisma.wordCard.count({ where: { collectionId } })
            const correctCount = await prisma.collectionTestAnswer.count({
                where: { testId: testSessionId },
            })

            // auto-complete the session if all cards answered
            if (correctCount >= totalCount) {
                await prisma.collectionTest.update({
                    where: { id: testSessionId },
                    data: { completedAt: new Date() },
                })
            }

            res.status(200).json({ correctCount, totalCount })
        } catch (err) {
            if (err instanceof AuthError || err instanceof NotFoundError) throw err
            throw new ServerError()
        }
    }

    async resetTestSession(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req
            if (!userId) throw new AuthError("Не авторизованы")

            const collectionId = String(req.params.collectionId)

            // mark any active session as completed
            await prisma.collectionTest.updateMany({
                where: { collectionId, userId, completedAt: null },
                data: { completedAt: new Date() },
            })

            // create fresh session
            const newSession = await prisma.collectionTest.create({
                data: { collectionId, userId },
            })

            res.status(201).json({ testSessionId: newSession.id })
        } catch (err) {
            if (err instanceof AuthError) throw err
            throw new ServerError()
        }
    }

}
export default new CollectionController()