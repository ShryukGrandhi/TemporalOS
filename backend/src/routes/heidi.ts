/**
 * Heidi API Routes
 */

import { Router } from 'express';
import {
  TranscriptRequestSchema,
  PatientDataRequestSchema,
  TranscriptResponseSchema,
  PatientDataResponseSchema
} from '../schemas/heidi';

const BASE_URL = 'https://registrar.api.heidihealth.com/api/v2/ml-scribe/open-api/';
const API_KEY = 'HIztzs28cXhQ3m4rMKYylG77i0bC283U';

export const heidiRouter = Router();

/**
 * GET /api/heidi/transcript
 * Fetch transcript from Heidi API
 */
heidiRouter.get('/transcript', async (req, res) => {
  try {
    const query = TranscriptRequestSchema.parse(req.query);

    // TODO: Replace with actual Heidi API call
    // For now, return mock data
    const mockResponse: typeof TranscriptResponseSchema._type = {
      transcript: [
        {
          id: '1',
          text: 'Patient reports chest pain that started yesterday.',
          timestamp: Date.now() - 3600000,
          speaker: 'patient'
        },
        {
          id: '2',
          text: 'Let me check the EKG results from this morning.',
          timestamp: Date.now() - 1800000,
          speaker: 'clinician'
        }
      ],
      sessionId: query.sessionId || 'mock-session-123'
    };

    res.json(mockResponse);
  } catch (error) {
    console.error('[Heidi] Error fetching transcript:', error);
    res.status(400).json({ error: 'Invalid request', details: error });
  }
});

/**
 * GET /api/heidi/patient/:patientId
 * Fetch patient data from Heidi API
 */
heidiRouter.get('/patient/:patientId', async (req, res) => {
  try {
    const params = PatientDataRequestSchema.parse({
      patientId: req.params.patientId,
      includeHistory: req.query.includeHistory === 'true'
    });

    // TODO: Replace with actual Heidi API call
    // For now, return mock data
    const mockResponse: typeof PatientDataResponseSchema._type = {
      patientId: params.patientId,
      demographics: {
        age: 45,
        gender: 'M'
      },
      vitals: [
        {
          name: 'Blood Pressure',
          value: '140/90',
          timestamp: Date.now() - 3600000,
          unit: 'mmHg'
        },
        {
          name: 'Heart Rate',
          value: '85',
          timestamp: Date.now() - 3600000,
          unit: 'bpm'
        }
      ],
      medications: [
        {
          name: 'Lisinopril',
          dosage: '10mg',
          startDate: '2024-01-15'
        }
      ],
      labs: [
        {
          name: 'Troponin',
          value: '0.02',
          timestamp: Date.now() - 7200000,
          unit: 'ng/mL'
        }
      ]
    };

    res.json(mockResponse);
  } catch (error) {
    console.error('[Heidi] Error fetching patient data:', error);
    res.status(400).json({ error: 'Invalid request', details: error });
  }
});

