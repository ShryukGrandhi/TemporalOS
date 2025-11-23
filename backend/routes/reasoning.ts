/**
 * Claude Reasoning Routes
 */

import { Router } from 'express';
import {
  ClassifyModeRequestSchema,
  ClassifyModeResponseSchema,
  GenerateExplanationRequestSchema,
  GenerateExplanationResponseSchema
} from '../schemas/reasoning';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const MODEL_ID = process.env.CLAUDE_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';

export const reasoningRouter = Router();

/**
 * POST /api/reasoning/classify
 * Classify reasoning mode using Claude
 */
reasoningRouter.post('/classify', async (req, res) => {
  try {
    const body = ClassifyModeRequestSchema.parse(req.body);

    const systemPrompt = `You are determining the cognitive mode of a clinician's interaction.

Choose one:
- PAST: They are reviewing history, scrolling past events, or asking retrospective questions.
- PRESENT: They are interpreting current data, reacting to abnormal values, or in active diagnostic reasoning.
- FUTURE: They are making decisions, generating plans, or setting follow-ups.

Output format (JSON only):
{"mode": "past" | "present" | "future", "confidence": number (0-1), "reason": string}`;

    const userPrompt = buildClassificationPrompt(body);

    const prompt = `\n\nHuman: ${userPrompt}\n\nAssistant:`;

    try {
      const command = new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      const response = await client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const content = responseBody.content[0].text;

      // Parse Claude's response
      let result;
      try {
        // Try to extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        // Fallback: infer from text
        console.warn('[Reasoning] Failed to parse Claude response, using fallback');
        result = inferModeFromText(content);
      }

      // Validate response
      const validated = ClassifyModeResponseSchema.parse(result);
      res.json(validated);
    } catch (awsError) {
      console.error('[Reasoning] AWS Bedrock error:', awsError);
      // Fallback to rule-based classification
      const fallback = classifyModeFallback(body);
      res.json(fallback);
    }
  } catch (error) {
    console.error('[Reasoning] Error classifying mode:', error);
    res.status(400).json({ error: 'Invalid request', details: error });
  }
});

/**
 * POST /api/reasoning/explain
 * Generate explanation for reasoning mode
 */
reasoningRouter.post('/explain', async (req, res) => {
  try {
    const body = GenerateExplanationRequestSchema.parse(req.body);

    // TODO: Implement Claude explanation generation
    // For now, return mock response
    const mockResponse: typeof GenerateExplanationResponseSchema._type = {
      explanation: `The clinician is in ${body.mode} reasoning mode.`,
      relevantData: []
    };

    res.json(mockResponse);
  } catch (error) {
    console.error('[Reasoning] Error generating explanation:', error);
    res.status(400).json({ error: 'Invalid request', details: error });
  }
});

function buildClassificationPrompt(request: typeof ClassifyModeRequestSchema._type): string {
  let prompt = 'Analyze the following clinical interaction:\n\n';

  if (request.transcript) {
    prompt += `Transcript: ${request.transcript}\n\n`;
  }

  if (request.context?.entities && request.context.entities.length > 0) {
    prompt += `Medical Entities: ${JSON.stringify(request.context.entities)}\n\n`;
  }

  if (request.context?.temporalTags && request.context.temporalTags.length > 0) {
    prompt += `Temporal Indicators: ${JSON.stringify(request.context.temporalTags)}\n\n`;
  }

  if (request.context?.recentActions && request.context.recentActions.length > 0) {
    prompt += `Recent Actions: ${request.context.recentActions.join(', ')}\n\n`;
  }

  prompt += 'Determine the reasoning mode and provide your analysis.';
  return prompt;
}
function inferModeFromText(text: string): typeof ClassifyModeResponseSchema._type {
  const lower = text.toLowerCase();
  if (lower.includes('past') || lower.includes('history')) {
    return { mode: 'past', confidence: 0.6, reason: 'Inferred from response text' };
  }
  if (lower.includes('future') || lower.includes('plan')) {
    return { mode: 'future', confidence: 0.6, reason: 'Inferred from response text' };
  }
  return { mode: 'present', confidence: 0.5, reason: 'Default fallback' };
}

function classifyModeFallback(request: typeof ClassifyModeRequestSchema._type): typeof ClassifyModeResponseSchema._type {
  // Simple rule-based fallback
  const transcript = request.transcript?.toLowerCase() || '';
  const actions = request.context?.recentActions || [];

  // Check for future indicators
  if (transcript.includes('plan') || transcript.includes('schedule') || transcript.includes('follow-up') ||
      actions.some(a => a.toLowerCase().includes('order') || a.toLowerCase().includes('prescribe'))) {
    return { mode: 'future', confidence: 0.7, reason: 'Rule-based: planning/ordering detected' };
  }

  // Check for past indicators
  if (transcript.includes('history') || transcript.includes('previous') || transcript.includes('yesterday') ||
      actions.some(a => a.toLowerCase().includes('scroll') || a.toLowerCase().includes('review'))) {
    return { mode: 'past', confidence: 0.7, reason: 'Rule-based: historical review detected' };
  }

  // Default to present
  return { mode: 'present', confidence: 0.6, reason: 'Rule-based: default to present evaluation' };
}


