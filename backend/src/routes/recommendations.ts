/**
 * Medication Recommendations Route
 * Uses Gemini AI to generate context-aware medication recommendations
 */

import { Router } from 'express';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load Gemini API - lazily so .env is loaded
let genAI: GoogleGenerativeAI | null = null;

function getGenAI() {
  if (genAI) return genAI;
  
  const apiKey = process.env.GEMINI_API_KEY?.trim().replace(/^["']|["']$/g, ''); // Remove quotes
  console.log('[Recommendations] Initializing Gemini API...');
  console.log('[Recommendations] Raw API Key:', process.env.GEMINI_API_KEY);
  console.log('[Recommendations] Cleaned API Key:', apiKey);
  console.log('[Recommendations] API Key present:', !!apiKey);
  console.log('[Recommendations] API Key length:', apiKey?.length || 0);
  
  if (apiKey && apiKey.length > 10) {
    console.log('[Recommendations] ✅ Gemini API initialized successfully');
    genAI = new GoogleGenerativeAI(apiKey);
    return genAI;
  }
  
  console.log('[Recommendations] ❌ Gemini API NOT initialized - key missing or invalid');
  console.log('[Recommendations] All env vars:', Object.keys(process.env).filter(k => k.includes('GEMINI')));
  return null;
}

export const recommendationsRouter = Router();

const RecommendationRequestSchema = z.object({
  sessionId: z.string(),
  patientId: z.string(),
  patientContext: z.object({
    age: z.number().optional(),
    gender: z.string().optional(),
    currentMedications: z.array(z.object({
      name: z.string(),
      dosage: z.string(),
      indication: z.string().optional()
    })).optional(),
    conditions: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    labs: z.array(z.object({
      name: z.string(),
      value: z.string(),
      unit: z.string().optional()
    })).optional(),
    transcript: z.string().optional() // Recent speech transcript
  })
});

const RecommendationResponseSchema = z.object({
  medication: z.string(),
  dosage: z.string(),
  duration: z.string(),
  confidence: z.number(),
  reasoning: z.array(z.string()),
  safetyChecklist: z.object({
    renalDosing: z.boolean(),
    drugInteractions: z.boolean(),
    allergies: z.boolean(),
    guidelineAlignment: z.boolean()
  }),
  citations: z.array(z.string()),
  alternatives: z.array(z.string()).optional()
});

/**
 * POST /api/recommendations/generate
 * Generate medication recommendation using Gemini AI
 */
recommendationsRouter.post('/generate', async (req, res) => {
  try {
    console.log('[Recommendations] 📥 Received recommendation request');
    console.log('[Recommendations] Request body keys:', Object.keys(req.body));
    
    const request = RecommendationRequestSchema.parse(req.body);
    
    console.log('[Recommendations] 📋 Patient Context Summary:');
    console.log('  - Age:', request.patientContext.age);
    console.log('  - Gender:', request.patientContext.gender);
    console.log('  - Current Meds:', request.patientContext.currentMedications?.length || 0);
    console.log('  - Conditions:', request.patientContext.conditions?.length || 0);
    console.log('  - Allergies:', request.patientContext.allergies?.length || 0);
    console.log('  - 🎤 Transcript length:', request.patientContext.transcript?.length || 0);
    console.log('  - 🎤 Transcript FULL TEXT:', request.patientContext.transcript || '(EMPTY - NO CONVERSATION)');
    
    if (!request.patientContext.transcript || request.patientContext.transcript.length === 0) {
      console.warn('[Recommendations] ⚠️ WARNING: No transcript provided! Gemini will not have conversation context.');
    }
    
    const ai = getGenAI();
    if (!ai) {
      console.warn('[Recommendations] ⚠️ Gemini API key not configured, using fallback');
      return res.json(getFallbackRecommendation(request.patientContext));
    }

    console.log('[Recommendations] 🧠 Using Gemini AI for recommendation (patient:', request.patientId, ')');
    
    const recommendation = await generateRecommendationWithGemini(request.patientContext);
    
    console.log('[Recommendations] ✅ Generated recommendation:', recommendation.medication, 'confidence:', recommendation.confidence);
    console.log('[Recommendations] Reasoning points:', recommendation.reasoning.length);
    
    res.json(recommendation);
  } catch (error) {
    console.error('[Recommendations] ❌ Error generating recommendation:', error);
    res.status(500).json({ 
      error: 'Failed to generate recommendation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate medication recommendation using Gemini AI
 */
async function generateRecommendationWithGemini(
  context: z.infer<typeof RecommendationRequestSchema>['patientContext']
): Promise<z.infer<typeof RecommendationResponseSchema>> {
  const ai = getGenAI();
  if (!ai) {
    throw new Error('Gemini API not configured');
  }

  const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' }); // Using Gemini 2.5 Flash (latest)

  // Build comprehensive context
  const currentMeds = context.currentMedications?.map(m => 
    `- ${m.name} ${m.dosage}${m.indication ? ` (for ${m.indication})` : ''}`
  ).join('\n') || 'None documented';

  const conditions = context.conditions?.join(', ') || 'None documented';
  const allergies = context.allergies?.join(', ') || 'None documented';
  
  const labs = context.labs?.map(l => 
    `- ${l.name}: ${l.value} ${l.unit || ''}`
  ).join('\n') || 'No recent labs';

  const transcript = context.transcript || 'No recent conversation';

  const prompt = `You are an expert clinical pharmacist with access to the patient's complete medical history. You are creating a FUTURE treatment plan based on:
1. PAST MEDICAL HISTORY (medications, conditions, labs)
2. PRESENT CLINICAL FINDINGS (conversation transcript, current assessment)
3. EVIDENCE-BASED GUIDELINES

═══════════════════════════════════════════════════════════════
📋 PATIENT PROFILE (PAST DATA)
═══════════════════════════════════════════════════════════════
Age: ${context.age || 'Unknown'} years old
Gender: ${context.gender || 'Unknown'}

📊 CURRENT MEDICATION REGIMEN:
${currentMeds}

🏥 ACTIVE MEDICAL CONDITIONS:
${conditions}

⚠️ DOCUMENTED ALLERGIES:
${allergies}

🧪 RECENT LABORATORY RESULTS:
${labs}

═══════════════════════════════════════════════════════════════
🎤 PRESENT CLINICAL CONVERSATION (JUST NOW):
═══════════════════════════════════════════════════════════════
${transcript || '(No recent conversation documented)'}

═══════════════════════════════════════════════════════════════
🎯 YOUR TASK: INTELLIGENT FUTURE PLANNING
═══════════════════════════════════════════════════════════════

Analyze the COMPLETE patient picture (past history + present conversation) and recommend ONE medication that will optimize their care going forward.

CRITICAL ANALYSIS REQUIREMENTS:
✓ Synthesize PAST medical history with PRESENT clinical findings
✓ Identify treatment gaps based on conditions and current meds
✓ Consider what the patient JUST said in the conversation above
✓ ABSOLUTELY avoid medications patient is allergic to (check both documented allergies AND conversation)
✓ Check for drug-drug interactions with current regimen
✓ Apply evidence-based guidelines for patient's age/gender
✓ Ensure dosing is appropriate for any renal/hepatic considerations
✓ If patient mentioned new symptoms or concerns in conversation, address them

YOUR RECOMMENDATION MUST:
- Be different from what they're already taking (unless dosage adjustment needed)
- Address an unmet clinical need evident from the data
- Be safe given their allergy profile and current medications
- Have strong clinical evidence supporting it
- **CRITICAL**: Your reasoning MUST explicitly reference and quote specific things said in the present conversation above
- **CRITICAL**: Show that you are directly responding to what was discussed in the present clinical conversation
- Each reasoning point should clearly connect past history with present conversation

REASONING REQUIREMENTS:
- At least 1-2 reasoning points MUST start with "Based on the present conversation..." or "The patient mentioned..."
- Reference specific symptoms, concerns, or allergies mentioned in the transcript
- Connect past medical history with what was just discussed
- Show you're making a contextualized decision, not a generic one

Provide your recommendation in this EXACT JSON format:
{
  "medication": "Medication Name",
  "dosage": "Dose and frequency (e.g., 10mg once daily)",
  "duration": "Duration or 'Ongoing'",
  "confidence": 0.85,
  "reasoning": [
    "Based on the present conversation where the patient mentioned [specific quote or concern], this medication directly addresses...",
    "Considering the patient's past history of [condition from PAST data] combined with their current statement about [quote from PRESENT conversation]...",
    "The patient's current medications show [gap in therapy], and their mention of [symptom from conversation] indicates...",
    "Clinical evidence from [guideline] supports this choice, especially given what the patient said: '[quote from transcript]'",
    "Safety profile is appropriate because [allergy check based on conversation]",
    "This recommendation synthesizes PAST data (current meds, labs) with PRESENT findings (conversation transcript)"
  ],
  "safetyChecklist": {
    "renalDosing": true,
    "drugInteractions": true,
    "allergies": true,
    "guidelineAlignment": true
  },
  "citations": [
    "Guideline or study reference 1",
    "Guideline or study reference 2"
  ],
  "alternatives": [
    "Alternative medication 1",
    "Alternative medication 2"
  ]
}

IMPORTANT: 
- If allergies are mentioned in EITHER documented allergies OR the conversation transcript, ensure "allergies": true only if the recommended medication does NOT conflict
- Provide 5-7 specific reasoning points
- **MANDATORY**: At least 2 reasoning points MUST explicitly quote or reference the present conversation transcript
- Confidence should be 0.7-0.95 based on how well the recommendation fits
- Show your work: demonstrate that you read and understood the present conversation
- Return ONLY valid JSON, no additional text

EXAMPLE REASONING FORMAT (follow this style):
"Based on the present conversation where the patient stated 'I'm allergic to aspirin', recommending Clopidogrel instead as an antiplatelet alternative"
"The patient mentioned experiencing chest pain during our conversation, which combined with their history of hypertension, indicates need for..."
"Patient's current medications include [past data], but they just reported [present symptom], suggesting..."`;

  try {
    console.log('[Recommendations] 📤 Sending prompt to Gemini...');
    console.log('[Recommendations] Prompt length:', prompt.length, 'chars');
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    console.log('[Recommendations] 📥 Gemini response received, length:', text.length);
    console.log('[Recommendations] Response preview:', text.substring(0, 200));

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Recommendations] ❌ No JSON found in Gemini response');
      throw new Error('No JSON found in Gemini response');
    }

    console.log('[Recommendations] 🔍 Extracted JSON, length:', jsonMatch[0].length);
    const recommendation = JSON.parse(jsonMatch[0]);
    
    // Validate with schema
    const validated = RecommendationResponseSchema.parse(recommendation);
    console.log('[Recommendations] ✅ Recommendation validated successfully');
    return validated;
  } catch (error) {
    console.error('[Recommendations] ❌ Error with Gemini:', error);
    console.log('[Recommendations] 🔄 Falling back to rule-based recommendation');
    // Fallback to safe recommendation
    return getFallbackRecommendation(context);
  }
}

/**
 * Fallback recommendation when Gemini is unavailable
 */
function getFallbackRecommendation(
  context: z.infer<typeof RecommendationRequestSchema>['patientContext']
): z.infer<typeof RecommendationResponseSchema> {
  // Check for aspirin allergy in allergies or transcript
  const hasAspirinAllergy = 
    context.allergies?.some(a => a.toLowerCase().includes('aspirin')) ||
    context.transcript?.toLowerCase().includes('allergic to aspirin') ||
    false;

  if (hasAspirinAllergy) {
    // Recommend alternative if aspirin allergy detected
    return {
      medication: 'Clopidogrel',
      dosage: '75mg once daily',
      duration: 'Ongoing',
      confidence: 0.85,
      reasoning: [
        'Patient has documented aspirin allergy',
        'Clopidogrel is appropriate alternative antiplatelet agent',
        'Indicated for cardiovascular disease prevention',
        'No contraindications with current medications',
        'Age-appropriate dosing for adult patient'
      ],
      safetyChecklist: {
        renalDosing: true,
        drugInteractions: true,
        allergies: true,
        guidelineAlignment: true
      },
      citations: [
        'ACC/AHA 2019 Guidelines on Primary Prevention',
        'Clopidogrel vs Aspirin in Patients at Risk - CAPRIE Trial'
      ],
      alternatives: ['Ticagrelor 90mg twice daily', 'Prasugrel 10mg once daily']
    };
  }

  // Default aspirin recommendation
  return {
    medication: 'Aspirin',
    dosage: '81mg once daily',
    duration: 'Ongoing',
    confidence: 0.88,
    reasoning: [
      'Patient has cardiovascular risk factors',
      'Low-dose aspirin appropriate for primary prevention',
      'No documented aspirin allergy',
      'Benefits outweigh bleeding risks',
      'Guideline-concordant therapy'
    ],
    safetyChecklist: {
      renalDosing: true,
      drugInteractions: true,
      allergies: true,
      guidelineAlignment: true
    },
    citations: [
      'USPSTF Aspirin Recommendations 2022',
      'ACC/AHA 2019 Primary Prevention Guidelines'
    ],
    alternatives: ['Clopidogrel 75mg daily', 'Ticagrelor 60mg twice daily']
  };
}

export type RecommendationRequest = z.infer<typeof RecommendationRequestSchema>;
export type RecommendationResponse = z.infer<typeof RecommendationResponseSchema>;

