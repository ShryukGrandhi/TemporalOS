# TemporalOS - API Keys & Configuration

## ✅ Configured API Keys

All required API keys have been configured in `backend/.env`:

- ✅ **Heidi API Key**: `HIztzs28cXhQ3m4rMKYylG77i0bC283U`
- ✅ **Gemini API Key**: `AIzaSyARGAQC5efyOw2k4NGUksKA-5EYW0tevB0`
- ✅ **AWS Credentials**: Configured for Comprehend Medical

## 📋 Configuration Details

### 1. **Gemini API** (REQUIRED - Steps 3 & 4)
- **Purpose**: 
  - Step 3: Mode classification (using `gemini-2.5-flash`)
  - Step 4: Clinical reasoning synthesis (using `gemini-2.0-flash-exp`)
  - Step 5: Prescribing validation (using `gemini-2.0-flash-exp`)
- **Status**: ✅ Configured
- **Documentation**: https://ai.google.dev/gemini-api/docs/quickstart

### 2. **AWS Comprehend Medical** (REQUIRED - Step 2)
- **Purpose**: Entity extraction from clinical text
- **What it extracts**: Symptoms, medications, labs, allergies, diagnoses, temporal references
- **Status**: ✅ Configured
- **Credentials**: Set in `.env`

### 3. **Heidi API** (REQUIRED - Step 1)
- **Purpose**: Fetch transcript, patient data, medications, allergies, labs
- **Status**: ✅ Configured with JWT authentication
- **API Key**: Set in `.env`

### 4. **MongoDB Atlas** (OPTIONAL - Session Storage)
- **Purpose**: Store session state and reasoning traces
- **Status**: ⏳ Optional (system uses in-memory fallback if not configured)
- **How to get**: MongoDB Atlas → Create cluster → Get connection string

## 🚀 Quick Start

1. **Backend is configured** - All API keys are in `backend/.env`

2. **Start backend**:
   ```bash
   cd backend
   npm run dev
   ```

3. **Load extension** in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension` folder

4. **Navigate to Heidi EMR**:
   - Go to a Heidi session page (e.g., `https://scribe.heidihealth.com/scribe/session/337851254565527952685384877024185083869`)
   - The extension will automatically:
     - Extract session ID from URL
     - Authenticate with Heidi API (JWT)
     - Fetch transcript and patient data
     - Extract entities via AWS Comprehend
     - Classify mode via Gemini
     - Synthesize reasoning via Gemini
     - Display results

## 📊 Test Session IDs

You can test with these session IDs:
- `337851254565527952685384877024185083869`
- `75033324869996810677299265415934259470`
- `209429578973190336673242710141917128963`
- `316272209747326581157737075663692625433`
- `48329781058232302558277795670340808022`
- `189878368687884891206528465309407076433`
- `179340005192510878551324680590964837821`
- `53587316790682971446935880515324100567`

## ⚠️ Important Notes

- **Strict Mode**: If Gemini or AWS Comprehend fail, the system will **halt** and display an error
- **Heidi API**: Uses JWT authentication - token is auto-refreshed
- **Session IDs**: Extracted automatically from Heidi URL (`/session/123456...`)
- **Fallbacks**: None in strict mode - system stops if critical services unavailable

## 🔍 Model Configuration

You can customize Gemini models in `.env`:
- `GEMINI_CLASSIFY_MODEL` - For mode classification (default: `gemini-2.5-flash`)
- `GEMINI_SYNTHESIZE_MODEL` - For reasoning synthesis (default: `gemini-2.0-flash-exp`)
- `GEMINI_VALIDATION_MODEL` - For prescription validation (default: `gemini-2.0-flash-exp`)

Available models:
- `gemini-2.5-flash` - Fast, cost-effective
- `gemini-2.0-flash-exp` - More capable, experimental
- `gemini-1.5-pro` - Most capable (slower, more expensive)
