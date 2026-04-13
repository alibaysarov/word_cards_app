import * as jwt from 'jsonwebtoken';
import { TokenDto } from '../dto/auth';

const { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } = process.env;
if (!JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET is required');
if (!JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET is required');

interface JwtPayload {
    userId: string;
}

class JwtService {
    generateTokenPair(userId: string): TokenDto {
        const payload: JwtPayload = { userId };
        const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET!, { expiresIn: '15m' });
        const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET!, { expiresIn: '7d' });
        return { accessToken, refreshToken };
    }

    validateAccessToken(token: string): string {
        const payload = jwt.verify(token, JWT_ACCESS_SECRET!) as jwt.JwtPayload & JwtPayload;
        return payload.userId;
    }

    validateRefreshToken(token: string): string {
        const payload = jwt.verify(token, JWT_REFRESH_SECRET!) as jwt.JwtPayload & JwtPayload;
        return payload.userId;
    }
}

export default new JwtService();