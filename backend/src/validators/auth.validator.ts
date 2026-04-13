import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

const loginSchema = Joi.object({
    login: Joi.string().required(),
    password: Joi.string().required(),
});

const refreshSchema = Joi.object({
    refreshToken: Joi.string().required(),
});

export const registerValidation = (req: Request, res: Response, next: NextFunction): void => {
    const { error } = loginSchema.validate(req.body);
    if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
    }
    next();
};

export const loginValidation = (req: Request, res: Response, next: NextFunction): void => {
    const { error } = loginSchema.validate(req.body);
    if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
    }
    next();
};

export const refreshValidation = (req: Request, res: Response, next: NextFunction): void => {
    const { error } = refreshSchema.validate(req.body);
    if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
    }
    next();
};

export default registerValidation;