/**
 * MongoDB Session State Routes
 */

import { Router } from 'express';
import {
  CreateSessionRequestSchema,
  UpdateSessionRequestSchema,
  GetSessionRequestSchema,
  SessionStateSchema
} from '../schemas/state';
import { MongoClient, Db, Collection } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/temporalos';
const DB_NAME = 'temporalos';
const COLLECTION_NAME = 'sessions';

let db: Db | null = null;
let collection: Collection | null = null;

// Initialize MongoDB connection
async function initMongoDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    collection = db.collection(COLLECTION_NAME);
    console.log('[State] MongoDB connected');
  } catch (error) {
    console.error('[State] MongoDB connection error:', error);
    // Continue without MongoDB - will use in-memory fallback
  }
}

initMongoDB();

// In-memory fallback storage
const memoryStore = new Map<string, typeof SessionStateSchema._type>();

export const stateRouter = Router();

/**
 * POST /api/state/session
 * Create a new session
 */
stateRouter.post('/session', async (req, res) => {
  try {
    const body = CreateSessionRequestSchema.parse(req.body);
    const sessionId = body.sessionId || generateSessionId();

    const session: typeof SessionStateSchema._type = {
      sessionId,
      lastMode: 'auto',
      signalHistory: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    if (collection) {
      await collection.insertOne(session);
    } else {
      memoryStore.set(sessionId, session);
    }

    res.json(session);
  } catch (error) {
    console.error('[State] Error creating session:', error);
    res.status(400).json({ error: 'Invalid request', details: error });
  }
});

/**
 * GET /api/state/session/:sessionId
 * Get session state
 */
stateRouter.get('/session/:sessionId', async (req, res) => {
  try {
    const params = GetSessionRequestSchema.parse({
      sessionId: req.params.sessionId
    });

    let session: typeof SessionStateSchema._type | null = null;

    if (collection) {
      session = await collection.findOne({ sessionId: params.sessionId }) as any;
    } else {
      session = memoryStore.get(params.sessionId) || null;
    }

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('[State] Error getting session:', error);
    res.status(400).json({ error: 'Invalid request', details: error });
  }
});

/**
 * PUT /api/state/session/:sessionId
 * Update session state
 */
stateRouter.put('/session/:sessionId', async (req, res) => {
  try {
    const params = GetSessionRequestSchema.parse({
      sessionId: req.params.sessionId
    });
    const body = UpdateSessionRequestSchema.parse({
      sessionId: params.sessionId,
      ...req.body
    });

    const update: any = {
      updatedAt: Date.now()
    };

    if (body.lastMode) {
      update.lastMode = body.lastMode;
    }

    if (body.signal) {
      update.$push = {
        signalHistory: {
          ...body.signal,
          timestamp: Date.now()
        }
      };
    }

    let session: typeof SessionStateSchema._type | null = null;

    if (collection) {
      const result = await collection.findOneAndUpdate(
        { sessionId: params.sessionId },
        { $set: update, ...(update.$push ? { $push: update.$push } : {}) },
        { returnDocument: 'after' }
      );
      session = result as any;
    } else {
      const existing = memoryStore.get(params.sessionId);
      if (existing) {
        const updated = {
          ...existing,
          ...update,
          signalHistory: body.signal
            ? [...existing.signalHistory, { ...body.signal, timestamp: Date.now() }]
            : existing.signalHistory
        };
        memoryStore.set(params.sessionId, updated);
        session = updated;
      }
    }

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('[State] Error updating session:', error);
    res.status(400).json({ error: 'Invalid request', details: error });
  }
});

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

