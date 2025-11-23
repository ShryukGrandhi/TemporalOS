/**
 * Zod schemas for medication logging and analysis
 */

import { z } from 'zod';

export const MedicationConfirmationSchema = z.object({
  sessionId: z.string(),
  patientId: z.string(),
  medication: z.string(),
  dosage: z.string(),
  route: z.string().optional(),
  frequency: z.string().optional(),
  startDate: z.string().optional(),
  confirmedBy: z.string().optional(), // Clinician ID or name
  timestamp: z.number().optional().default(Date.now())
});

export const MedicationAnalysisSchema = z.object({
  medication: z.string(),
  classification: z.object({
    category: z.string(), // e.g., "ACE Inhibitor", "Antibiotic", "Anticoagulant"
    indication: z.string(), // Primary use
    mechanism: z.string().optional(), // How it works
  }),
  interactions: z.array(z.object({
    medication: z.string(),
    type: z.enum(['contraindication', 'major', 'moderate', 'minor', 'beneficial']),
    description: z.string(),
    severity: z.enum(['high', 'medium', 'low']),
    recommendation: z.string().optional()
  })),
  contraindications: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  monitoring: z.array(z.string()).optional(), // What to monitor
  graphNodes: z.array(z.object({
    id: z.string(),
    label: z.string(),
    type: z.enum(['medication', 'condition', 'symptom', 'lab', 'interaction']),
    properties: z.record(z.any()).optional()
  })),
  graphEdges: z.array(z.object({
    source: z.string(),
    target: z.string(),
    type: z.enum(['treats', 'causes', 'interacts_with', 'monitors', 'contraindicated_by']),
    polarity: z.enum(['positive', 'negative', 'neutral']).optional(),
    properties: z.record(z.any()).optional()
  }))
});

export const MedicationLogSchema = z.object({
  logId: z.string(),
  sessionId: z.string(),
  patientId: z.string(),
  medication: z.string(),
  dosage: z.string(),
  route: z.string().optional(),
  frequency: z.string().optional(),
  startDate: z.string().optional(),
  confirmedBy: z.string().optional(),
  analysis: MedicationAnalysisSchema.optional(),
  timestamp: z.number(),
  createdAt: z.number().default(Date.now())
});

export type MedicationConfirmation = z.infer<typeof MedicationConfirmationSchema>;
export type MedicationAnalysis = z.infer<typeof MedicationAnalysisSchema>;
export type MedicationLog = z.infer<typeof MedicationLogSchema>;

