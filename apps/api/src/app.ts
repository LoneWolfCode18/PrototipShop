import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFound } from './middlewares/errorHandler';
import { adminRouter } from './routes/admin';
import { publicRouter } from './routes/public';

export const app = express();

app.set('trust proxy', 1); // detrás del proxy de Render
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()) }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));

app.use('/api/v1', publicRouter);
app.use('/api/v1/admin', adminRouter);

app.use(notFound);
app.use(errorHandler);
