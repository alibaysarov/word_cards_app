import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

if(process.env.DB_URL == undefined) {
    throw Error('Не указано url для подключения к бд!')
}
const connectionString = `${process.env.DB_URL}`;
console.log("string is ",connectionString);
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export async function checkDatabaseConnection(): Promise<void> {
    try {
        await prisma.$connect();
        console.log('✅ Подключение к базе данных успешно');
    } catch (error) {
        console.error('❌ Ошибка подключения к базе данных:', error);
        process.exit(1);
    }
}

export { prisma };