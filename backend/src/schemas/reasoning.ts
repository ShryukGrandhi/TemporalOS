/**
 * Zod schemas for Claude reasoning
 */

import { z } from 'zod';

export const ClassifyModeRequestSchema = z.object({
  transcript: z.string().optional(),
  context: z.object({
    entities: z.array(z.any()).optional(),
    temporalTags: z.array(z.any()).optional(),
    patientData: z.any().optional(),
    recentActions: z.array(z.string()).optional()
  }).optional()
});

export const ClassifyModeResponseSchema = z.object({
  mode: z.enum(['past', 'present', 'future']),
  confidence: z.number().min(0).max(1),
  reason: z.string()
});

export const GenerateExplanationRequestSchema = z.object({
  mode: z.enum(['past', 'present', 'future']),
  context: z.object({
    entities: z.array(z.any()).optional(),
    patientData: z.any().optional()
  }).optional()
});

export const GenerateExplanationResponseSchema = z.object({
  explanation: z.string(),
  relevantData: z.array(z.object({
    id: z.string(),
    label: z.string(),
    value: z.string(),
    type: z.string()
  })).optional()
});

export type ClassifyModeRequest = z.infer<typeof ClassifyModeRequestSchema>;
export type ClassifyModeResponse = z.infer<typeof ClassifyModeResponseSchema>;
export type GenerateExplanationRequest = z.infer<typeof GenerateExplanationRequestSchema>;
export type GenerateExplanationResponse = z.infer<typeof GenerateExplanationResponseSchema>;

