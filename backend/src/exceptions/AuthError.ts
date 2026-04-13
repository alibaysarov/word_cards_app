import BaseError from "./BaseError";

class AuthError extends BaseError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
    }
}

export default AuthError