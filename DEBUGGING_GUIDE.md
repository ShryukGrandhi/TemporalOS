# 🔧 Debugging Guide - Backend Errors

## Current Issues

### 1. Heidi API 500 Error
**Error**: `GET /api/heidi/transcript?sessionId=... 500 (Internal Server Error)`

**Possible Causes**:
- JWT authentication failing
- Wrong endpoint structure (`/sessions/{sessionId}/transcript` might not exist)
- Heidi API endpoint might be different

**To Debug**:
1. Check backend console logs for detailed error messages
2. The error should now show full details in development mode
3. Verify JWT token is being obtained successfully

### 2. AWS Comprehend 500 Error
**Error**: `POST /api/nlp/analyze 500 (Internal Server Error)`

**Fixed**: AWS credentials are now explicitly passed to the client

**To Verify**:
1. Check that `.env` file has correct AWS credentials
2. Verify credentials have `ComprehendMedicalFullAccess` permission
3. Check backend logs for specific AWS error messages

## Next Steps

1. **Check Backend Console** - Look for detailed error logs
2. **Verify .env File** - Make sure all credentials are correct
3. **Test Heidi JWT** - The backend should log JWT token acquisition

## Quick Fixes Applied

✅ AWS credentials now explicitly passed to Comprehend client
✅ Enhanced error logging for both Heidi and AWS
✅ Development mode shows full error details

## To See Detailed Errors

The backend should now log:
- `[Heidi] Error details:` - Full error info for Heidi API
- `[NLP] Error details:` - Full error info for AWS Comprehend

Check your backend terminal for these logs!


