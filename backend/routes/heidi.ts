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

    // Comprehensive demo patient data
    const now = Date.now();
    const mockResponse: typeof PatientDataResponseSchema._type = {
      patientId: params.patientId || 'DEMO-PATIENT-001',
      demographics: {
        age: 52,
        gender: 'F'
      },
      vitals: [
        {
          name: 'Blood Pressure',
          value: '148/92',
          timestamp: now - 3600000, // 1 hour ago
          unit: 'mmHg'
        },
        {
          name: 'Heart Rate',
          value: '98',
          timestamp: now - 3600000,
          unit: 'bpm'
        },
        {
          name: 'Temperature',
          value: '98.6',
          timestamp: now - 3600000,
          unit: '°F'
        },
        {
          name: 'Oxygen Saturation',
          value: '97',
          timestamp: now - 3600000,
          unit: '%'
        }
      ],
      medications: [
        {
          name: 'Lisinopril',
          dosage: '10mg',
          startDate: '2024-01-15'
        },
        {
          name: 'Metformin',
          dosage: '500mg twice daily',
          startDate: '2023-11-20'
        },
        {
          name: 'Atorvastatin',
          dosage: '20mg',
          startDate: '2023-09-10'
        },
        {
          name: 'Aspirin',
          dosage: '81mg',
          startDate: '2023-06-01'
        }
      ],
      labs: [
        {
          name: 'Hemoglobin A1C',
          value: '7.2',
          timestamp: now - 2592000000, // 30 days ago
          unit: '%'
        },
        {
          name: 'Creatinine',
          value: '1.4',
          timestamp: now - 2592000000,
          unit: 'mg/dL'
        },
        {
          name: 'eGFR',
          value: '48',
          timestamp: now - 2592000000,
          unit: 'mL/min/1.73m²'
        },
        {
          name: 'Total Cholesterol',
          value: '245',
          timestamp: now - 2592000000,
          unit: 'mg/dL'
        },
        {
          name: 'LDL Cholesterol',
          value: '165',
          timestamp: now - 2592000000,
          unit: 'mg/dL'
        },
        {
          name: 'Troponin',
          value: '0.02',
          timestamp: now - 7200000, // 2 hours ago
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

