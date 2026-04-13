import errorHandler from "./middlewares/errorHandler"
import cors from 'cors';
import express, { Request, Response } from 'express';
import 'dotenv/config'
import router from './routes';
import { checkDatabaseConnection, prisma } from './database/prisma';
import NotFoundError from "./exceptions/NotFoundError";


async function main() {
    await checkDatabaseConnection()
    const app = express();
    const { APP_PORT = 3010 } = process.env
    const { CORS_ORIGIN } = process.env
    if (!CORS_ORIGIN) {
        throw new Error('CORS_ORIGIN environment variable is required')
    }

    app.use(cors({
        origin: CORS_ORIGIN,
        credentials: true,
    }));

    app.use(express.json());

    app.use("/api", router);

    app.use((req, res, next) => {
        next(new NotFoundError('Route'));
    });

    // ВАЖНО: errorHandler регистрируется последним и принимает 4 аргумента
    app.use(errorHandler);


    app.listen(APP_PORT, () => {
        console.log(`Server running on http://localhost:${APP_PORT}`);
    });
}

main()

process.on('SIGINT', async () => {
    await prisma.$disconnect();
    console.log('🔌 Соединение с БД закрыто');
    process.exit(0);
});