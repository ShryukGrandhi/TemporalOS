/**
 * Medication Logging and Analysis Routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { MongoClient, Db, Collection } from 'mongodb';
import {
  MedicationConfirmationSchema,
  MedicationAnalysisSchema,
  MedicationLogSchema
} from '../schemas/medications';
import { GoogleGenerativeAI } from '@google/generative-ai';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/temporalos';
const DB_NAME = 'temporalos';
const COLLECTION_NAME = 'medication_logs';

let db: Db | null = null;
let collection: Collection | null = null;

// Initialize MongoDB connection
async function initMongoDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    collection = db.collection(COLLECTION_NAME);
    console.log('[Medications] MongoDB connected');
  } catch (error) {
    console.error('[Medications] MongoDB connection error:', error);
    // Continue without MongoDB - will use in-memory fallback
  }
}

initMongoDB();

// In-memory fallback storage
const memoryStore = new Map<string, z.infer<typeof MedicationLogSchema>>();

// Initialize Gemini
const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

export const medicationsRouter = Router();

/**
 * POST /api/medications/confirm
 * Log a medication confirmation and trigger analysis
 */
medicationsRouter.post('/confirm', async (req, res) => {
  try {
    const confirmation = MedicationConfirmationSchema.parse({
      ...req.body,
      timestamp: req.body.timestamp || Date.now()
    });

    // Generate log ID
    const logId = `med-log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Analyze medication with Gemini
    let analysis: z.infer<typeof MedicationAnalysisSchema> | null = null;
    if (genAI) {
      try {
        analysis = await analyzeMedicationWithGemini(confirmation);
      } catch (error) {
        console.error('[Medications] Gemini analysis error:', error);
        // Continue without analysis
      }
    }

    // Create log entry
    const logEntry: z.infer<typeof MedicationLogSchema> = {
      logId,
      sessionId: confirmation.sessionId,
      patientId: confirmation.patientId,
      medication: confirmation.medication,
      dosage: confirmation.dosage,
      route: confirmation.route,
      frequency: confirmation.frequency,
      startDate: confirmation.startDate,
      confirmedBy: confirmation.confirmedBy,
      analysis: analysis || undefined,
      timestamp: confirmation.timestamp,
      createdAt: Date.now()
    };

    // Save to database
    if (collection) {
      await collection.insertOne(logEntry);
    } else {
      memoryStore.set(logId, logEntry);
    }

    console.log(`[Medications] Logged medication confirmation: ${confirmation.medication} for patient ${confirmation.patientId}`);

    res.json({
      success: true,
      logId,
      analysis
    });
  } catch (error) {
    console.error('[Medications] Error logging medication:', error);
    res.status(400).json({ error: 'Invalid request', details: error });
  }
});

/**
 * GET /api/medications/logs/:sessionId
 * Get all medication logs for a session
 */
medicationsRouter.get('/logs/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;

    let logs: z.infer<typeof MedicationLogSchema>[] = [];

    if (collection) {
      const cursor = collection.find({ sessionId });
      logs = await cursor.toArray() as any[];
    } else {
      logs = Array.from(memoryStore.values()).filter(log => log.sessionId === sessionId);
    }

    res.json({ logs });
  } catch (error) {
    console.error('[Medications] Error fetching logs:', error);
    res.status(400).json({ error: 'Invalid request', details: error });
  }
});

/**
 * GET /api/medications/graph/:sessionId
 * Get knowledge graph data for a session
 */
medicationsRouter.get('/graph/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;

    let logs: z.infer<typeof MedicationLogSchema>[] = [];

    if (collection) {
      const cursor = collection.find({ sessionId });
      logs = await cursor.toArray() as any[];
    } else {
      logs = Array.from(memoryStore.values()).filter(log => log.sessionId === sessionId);
    }

    // Build graph from all medication analyses
    const nodes = new Map<string, any>();
    const edges: any[] = [];

    logs.forEach(log => {
      if (log.analysis) {
        // Add medication node
        nodes.set(log.medication, {
          id: log.medication,
          label: log.medication,
          type: 'medication',
          dosage: log.dosage,
          startDate: log.startDate
        });

        // Add nodes and edges from analysis
        log.analysis.graphNodes.forEach(node => {
          nodes.set(node.id, {
            ...node,
            ...node.properties
          });
        });

        log.analysis.graphEdges.forEach(edge => {
          edges.push({
            ...edge,
            ...edge.properties
          });
        });
      }
    });

    res.json({
      nodes: Array.from(nodes.values()),
      edges
    });
  } catch (error) {
    console.error('[Medications] Error building graph:', error);
    res.status(400).json({ error: 'Invalid request', details: error });
  }
});

/**
 * Analyze medication using Gemini
 */
async function analyzeMedicationWithGemini(
  confirmation: z.infer<typeof MedicationConfirmationSchema>
): Promise<z.infer<typeof MedicationAnalysisSchema>> {
  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `You are a clinical pharmacist analyzing a new medication prescription. Analyze the medication and provide a comprehensive analysis.

Medication: ${confirmation.medication}
Dosage: ${confirmation.dosage}
${confirmation.route ? `Route: ${confirmation.route}` : ''}
${confirmation.frequency ? `Frequency: ${confirmation.frequency}` : ''}

Provide a detailed analysis including:
1. Classification (category, indication, mechanism of action)
2. Drug interactions with common medications
3. Contraindications
4. Warnings
5. Monitoring requirements
6. Knowledge graph representation (nodes and edges showing relationships)

Output as JSON in this exact format:
{
  "classification": {
    "category": "string (e.g., ACE Inhibitor, Antibiotic)",
    "indication": "string (primary use)",
    "mechanism": "string (how it works)"
  },
  "interactions": [
    {
      "medication": "string (name of interacting drug)",
      "type": "contraindication|major|moderate|minor|beneficial",
      "description": "string (what happens)",
      "severity": "high|medium|low",
      "recommendation": "string (what to do)"
    }
  ],
  "contraindications": ["string array"],
  "warnings": ["string array"],
  "monitoring": ["string array (what to monitor)"],
  "graphNodes": [
    {
      "id": "string (unique ID)",
      "label": "string (display name)",
      "type": "medication|condition|symptom|lab|interaction",
      "properties": {}
    }
  ],
  "graphEdges": [
    {
      "source": "string (node ID)",
      "target": "string (node ID)",
      "type": "treats|causes|interacts_with|monitors|contraindicated_by",
      "polarity": "positive|negative|neutral",
      "properties": {}
    }
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Gemini response');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    // Validate with schema
    return MedicationAnalysisSchema.parse(analysis);
  } catch (error) {
    console.error('[Medications] Error parsing Gemini response:', error);
    throw error;
  }
}

