# Knowledge Graph Implementation

## Overview
The knowledge graph system has been fully implemented to automatically analyze and visualize medication interactions when medications are confirmed for patients.

## Features Implemented

### 1. **Medication Logging System** ✅
- **Database Schema**: Created `backend/schemas/medications.ts` with comprehensive schemas for:
  - Medication confirmations
  - Medication analysis (from Gemini)
  - Medication logs (stored in MongoDB)
- **API Endpoints**: Created `backend/routes/medications.ts` with:
  - `POST /api/medications/confirm` - Log medication confirmation and trigger analysis
  - `GET /api/medications/logs/:sessionId` - Get all medication logs for a session
  - `GET /api/medications/graph/:sessionId` - Get knowledge graph data

### 2. **Gemini AI Integration** ✅
- Automatically analyzes new medications when confirmed
- Provides comprehensive analysis including:
  - Classification (category, indication, mechanism)
  - Drug interactions (with severity levels)
  - Contraindications
  - Warnings
  - Monitoring requirements
  - Knowledge graph nodes and edges

### 3. **Knowledge Graph Visualization** ✅
- **Component**: `extension/ui/KnowledgeGraph.tsx`
- Uses Cytoscape.js for interactive graph visualization
- Visual features:
  - Color-coded nodes by type (medication, condition, symptom, lab, interaction)
  - Color-coded edges by polarity (positive, negative, neutral)
  - Automatic layout with force-directed algorithm
  - Real-time updates when new medications are confirmed

### 4. **Medication Detection** ✅
- Automatic detection of medication confirmations in the UI
- Monitors for:
  - Confirmation buttons (confirm, approve, prescribe)
  - Medication form submissions
  - DOM changes that indicate medication actions
- Extracts medication information from the page:
  - Medication name
  - Dosage
  - Route
  - Frequency

### 5. **UI Integration** ✅
- Knowledge graph integrated into the Panel component
- Toggle button to show/hide graph
- Graph automatically updates when new medications are confirmed
- Session-based graph data (one graph per session)

## Setup Instructions

### 1. Backend Setup
```bash
cd backend
npm install
```

### 2. Environment Variables
Add to `backend/.env`:
```bash
# Gemini API Key (required for medication analysis)
GEMINI_API_KEY="your_gemini_api_key_here"

# MongoDB (optional - uses in-memory fallback if not provided)
MONGODB_URI="mongodb://localhost:27017/temporalos"
```

### 3. Extension Setup
The extension already has Cytoscape.js installed. No additional setup needed.

## Usage

### Confirming a Medication
1. When a clinician confirms a medication in the Heidi EMR:
   - The system automatically detects the confirmation
   - Extracts medication information from the page
   - Sends it to the backend for logging and analysis

2. Backend Processing:
   - Logs the medication confirmation to the database
   - Sends medication info to Gemini for analysis
   - Gemini returns comprehensive analysis including:
     - Classification
     - Interactions
     - Graph nodes and edges

3. Graph Update:
   - Knowledge graph automatically refreshes
   - New medication and its relationships appear on the graph
   - Interactions are visualized with color-coded edges

### Viewing the Graph
- The knowledge graph appears in the Panel component
- Click "Show" to display the graph
- Graph shows:
  - All medications confirmed in the session
  - Their relationships (treats, interacts_with, etc.)
  - Conditions, symptoms, and labs they relate to

## API Endpoints

### POST /api/medications/confirm
Log a medication confirmation and trigger Gemini analysis.

**Request:**
```json
{
  "sessionId": "session-123",
  "patientId": "patient-456",
  "medication": "Lisinopril",
  "dosage": "10mg",
  "route": "oral",
  "frequency": "once daily",
  "startDate": "2024-01-15",
  "confirmedBy": "Dr. Smith"
}
```

**Response:**
```json
{
  "success": true,
  "logId": "med-log-1234567890-abc",
  "analysis": {
    "classification": { ... },
    "interactions": [ ... ],
    "graphNodes": [ ... ],
    "graphEdges": [ ... ]
  }
}
```

### GET /api/medications/graph/:sessionId
Get knowledge graph data for a session.

**Response:**
```json
{
  "nodes": [
    {
      "id": "Lisinopril",
      "label": "Lisinopril",
      "type": "medication",
      "dosage": "10mg"
    }
  ],
  "edges": [
    {
      "source": "Lisinopril",
      "target": "Hypertension",
      "type": "treats",
      "polarity": "positive"
    }
  ]
}
```

## Graph Node Types
- **Medication** (Blue Hexagon): Medications
- **Condition** (Red Ellipse): Medical conditions
- **Symptom** (Orange Triangle): Symptoms
- **Lab** (Green Diamond): Lab tests
- **Interaction** (Purple Star): Drug interactions

## Graph Edge Types
- **treats**: Medication treats condition (positive)
- **causes**: Medication causes symptom (negative)
- **interacts_with**: Drug-drug interaction (varies)
- **monitors**: Lab monitors medication effect (neutral)
- **contraindicated_by**: Contraindication (negative)

## Data Flow

1. **Medication Confirmed** → Extension detects confirmation
2. **Extract Info** → Extracts medication details from DOM
3. **API Call** → Sends to `/api/medications/confirm`
4. **Database Log** → Saves to MongoDB (or in-memory)
5. **Gemini Analysis** → Analyzes medication and interactions
6. **Graph Update** → Graph component polls for updates
7. **Visualization** → New nodes and edges appear on graph

## Notes

- The system works without MongoDB (uses in-memory storage)
- Gemini API key is required for medication analysis
- Graph updates automatically every 5 seconds
- All medication confirmations are logged with timestamps
- The system extracts patient ID from URL or DOM

## Future Enhancements

- Real-time graph updates via WebSocket
- More sophisticated medication detection
- Integration with Heidi API for patient data
- Export graph as image/PDF
- Filter graph by node type or relationship type

