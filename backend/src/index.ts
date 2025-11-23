/**
 * TemporalOS Backend Server
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { heidiRouter } from './routes/heidi';
import { nlpRouter } from './routes/nlp';
import { reasoningRouter } from './routes/reasoning';
import { stateRouter } from './routes/state';
import { medicationsRouter } from './routes/medications';
import { recommendationsRouter } from './routes/recommendations';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging (dev mode)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/api/heidi', heidiRouter);
app.use('/api/nlp', nlpRouter);
app.use('/api/reasoning', reasoningRouter);
app.use('/api/state', stateRouter);
app.use('/api/medications', medicationsRouter);
app.use('/api/recommendations', recommendationsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[TemporalOS] Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`[TemporalOS] Server running on http://localhost:${PORT}`);
});

