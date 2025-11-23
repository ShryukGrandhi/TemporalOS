/**
 * Zod schemas for NLP/AWS Comprehend
 */

import { z } from 'zod';

export const AnalyzeTextRequestSchema = z.object({
  text: z.string().min(1),
  includePHI: z.boolean().optional().default(false),
  includeICD10: z.boolean().optional().default(false)
});

export const EntitySchema = z.object({
  text: z.string(),
  category: z.string(),
  type: z.string().optional(),
  score: z.number().optional(),
  beginOffset: z.number().optional(),
  endOffset: z.number().optional()
});

export const TemporalTagSchema = z.object({
  text: z.string(),
  temporalType: z.enum(['past', 'present', 'future', 'unknown']),
  confidence: z.number()
});

export const AnalyzeTextResponseSchema = z.object({
  entities: z.array(EntitySchema),
  temporalTags: z.array(TemporalTagSchema),
  phi: z.array(EntitySchema).optional(),
  icd10Codes: z.array(z.object({
    code: z.string(),
    description: z.string(),
    score: z.number()
  })).optional()
});

export type AnalyzeTextRequest = z.infer<typeof AnalyzeTextRequestSchema>;
export type AnalyzeTextResponse = z.infer<typeof AnalyzeTextResponseSchema>;
export type Entity = z.infer<typeof EntitySchema>;
export type TemporalTag = z.infer<typeof TemporalTagSchema>;

