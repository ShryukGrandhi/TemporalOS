/**
 * Zod schemas for MongoDB session state
 */

import { z } from 'zod';

export const SessionStateSchema = z.object({
  sessionId: z.string(),
  lastMode: z.enum(['past', 'present', 'future', 'auto']),
  signalHistory: z.array(z.object({
    type: z.enum(['scroll', 'transcript', 'action']),
    data: z.any(),
    timestamp: z.number()
  })),
  createdAt: z.number(),
  updatedAt: z.number()
});

export const CreateSessionRequestSchema = z.object({
  sessionId: z.string().optional() // Auto-generate if not provided
});

export const UpdateSessionRequestSchema = z.object({
  sessionId: z.string(),
  lastMode: z.enum(['past', 'present', 'future', 'auto']).optional(),
  signal: z.object({
    type: z.enum(['scroll', 'transcript', 'action']),
    data: z.any()
  }).optional()
});

export const GetSessionRequestSchema = z.object({
  sessionId: z.string()
});

export type SessionState = z.infer<typeof SessionStateSchema>;
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;
export type UpdateSessionRequest = z.infer<typeof UpdateSessionRequestSchema>;
export type GetSessionRequest = z.infer<typeof GetSessionRequestSchema>;

