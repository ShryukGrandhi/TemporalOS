/**
 * VAPI Route - Voice AI for Phone Calls
 * Handles outbound call scheduling via VAPI
 */

import { Router } from 'express';
import { z } from 'zod';

export const vapiRouter = Router();

const OutboundCallSchema = z.object({
  phoneNumber: z.string(),
  patientName: z.string().optional(),
  purpose: z.string().optional()
});

/**
 * POST /api/vapi/call/outbound
 * Initiates an outbound call via VAPI
 */
vapiRouter.post('/call/outbound', async (req, res) => {
  try {
    console.log('[VAPI] 📞 Outbound call request received');
    
    const callData = OutboundCallSchema.parse(req.body);
    const apiKey = process.env.VAPI_API_KEY?.trim();

    if (!apiKey) {
      console.error('[VAPI] ❌ VAPI_API_KEY not configured');
      return res.status(500).json({ 
        error: 'VAPI API key not configured',
        details: 'Please set VAPI_API_KEY in your .env file'
      });
    }

    console.log('[VAPI] Making call to:', callData.phoneNumber);
    console.log('[VAPI] Patient:', callData.patientName || 'Unknown');
    console.log('[VAPI] Purpose:', callData.purpose || 'Follow-up consultation');

    // Make the VAPI API call
    const response = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumberId: null, // Use default
        customer: {
          number: callData.phoneNumber,
        },
        assistant: {
          firstMessage: `Hello! This is TemporalOS calling to schedule a follow-up appointment for ${callData.patientName || 'the patient'}. ${callData.purpose || 'We\'d like to discuss their recent consultation and medication recommendations.'}`,
          model: {
            provider: 'openai',
            model: 'gpt-4',
            temperature: 0.7,
            messages: [
              {
                role: 'system',
                content: 'You are a friendly medical assistant scheduling follow-up appointments. Be professional, empathetic, and helpful. Ask for the patient\'s availability and confirm appointment details.'
              }
            ]
          },
          voice: {
            provider: 'elevenlabs',
            voiceId: 'rachel' // Professional female voice
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[VAPI] ❌ VAPI API error:', response.status, errorText);
      throw new Error(`VAPI API returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('[VAPI] ✅ Call initiated successfully:', result.id);

    res.json({
      success: true,
      callId: result.id,
      status: result.status,
      message: `Call initiated to ${callData.phoneNumber}`
    });

  } catch (error) {
    console.error('[VAPI] ❌ Error initiating call:', error);
    res.status(500).json({
      error: 'Failed to initiate call',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/vapi/call/:callId
 * Get call status
 */
vapiRouter.get('/call/:callId', async (req, res) => {
  try {
    const { callId } = req.params;
    const apiKey = process.env.VAPI_API_KEY?.trim();

    if (!apiKey) {
      return res.status(500).json({ error: 'VAPI API key not configured' });
    }

    const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`VAPI API returned ${response.status}`);
    }

    const result = await response.json();
    res.json(result);

  } catch (error) {
    console.error('[VAPI] Error getting call status:', error);
    res.status(500).json({
      error: 'Failed to get call status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export type OutboundCallRequest = z.infer<typeof OutboundCallSchema>;

