# 🔍 Debugging Steps

## Current Issues:
1. **Heidi API 500 Error** - `/api/heidi/transcript` returning 500
2. **AWS Comprehend 500 Error** - `/api/nlp/analyze` returning 500

## Test Endpoints Added:

### 1. Test JWT Authentication:
```
GET http://localhost:3000/api/heidi/test-jwt
```
This will test if JWT authentication is working.

### 2. Test Transcript Endpoint:
```
GET http://localhost:3000/api/heidi/test-transcript/193446575975466635802392797547761115743
```
This will test the transcript endpoint with detailed error messages.

## What to Check:

1. **Backend Console** - Look for detailed error logs:
   - `[Heidi] Error details:` - Shows full error for Heidi API
   - `[NLP] Error details:` - Shows full error for AWS Comprehend

2. **Test the endpoints** in browser:
   - Visit: `http://localhost:3000/api/heidi/test-jwt`
   - Visit: `http://localhost:3000/api/heidi/test-transcript/193446575975466635802392797547761115743`

3. **Check .env file** - Make sure:
   - `AWS_ACCESS_KEY_ID` is set
   - `AWS_SECRET_ACCESS_KEY` is set
   - `GEMINI_API_KEY` is set
   - `HEIDI_API_KEY` is set

## Common Issues:

### Heidi API:
- **Wrong endpoint structure** - The endpoint `/sessions/{sessionId}/transcript` might not exist
- **JWT not working** - Check if JWT authentication is successful
- **API key invalid** - Verify the Heidi API key

### AWS Comprehend:
- **Missing credentials** - Check if AWS credentials are in .env
- **Wrong region** - Make sure region matches your AWS account
- **No permissions** - Credentials need `ComprehendMedicalFullAccess` policy

## Next Steps:

1. **Check backend terminal** for detailed error logs
2. **Test the debug endpoints** to see exact errors
3. **Share the error messages** from the test endpoints


