import express from "express";
import registerValidation from "../validators/auth.validator";
import AuthController from "../controllers/AuthController";
import auth from "../middlewares/auth";
import CollectionController from "../controllers/CollectionController";
import createCollectionValidation from "../validators/collectionCreate.validator";
import collectionTestAnswerValidation from '../validators/collectionTestAnswer.validator';
import SentenceController from '../controllers/SentenceController';

const router = express.Router();

router.get('/', auth, CollectionController.getByUser);
router.get('/recent', auth, CollectionController.getRecent);
router.get('/:collectionId/cards', auth, CollectionController.getCards);
router.get('/:collectionId/tests', auth, CollectionController.getTestQuestions);
router.post('/:collectionId/tests/answers', auth, collectionTestAnswerValidation, CollectionController.submitTestAnswer);
router.post('/:collectionId/tests/reset', auth, CollectionController.resetTestSession);
router.get('/:collectionId/sentences', auth, (req, res, next) =>
	SentenceController.getSentencesByCollection(req, res).catch(next)
);
router.post('/:collectionId/sentences/generate', auth, (req, res, next) =>
	SentenceController.generateSentences(req, res).catch(next)
);
router.get('/:collectionId', auth, CollectionController.getById)

router.post('/', auth, createCollectionValidation, CollectionController.create);

export default router