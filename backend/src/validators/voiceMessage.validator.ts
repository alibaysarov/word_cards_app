// validators/voiceMessage.validator.ts
import { Request, Response, NextFunction } from 'express';

const ALLOWED_MIMETYPES = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp3'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 МБ

const voiceMessageValidation = (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
        res.status(400).json({ message: '"audio" is required' });
        return;
    }

    if (!ALLOWED_MIMETYPES.includes(req.file.mimetype)) {
        res.status(400).json({ message: `Unsupported audio format: ${req.file.mimetype}` });
        return;
    }

    if (req.file.size > MAX_FILE_SIZE) {
        res.status(400).json({ message: 'File size exceeds 20 MB limit' });
        return;
    }

    next();
};

export default voiceMessageValidation;