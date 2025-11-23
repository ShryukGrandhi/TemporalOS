# TemporalOS

A Chrome extension that dynamically reorganizes clinical information based on the clinician's current reasoning phase (Past Reasoning, Present Evaluation, or Future Planning).

## Architecture

### Frontend (Chrome Extension)
- **Location**: `/extension`
- **Technology**: React + TypeScript, Shadow DOM injection
- **Components**:
  - `ModeStrip`: Displays reasoning mode buttons and auto toggle
  - `Panel`: Contextual information panel based on mode
  - `App`: Main orchestrator

### Backend (Node + Express)
- **Location**: `/backend`
- **Technology**: TypeScript, Express, Zod validation
- **Routes**:
  - `/api/heidi`: Heidi API integration
  - `/api/nlp`: AWS Comprehend Medical integration
  - `/api/reasoning`: Claude reasoning for mode classification
  - `/api/state`: MongoDB session state management

## Setup

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Configure environment variables:
   - `AWS_REGION`: AWS region for Comprehend Medical and Bedrock
   - `AWS_ACCESS_KEY_ID`: AWS access key
   - `AWS_SECRET_ACCESS_KEY`: AWS secret key
   - `CLAUDE_MODEL_ID`: Claude model ID (default: `anthropic.claude-3-sonnet-20240229-v1:0`)
   - `MONGODB_URI`: MongoDB connection string
   - `PORT`: Server port (default: 3000)

5. Start the server:
```bash
npm run dev
```

### Extension Setup

1. Navigate to extension directory:
```bash
cd extension
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension` directory

## API Endpoints

### Heidi API
- `GET /api/heidi/transcript` - Fetch transcript
- `GET /api/heidi/patient/:patientId` - Fetch patient data

### NLP
- `POST /api/nlp/analyze` - Analyze text with AWS Comprehend Medical

### Reasoning
- `POST /api/reasoning/classify` - Classify reasoning mode using Claude
- `POST /api/reasoning/explain` - Generate explanation for mode

### State
- `POST /api/state/session` - Create new session
- `GET /api/state/session/:sessionId` - Get session state
- `PUT /api/state/session/:sessionId` - Update session state

## Design System

### Colors
- **Primary**: `#1e1e1e`
- **Accent (Auto ON)**: `#4CAF50`
- **Past**: `#4C7AF2`
- **Present**: `#E29A3B`
- **Future**: `#2da178`
- **Background**: `rgba(255, 255, 255, 0.93)`
- **Border**: `#E6E6E6`

### Typography
- **Font**: Inter
- **Style**: Minimal, clinical, non-playful

## Development

### Backend Development
```bash
cd backend
npm run dev  # Runs with tsx watch
```

### Extension Development
```bash
cd extension
npm run dev  # Runs webpack in watch mode
```

## Notes

- The extension uses Shadow DOM to avoid conflicts with the host page
- All network calls are typed with Zod schemas
- MongoDB connection falls back to in-memory storage if unavailable
- AWS services have fallback rule-based logic if API calls fail
- The system respects HIPAA-like safety practices (no raw PHI in logs)

## License

ISC

