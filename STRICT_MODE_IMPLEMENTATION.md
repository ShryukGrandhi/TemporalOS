# TemporalOS - STRICT REAL DATA MODE

## ✅ Implementation Complete

The system has been built according to the **FINAL MASTER SYSTEM PROMPT** with:

### ✅ Non-Negotiable Rules Enforced

- ✅ **Heidi Domain Lock**: Extension ONLY runs on `*.heidihealth.com` domains
- ✅ **No Mock Data**: All mock data removed. System uses only real Heidi API + live scraping
- ✅ **No Fallbacks**: If any required data is unavailable, system displays "Insufficient verified clinical data to reason safely" and STOPS
- ✅ **Strict Safety**: Never silently acts, never hallucinates data

### ✅ Full 6-Step Intelligence Pipeline Implemented

1. **STEP 1 - Collect Context**: ✅
   - Live EMR page scraping (Shadow DOM safe)
   - Heidi transcript API integration
   - Patient data, medications, allergies, labs via Heidi API
   - Workflow state detection (scrolling_history, viewing_labs, writing_note, ordering_meds)

2. **STEP 2 - Entity Extraction**: ✅
   - AWS Comprehend Medical integration
   - Extracts: symptoms, meds, labs, allergies, diagnoses, temporal references
   - No fallback - fails if AWS unavailable

3. **STEP 3 - Mode Classification**: ✅
   - Claude Sonnet via AWS Bedrock
   - Confidence threshold: < 0.75 → returns `insufficient_data`
   - No fallback classification

4. **STEP 4 - Clinical Reasoning Synthesis**: ✅
   - Claude Opus reasoning layer
   - Produces 3-7 highest-priority clinical insights
   - Each includes: What, Why, Confidence, Evidence

5. **STEP 5 - Prescribing Validation**: ✅
   - Validates: allergies, renal dosing, drug interactions, guidelines
   - Safety checklist generation
   - Citation list

6. **STEP 6 - Output**: ✅
   - Structured reasoning summary
   - Safety checklist display
   - Confidence scores
   - Citations
   - APPROVE / MODIFY / REJECT buttons
   - Rejection reason form

### ✅ Folder Structure (Mandatory)

```
/extension
  manifest.json ✅
  content-script.tsx ✅
  ui/ ✅
  utils/heidi-scraper.ts ✅

/backend
  index.ts ✅
  routes/
    heidi.ts ✅ (Real API calls)
    nlp.ts ✅ (AWS Comprehend)
    reasoning.ts ✅ (Claude Sonnet + Opus)
    safety-checks.ts ✅ (Prescribing validation)
    state.ts ✅ (MongoDB)

/shared
  types.ts ✅
  reasoning-model.ts ✅
  mode-classifier.ts ✅
  prescription-checker.ts ✅
```

### ✅ UI Requirements

- ✅ Clinical minimalism (Apple Notes × Notion × Heidi style)
- ✅ Max 320px width
- ✅ Color tokens: PAST #4C7AF2, PRESENT #E29A3B, FUTURE #2DA178
- ✅ Subtle animations (180ms)
- ✅ No emoji beyond brain icon
- ✅ Confirmation workflow with buttons

### 🚨 Strict Mode Enforcement

- All routes check for required data before processing
- Missing data → returns error, never guesses
- Backend unavailable → Extension shows "System Halt"
- AWS/Claude unavailable → Returns error, no fallback

### 📋 Next Steps for User

1. **Configure `.env`** in `backend/`:
   ```
   ANTHROPIC_API_KEY="your_key"
   AWS_ACCESS_KEY_ID="your_key"
   AWS_SECRET_ACCESS_KEY="your_key"
   MONGO_URI="your_uri"
   HEIDI_API_KEY="HIztzs28cXhQ3m4rMKYylG77i0bC283U"
   HEIDI_BASE_URL="https://registrar.api.heidihealth.com/api/v2/ml-scribe/open-api/"
   STRICT_MODE="TRUE"
   ```

2. **Start Backend**: `cd backend && npm run dev`

3. **Load Extension**: 
   - Go to `chrome://extensions/`
   - Load unpacked → select `extension` folder
   - Reload Heidi EMR page

4. **System will**:
   - Scrape live page data
   - Call Heidi API for transcript/patient data
   - Extract entities via AWS Comprehend
   - Classify mode via Claude Sonnet
   - Synthesize reasoning via Claude Opus
   - Display results with safety checks

### ⚠️ Important Notes

- **No Mock Data**: If Heidi API fails, system halts (does not guess)
- **No Fallbacks**: If AWS/Claude unavailable, system shows error
- **Strict Validation**: Confidence < 0.75 → mode not switched
- **Safety First**: All prescriptions validated before display

The system is now **production-ready** in strict real-data mode.


