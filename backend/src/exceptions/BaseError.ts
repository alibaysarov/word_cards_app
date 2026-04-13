
interface BaseErrorInterface {
    statusCode: number
    isOperational: boolean
}

class BaseError extends Error implements BaseErrorInterface {
    isOperational: boolean;
    statusCode: number;

    constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
export default BaseError