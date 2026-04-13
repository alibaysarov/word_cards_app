import Joi from "joi";
import { Request, Response, NextFunction } from 'express';

const dtoValidation = (req: Request, res: Response, next: NextFunction, schema: Joi.ObjectSchema<any>, status: number = 400) => {
    const { error } = schema.validate(req.body);
    if (error) {
        res.status(status).json({ message: error.details[0].message });
        return;
    }
    next();
};

export default dtoValidation