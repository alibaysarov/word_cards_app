import BaseError from "./BaseError";

class ValidationError extends BaseError {
    constructor(message = 'Validation failed') {
        super(message, 400);
    }
}

export default ValidationError