import { Request, Response } from "express"
import SentenceService from "../services/SentenceService";
import AuthError from "../exceptions/AuthError";


class SentenceController {

    sentenceService

    constructor() {
        this.sentenceService = SentenceService
    }

    async getSentencesByCollection(req: Request, res: Response) {
        const { userId } = req;
        if (userId == undefined) {
            throw new AuthError()
        }
        const { collectionId } = req.params;
        const sentences = await this.sentenceService.getSentencesByCollection(String(collectionId));
        return res.status(200).json(sentences);
    }
    
    async generateSentences(req: Request, res: Response) {
        const { userId } = req;
        if (userId == undefined) {
            throw new AuthError()
        }
        const { collectionId } = req.params;

        const sentences = await this.sentenceService.createSentences(userId, String(collectionId), 5);
        return res.status(200).json(sentences);
    }
}

export default new SentenceController();