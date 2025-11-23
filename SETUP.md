# TemporalOS Setup Guide

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your AWS and MongoDB credentials
npm run dev
```

The backend will run on `http://localhost:3000`

### 2. Extension Setup

```bash
cd extension
npm install
npm run build
```

### 3. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension` folder

### 4. Test the Extension

1. Navigate to any website (or Heidi EMR mock site)
2. You should see the TemporalOS mode strip at the top
3. The extension will attempt to connect to the backend at `http://localhost:3000`

## Environment Variables

### Backend (.env)

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# Claude Model
CLAUDE_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/temporalos

# Server
PORT=3000
NODE_ENV=development
```

## Development Workflow

### Backend Development
```bash
cd backend
npm run dev  # Watches for changes and auto-restarts
```

### Extension Development
```bash
cd extension
npm run dev  # Watches for changes and rebuilds
```

After rebuilding, reload the extension in Chrome:
1. Go to `chrome://extensions/`
2. Click the reload icon on the TemporalOS extension

## Troubleshooting

### Extension not appearing
- Check that `dist/` folder exists with built files
- Check browser console for errors
- Verify manifest.json paths point to `dist/` files

### Backend connection errors
- Verify backend is running on port 3000
- Check CORS settings
- Verify API_BASE in `extension/ui/api.ts` matches your backend URL

### AWS/Claude errors
- Verify AWS credentials in `.env`
- Check AWS region matches your resources
- Claude will fallback to rule-based classification if API fails

### MongoDB errors
- Backend will use in-memory storage if MongoDB is unavailable
- Check MongoDB connection string format
- Verify network access to MongoDB Atlas (if using)

## Architecture Notes

- **Frontend**: React components injected via Shadow DOM to avoid conflicts
- **Backend**: Express server with typed routes using Zod validation
- **State**: MongoDB for persistence, in-memory fallback
- **NLP**: AWS Comprehend Medical for entity extraction
- **Reasoning**: Claude via AWS Bedrock for mode classification

## Next Steps

1. Connect to actual Heidi EMR API endpoints
2. Implement transcript extraction from EMR page
3. Enhance temporal tagging with more sophisticated analysis
4. Add panel content generation based on actual patient data
5. Implement scroll/action detection for mode switching

