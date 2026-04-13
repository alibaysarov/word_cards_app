import { Request, Response } from "express"
import AuthError from "../exceptions/AuthError";
import { CardCreateDto } from "../dto/cardCreate";
import { prisma } from "../database/prisma";
import NotFoundError from "../exceptions/NotFoundError";
import { CardUpdateDto } from "../dto/cardUpdate";
import ServerError from "../exceptions/ServerError";

class WordCardController {


    async create(req: Request, res: Response) {
        const { userId } = req
        const body: CardCreateDto = req.body
        if (!userId) {
            throw new AuthError("Не авторизованы")
        }
        const collection = await prisma.collection.findFirst({
            where: {
                id: body.collectionId
            }
        });

        if (collection == null) {
            throw new NotFoundError()
        }
        const created = await prisma.wordCard.create({
            data: {
                frontText: body.frontText,
                RearText: body.rearText,
                collectionId: body.collectionId
            }
        })
        return res.status(201).json(created)
    }

    async update(req: Request, res: Response) {
        const cardId = String(req.params.cardId);
        const dto: CardUpdateDto = req.body;
        try {
            const updatedCard = await prisma.wordCard.update({
                where: { id: cardId },
                data: {
                    frontText: dto.frontText,
                    RearText: dto.rearText
                },
            });

            return res.status(200).json(updatedCard);
        } catch (err) {
            console.error(err)
            throw new ServerError();
        }
    }

    async delete(req: Request, res: Response) {

        const cardId = String(req.params.cardId);

        try {

            await prisma.wordCard.delete({
                where: { id: cardId },
            });
            return res.status(204).json();
        } catch (err) {
            throw new ServerError();
        }
    }

    async getCardsByCollection(req: Request, res: Response) {
        const { collectionId } = req.params
    }

    async getById(req: Request, res: Response) { }
}

export default new WordCardController();