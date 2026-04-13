import auth from "./auth";
import collection from "./collections"
import cards from "./cards"
import express from "express";
import audio from "./audio"
const router = express.Router();

router.use('/auth', auth)
router.use('/collections', collection)
router.use('/cards', cards)
router.use('/audio', audio)
export default router