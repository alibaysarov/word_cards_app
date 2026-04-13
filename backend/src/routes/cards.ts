import express from "express";
import cardCreate from "../validators/cardCreate.validator"
import updateCollectionValidation from "../validators/cardUpdate.validator";
import auth from "../middlewares/auth";
import WordCardController from "../controllers/WordCardController"

const router = express.Router();

router.post('/', auth, cardCreate, WordCardController.create);
router.put('/:cardId', auth, updateCollectionValidation, WordCardController.update);
router.delete('/:cardId', auth, WordCardController.delete);

export default router