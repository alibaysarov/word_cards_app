import BaseError from "./BaseError";

class ServerError extends BaseError {
    constructor(message = 'Internal server error') {
        super(message, 500);
    }
}

export default ServerError