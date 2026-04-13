import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import dtoValidation from './dtoValidation';

const schema = Joi.object({
    name: Joi.string().required(),
});

const createCollectionValidation = (req: Request, res: Response, next: NextFunction) => {
    dtoValidation(req, res, next, schema)
};

export default createCollectionValidation