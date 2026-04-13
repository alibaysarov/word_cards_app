import { NextFunction, Request, Response } from 'express';
import AuthError from '../exceptions/AuthError';
import JwtService from '../services/JwtService';

export default function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        next(new AuthError('Токен отсутствует'));
        return;
    }

    const token = authHeader.slice(7);
    try {
        const userId = JwtService.validateAccessToken(token);
        req.userId = userId;
        next();
    } catch {
        next(new AuthError('Недействительный или истёкший access token'));
    }
}