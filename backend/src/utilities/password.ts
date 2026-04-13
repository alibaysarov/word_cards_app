import bcrypt from "bcrypt-ts";

class PasswordHelper {

    async passwordHash(password: string) {
        const hash = await bcrypt.hash(password, 10);
        return hash;
    }

    async passwordCompare(password: string, hashedPassword: string) {
        const isTrue = await bcrypt.compare(password, hashedPassword);
        return isTrue;
    }

}

export default new PasswordHelper();
