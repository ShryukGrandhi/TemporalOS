/**
 * AWS Comprehend Medical NLP Routes
 */

import { Router } from 'express';
import {
  AnalyzeTextRequestSchema,
  AnalyzeTextResponseSchema
} from '../schemas/nlp';
import { ComprehendMedicalClient, DetectEntitiesV2Command, DetectPHICommand, InferICD10CMCommand } from '@aws-sdk/client-comprehendmedical';

const client = new ComprehendMedicalClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

export const nlpRouter = Router();

/**
 * POST /api/nlp/analyze
 * Analyze text using AWS Comprehend Medical
 */
nlpRouter.post('/analyze', async (req, res) => {
  try {
    const body = AnalyzeTextRequestSchema.parse(req.body);

    // Detect entities
    const entitiesCommand = new DetectEntitiesV2Command({
      Text: body.text
    });

    let entities: any[] = [];
    let phi: any[] = [];
    let icd10Codes: any[] = [];

    try {
      const entitiesResponse = await client.send(entitiesCommand);
      entities = (entitiesResponse.Entities || []).map(entity => ({
        text: entity.Text || '',
        category: entity.Category || 'UNKNOWN',
        type: entity.Type,
        score: entity.Score,
        beginOffset: entity.BeginOffset,
        endOffset: entity.EndOffset
      }));
    } catch (error) {
      console.error('[NLP] Error detecting entities:', error);
      // Continue with empty entities if AWS fails
    }

    // Detect PHI if requested
    if (body.includePHI) {
      try {
        const phiCommand = new DetectPHICommand({
          Text: body.text
        });
        const phiResponse = await client.send(phiCommand);
        phi = (phiResponse.Entities || []).map(entity => ({
          text: entity.Text || '',
          category: entity.Category || 'UNKNOWN',
          type: entity.Type,
          score: entity.Score,
          beginOffset: entity.BeginOffset,
          endOffset: entity.EndOffset
        }));
      } catch (error) {
        console.error('[NLP] Error detecting PHI:', error);
      }
    }

    // Infer ICD-10-CM codes if requested
    if (body.includeICD10) {
      try {
        const icd10Command = new InferICD10CMCommand({
          Text: body.text
        });
        const icd10Response = await client.send(icd10Command);
        icd10Codes = (icd10Response.Entities || []).map(entity => ({
          code: entity.ICD10CMConcepts?.[0]?.Code || '',
          description: entity.ICD10CMConcepts?.[0]?.Description || '',
          score: entity.Score || 0
        }));
      } catch (error) {
        console.error('[NLP] Error inferring ICD-10:', error);
      }
    }

    // Simple temporal tagging (basic implementation)
    // TODO: Enhance with more sophisticated temporal analysis
    const temporalTags = extractTemporalTags(body.text, entities);

    const response: typeof AnalyzeTextResponseSchema._type = {
      entities,
      temporalTags,
      phi: body.includePHI ? phi : undefined,
      icd10Codes: body.includeICD10 ? icd10Codes : undefined
    };

    res.json(response);
  } catch (error) {
    console.error('[NLP] Error analyzing text:', error);
    res.status(400).json({ error: 'Invalid request', details: error });
  }
});

/**
 * Extract temporal tags from text and entities
 * This is a simplified implementation - can be enhanced
 */
function extractTemporalTags(text: string, entities: any[]): Array<{ text: string; temporalType: 'past' | 'present' | 'future' | 'unknown'; confidence: number }> {
  const temporalKeywords = {
    past: ['yesterday', 'last week', 'previous', 'history', 'past', 'ago', 'was', 'were'],
    present: ['now', 'current', 'today', 'this', 'is', 'are', 'showing', 'presenting'],
    future: ['will', 'plan', 'follow-up', 'next', 'schedule', 'future', 'should']
  };

  const tags: Array<{ text: string; temporalType: 'past' | 'present' | 'future' | 'unknown'; confidence: number }> = [];
  const lowerText = text.toLowerCase();

  // Check for temporal keywords
  for (const [type, keywords] of Object.entries(temporalKeywords)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        tags.push({
          text: keyword,
          temporalType: type as 'past' | 'present' | 'future',
          confidence: 0.7
        });
      }
    }
  }

  // Check entities for temporal indicators
  entities.forEach(entity => {
    if (entity.category === 'TIME_EXPRESSION' || entity.type === 'TIME') {
      tags.push({
        text: entity.text,
        temporalType: inferTemporalType(entity.text),
        confidence: entity.score || 0.5
      });
    }
  });

  return tags;
}

function inferTemporalType(text: string): 'past' | 'present' | 'future' | 'unknown' {
  const lower = text.toLowerCase();
  if (lower.includes('yesterday') || lower.includes('ago') || lower.includes('last')) {
    return 'past';
  }
  if (lower.includes('today') || lower.includes('now') || lower.includes('current')) {
    return 'present';
  }
  if (lower.includes('tomorrow') || lower.includes('next') || lower.includes('will')) {
    return 'future';
  }
  return 'unknown';
}

