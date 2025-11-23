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
// Load Gemini API - lazily so .env is loaded
let genAI: GoogleGenerativeAI | null = null;

function getGenAI() {
  if (genAI) return genAI;
  
  const apiKey = process.env.GEMINI_API_KEY?.trim().replace(/^["']|["']$/g, ''); // Remove quotes
  console.log('[Medications] Initializing Gemini API...');
  console.log('[Medications] API Key present:', !!apiKey);
  console.log('[Medications] API Key length:', apiKey?.length || 0);
  
  if (apiKey && apiKey.length > 10) {
    console.log('[Medications] ✅ Gemini API initialized successfully');
    genAI = new GoogleGenerativeAI(apiKey);
    return genAI;
  }
  
  console.log('[Medications] ❌ Gemini API NOT initialized - key missing or invalid');
  return null;
}

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
    const ai = getGenAI();
    if (ai) {
      try {
        console.log(`[Medications] 🧠 Using Gemini AI to analyze: ${confirmation.medication}`);
        analysis = await analyzeMedicationWithGemini(confirmation);
        console.log(`[Medications] ✅ Gemini analysis complete for ${confirmation.medication}:`, {
          category: analysis.classification.category,
          indication: analysis.classification.indication,
          interactions: analysis.interactions.length,
          graphNodes: analysis.graphNodes.length,
          graphEdges: analysis.graphEdges.length
        });
      } catch (error) {
        console.error('[Medications] ❌ Gemini analysis error:', error);
        console.log('[Medications] ⚠️ Falling back to basic analysis');
        // Use fallback demo analysis if Gemini fails
        analysis = getFallbackAnalysis(confirmation);
      }
    } else {
      // Use fallback demo analysis if Gemini not configured
      console.warn('[Medications] ⚠️ Gemini API key not configured, using fallback analysis');
      console.log('[Medications] 💡 To enable AI analysis, set GEMINI_API_KEY in your .env file');
      analysis = getFallbackAnalysis(confirmation);
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
      // Always add medication node, even without analysis
      nodes.set(log.medication, {
        id: log.medication,
        label: log.medication,
        type: 'medication',
        dosage: log.dosage,
        startDate: log.startDate
      });

      // Add nodes and edges from analysis if available
      if (log.analysis) {
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
      } else {
        // Create basic edges for medications without analysis
        // Connect to common conditions they might treat
        const basicConnections = getBasicMedicationConnections(log.medication);
        basicConnections.forEach(connection => {
          nodes.set(connection.condition, {
            id: connection.condition,
            label: connection.condition,
            type: 'condition'
          });
          edges.push({
            source: log.medication,
            target: connection.condition,
            type: 'treats',
            polarity: 'positive'
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
  const ai = getGenAI();
  if (!ai) {
    throw new Error('Gemini API key not configured');
  }

  const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' }); // Using Gemini 2.5 Flash (latest)

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

/**
 * Get fallback analysis when Gemini is unavailable
 */
function getFallbackAnalysis(
  confirmation: z.infer<typeof MedicationConfirmationSchema>
): z.infer<typeof MedicationAnalysisSchema> {
  const medName = confirmation.medication.toLowerCase();
  
  // Basic medication classifications
  const classifications: Record<string, { category: string; indication: string; mechanism: string }> = {
    'lisinopril': {
      category: 'ACE Inhibitor',
      indication: 'Hypertension, Heart Failure',
      mechanism: 'Inhibits angiotensin-converting enzyme, reducing blood pressure'
    },
    'metformin': {
      category: 'Biguanide',
      indication: 'Type 2 Diabetes',
      mechanism: 'Decreases hepatic glucose production and improves insulin sensitivity'
    },
    'atorvastatin': {
      category: 'HMG-CoA Reductase Inhibitor (Statin)',
      indication: 'Hyperlipidemia, Cardiovascular Disease Prevention',
      mechanism: 'Inhibits HMG-CoA reductase, reducing cholesterol synthesis'
    },
    'aspirin': {
      category: 'Antiplatelet Agent',
      indication: 'Cardiovascular Disease Prevention, Pain Relief',
      mechanism: 'Irreversibly inhibits cyclooxygenase, preventing platelet aggregation'
    }
  };

  const classification = classifications[medName] || {
    category: 'Unknown',
    indication: 'Various conditions',
    mechanism: 'Unknown mechanism'
  };

  // Create basic graph structure
  const graphNodes: any[] = [
    {
      id: confirmation.medication,
      label: confirmation.medication,
      type: 'medication'
    }
  ];

  const graphEdges: any[] = [];

  // Add condition nodes and edges based on indication
  if (classification.indication.includes('Hypertension')) {
    graphNodes.push({ id: 'Hypertension', label: 'Hypertension', type: 'condition' });
    graphEdges.push({
      source: confirmation.medication,
      target: 'Hypertension',
      type: 'treats',
      polarity: 'positive'
    });
  }
  if (classification.indication.includes('Diabetes')) {
    graphNodes.push({ id: 'Type 2 Diabetes', label: 'Type 2 Diabetes', type: 'condition' });
    graphEdges.push({
      source: confirmation.medication,
      target: 'Type 2 Diabetes',
      type: 'treats',
      polarity: 'positive'
    });
  }
  if (classification.indication.includes('Hyperlipidemia') || classification.indication.includes('Cardiovascular')) {
    graphNodes.push({ id: 'Hyperlipidemia', label: 'Hyperlipidemia', type: 'condition' });
    graphEdges.push({
      source: confirmation.medication,
      target: 'Hyperlipidemia',
      type: 'treats',
      polarity: 'positive'
    });
  }

  return {
    classification,
    interactions: [],
    contraindications: [],
    warnings: [],
    monitoring: [],
    graphNodes,
    graphEdges
  };
}

/**
 * Get basic medication connections for medications without analysis
 */
function getBasicMedicationConnections(medication: string): Array<{ condition: string }> {
  const medName = medication.toLowerCase();
  const connections: Array<{ condition: string }> = [];

  if (medName.includes('lisinopril') || medName.includes('ace')) {
    connections.push({ condition: 'Hypertension' });
    connections.push({ condition: 'Heart Failure' });
  }
  if (medName.includes('metformin')) {
    connections.push({ condition: 'Type 2 Diabetes' });
  }
  if (medName.includes('atorvastatin') || medName.includes('statin')) {
    connections.push({ condition: 'Hyperlipidemia' });
  }
  if (medName.includes('aspirin')) {
    connections.push({ condition: 'Cardiovascular Disease' });
  }

  return connections;
}

