import { Request, Response } from 'express';
import { LoginDto, RegisterDto, RefreshDto } from '../dto/auth';
import AuthService from '../services/AuthService';

class AuthController {

    async register(req: Request, res: Response) {
        const body: RegisterDto = req.body;
        const result = await AuthService.register(body);
        res.status(201).json(result);
    }

    async login(req: Request, res: Response) {
        const body: LoginDto = req.body;
        const result = await AuthService.login(body);
        res.status(200).json(result);
    }

    async refresh(req: Request, res: Response) {
        const { refreshToken }: RefreshDto = req.body;
        const result = await AuthService.refresh(refreshToken);
        res.status(200).json(result);
    }

    async logout(req: Request, res: Response) {
        await AuthService.logout();
        res.status(204).send();
    }

    async me(req: Request, res: Response) {
        const userId = req.userId!;
        const result = await AuthService.getMe(userId);
        res.status(200).json(result);
    }
}

export default new AuthController();