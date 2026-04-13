import fs from 'fs';
import express from 'express';
import multer from "multer";
import path from 'node:path';
import auth from "../middlewares/auth";
import AudioController from '../controllers/AudioController';
import voiceMessageValidation from '../validators/voiceMessage.validator';
import ServerError from '../exceptions/ServerError';
const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = "uploads/voice_messages";
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const name = `audio-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, name);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 МБ
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("audio/")) {
            cb(null, true);
        } else {
            cb(new ServerError("Only audio files are allowed"));
        }
    },
});


router.post(
    '/test_message',
    auth,
    upload.single("audio"),
    voiceMessageValidation,
    AudioController.uploadVoiceMessage
);


export default router;