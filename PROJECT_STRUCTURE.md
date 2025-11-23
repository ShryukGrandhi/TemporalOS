# TemporalOS Project Structure

## Directory Layout

```
HEIDI/
├── backend/                 # Node.js + Express backend
│   ├── src/
│   │   ├── index.ts        # Express server entry point
│   │   ├── routes/         # API route handlers
│   │   │   ├── heidi.ts    # Heidi API integration
│   │   │   ├── nlp.ts      # AWS Comprehend Medical
│   │   │   ├── reasoning.ts # Claude reasoning
│   │   │   └── state.ts    # MongoDB session state
│   │   └── schemas/         # Zod validation schemas
│   │       ├── heidi.ts
│   │       ├── nlp.ts
│   │       ├── reasoning.ts
│   │       └── state.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── extension/               # Chrome Extension (MV3)
│   ├── ui/                  # React components
│   │   ├── App.tsx         # Main app orchestrator
│   │   ├── ModeStrip.tsx   # Mode selection UI
│   │   ├── Panel.tsx        # Contextual panel
│   │   ├── api.ts          # Backend API client
│   │   ├── types.ts        # TypeScript types
│   │   ├── theme.ts        # Design tokens
│   │   └── index.tsx       # React entry point
│   ├── dist/               # Built files (generated)
│   ├── icons/              # Extension icons
│   ├── manifest.json       # Extension manifest
│   ├── content.js         # Content script
│   ├── background.js      # Service worker
│   ├── popup.html         # Extension popup
│   ├── webpack.config.js  # Build configuration
│   ├── package.json
│   └── tsconfig.json
│
├── README.md              # Main documentation
├── SETUP.md              # Setup instructions
└── package.json          # Root package.json (convenience scripts)
```

## Key Files

### Backend

- **`src/index.ts`**: Express server setup, route registration, error handling
- **`src/routes/heidi.ts`**: Heidi API proxy (currently using mock data)
- **`src/routes/nlp.ts`**: AWS Comprehend Medical integration for entity extraction
- **`src/routes/reasoning.ts`**: Claude (Bedrock) integration for mode classification
- **`src/routes/state.ts`**: MongoDB session persistence

### Extension

- **`content.js`**: Injects React app into page via Shadow DOM
- **`background.js`**: Service worker for message passing and tab management
- **`ui/App.tsx`**: Main React component orchestrating ModeStrip and Panel
- **`ui/ModeStrip.tsx`**: UI for mode selection (PAST/PRESENT/FUTURE)
- **`ui/Panel.tsx`**: Contextual information panel
- **`ui/api.ts`**: API client for backend communication

## Data Flow

1. **Content Script** detects page load → initializes React app
2. **React App** initializes session → starts auto-detection
3. **Auto-detection** periodically:
   - Extracts transcript/context from page
   - Calls `/api/nlp/analyze` for entity extraction
   - Calls `/api/reasoning/classify` for mode classification
   - Updates UI with detected mode
4. **Panel** fetches content based on mode
5. **Session state** persisted to MongoDB

## API Endpoints

### Heidi API (`/api/heidi`)
- `GET /transcript` - Fetch conversation transcript
- `GET /patient/:patientId` - Fetch patient data

### NLP (`/api/nlp`)
- `POST /analyze` - Analyze text with AWS Comprehend Medical

### Reasoning (`/api/reasoning`)
- `POST /classify` - Classify reasoning mode using Claude
- `POST /explain` - Generate explanation for mode

### State (`/api/state`)
- `POST /session` - Create new session
- `GET /session/:sessionId` - Get session state
- `PUT /session/:sessionId` - Update session state

## Design System

Colors, spacing, and typography defined in `extension/ui/theme.ts`:
- Primary: `#1e1e1e`
- Past: `#4C7AF2`
- Present: `#E29A3B`
- Future: `#2da178`
- Accent: `#4CAF50`

## Build Process

1. **Backend**: TypeScript compiled with `tsx` (dev) or `tsc` (prod)
2. **Extension**: Webpack bundles React app and scripts into `dist/`

## Next Steps for Integration

1. Replace mock Heidi API calls with actual endpoints
2. Implement transcript extraction from EMR page DOM
3. Add scroll/action detection for mode switching
4. Enhance panel content generation with real patient data
5. Improve temporal tagging with more sophisticated analysis

