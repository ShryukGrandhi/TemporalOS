/**
 * Zod schemas for Heidi API
 */

import { z } from 'zod';

export const TranscriptRequestSchema = z.object({
  sessionId: z.string().optional(),
  limit: z.number().int().positive().max(100).optional().default(50)
});

export const PatientDataRequestSchema = z.object({
  patientId: z.string(),
  includeHistory: z.boolean().optional().default(true)
});

export const TranscriptResponseSchema = z.object({
  transcript: z.array(z.object({
    id: z.string(),
    text: z.string(),
    timestamp: z.number(),
    speaker: z.string().optional()
  })),
  sessionId: z.string()
});

export const PatientDataResponseSchema = z.object({
  patientId: z.string(),
  demographics: z.object({
    age: z.number().optional(),
    gender: z.string().optional()
  }).optional(),
  vitals: z.array(z.object({
    name: z.string(),
    value: z.string(),
    timestamp: z.number(),
    unit: z.string().optional()
  })).optional(),
  medications: z.array(z.object({
    name: z.string(),
    dosage: z.string().optional(),
    startDate: z.string().optional()
  })).optional(),
  labs: z.array(z.object({
    name: z.string(),
    value: z.string(),
    timestamp: z.number(),
    unit: z.string().optional()
  })).optional()
});

export type TranscriptRequest = z.infer<typeof TranscriptRequestSchema>;
export type PatientDataRequest = z.infer<typeof PatientDataRequestSchema>;
export type TranscriptResponse = z.infer<typeof TranscriptResponseSchema>;
export type PatientDataResponse = z.infer<typeof PatientDataResponseSchema>;

