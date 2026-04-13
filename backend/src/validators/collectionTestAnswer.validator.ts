import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import dtoValidation from './dtoValidation';

const schema = Joi.object({
    testSessionId: Joi.string().uuid().required(),
    wordCardId: Joi.string().uuid().required(),
});

const collectionTestAnswerValidation = (req: Request, res: Response, next: NextFunction) => {
    dtoValidation(req, res, next, schema);
};

export default collectionTestAnswerValidation;
