import { Request, Response } from "express";
import AuthError from "../exceptions/AuthError";
import AudioTestService from "../services/AudioTestService";
import ServerError from "../exceptions/ServerError";

class AudioController {

    async uploadVoiceMessage(req: Request, res: Response) {
        const { userId } = req;
        if (userId == undefined) {
            throw new AuthError()
        }
        if (req.file == undefined) {
            throw new ServerError()
        }
        console.log("path is",req.file.path)
        const text = await AudioTestService.getTextFromSpeech(req.file.path);
        res.json({ text });

    }

    async transcribe(req: Request, res: Response) {
        const { userId } = req;
        if (userId == undefined) {
            throw new AuthError()
        }
        if (req.file == undefined) {
            throw new ServerError()
        }

        const text = await AudioTestService.getTextFromSpeech(req.file.path);
        res.json({ text });
    }

}

export default new AudioController();