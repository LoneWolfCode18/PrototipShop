import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: 'VALIDATION', message: 'Datos inválidos', details: err.flatten() },
    });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Error interno del servidor' } });
};
