import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import dtoValidation from './dtoValidation';

const schema = Joi.object({
    frontText: Joi.string().required(),
    rearText: Joi.string().required(),
});

const updateCollectionValidation = (req: Request, res: Response, next: NextFunction) => {
    dtoValidation(req, res, next, schema);
};

export default updateCollectionValidation