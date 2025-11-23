# TemporalOS (Strict Mode) - Quick Start

## 🚨 STRICT MODE ACTIVE
This version of TemporalOS is configured for **Strict Real Data Mode**.
- **NO Mock Data**: It will NOT show fake patient data.
- **NO Fallbacks**: If the backend is down, it stops.
- **Heidi Only**: It ONLY runs on `*.heidihealth.com` domains.

## Step 1: Build (Already Done ✅)
The extension is built in `extension/dist`.

## Step 2: Load in Chrome
1. Go to `chrome://extensions/`
2. Enable **Developer Mode**.
3. Click **Load Unpacked**.
4. Select the `extension` folder.

## Step 3: Run on Heidi
1. Navigate to a valid Heidi EMR session (e.g. `https://heidihealth.com/...`).
2. The extension will inject the UI.
3. **IF** it detects patient data, it will show the mode (PAST/PRESENT/FUTURE).
4. **IF** data is missing or backend is down, it will show a **RED ERROR BAR**: "System Halt".

## Step 4: Backend (Required)
Strict mode requires the backend for safety checks.
```bash
cd backend
npm install
npm run dev
```
Ensure `.env` is configured with real API keys.

## Troubleshooting
- **"Insufficient verified clinical data"**: The scraper couldn't find a patient name or context on the page. Ensure you are on a patient record page.
- **"System Halt"**: The backend server is not running on `localhost:3000`.
