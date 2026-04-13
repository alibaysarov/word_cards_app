import express from 'express';
import {
	registerValidation,
	loginValidation,
	refreshValidation,
} from '../validators/auth.validator';
import AuthController from '../controllers/AuthController';
import authMiddleware from '../middlewares/auth';

const router = express.Router();

router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);
router.post('/refresh', refreshValidation, AuthController.refresh);
router.post('/logout', AuthController.logout);
router.get('/me', authMiddleware, AuthController.me);

export default router