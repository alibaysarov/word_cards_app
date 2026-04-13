import { prisma } from "../database/prisma";
import { LoginDto, RegisterDto, TokenDto, UserProfileDto } from "../dto/auth";
import AuthError from "../exceptions/AuthError";
import NotFoundError from "../exceptions/NotFoundError";
import passwordHelper from "../utilities/password";
import JwtService from "./JwtService";

class AuthService {
    async register(dto: RegisterDto): Promise<TokenDto> {
        const { login, password } = dto;

        return await prisma.$transaction(async (tx) => {
            const existing = await tx.user.findUnique({
                where: { login }
            });

            if (existing) {
                throw new AuthError('Такой пользователь уже есть!')
            }

            const hashedPass = await passwordHelper.passwordHash(password);

            const created = await tx.user.create({
                data: { login, password: hashedPass }
            });

            return JwtService.generateTokenPair(created.id);
        });

    }

    async login(dto: LoginDto): Promise<TokenDto> {
        const { login, password } = dto;

        const user = await prisma.user.findUnique({
            where: { login }
        });

        if (!user) {
            throw new AuthError('Неверный логин или пароль');
        }

        const isPasswordValid = await passwordHelper.passwordCompare(password, user.password);

        if (!isPasswordValid) {
            throw new AuthError('Неверный логин или пароль');
        }

        return JwtService.generateTokenPair(user.id);
    }

    async refresh(refreshToken: string): Promise<TokenDto> {
        let userId: string;

        try {
            userId = JwtService.validateRefreshToken(refreshToken);
        } catch {
            throw new AuthError('Невалидный или истёкший refresh token');
        }

        return JwtService.generateTokenPair(userId);
    }

    async logout(): Promise<void> {
        return;
    }

    async getMe(userId: string): Promise<UserProfileDto> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                login: true
            }
        });

        if (!user) {
            throw new NotFoundError('User');
        }

        return user;
    }
}

export default new AuthService()