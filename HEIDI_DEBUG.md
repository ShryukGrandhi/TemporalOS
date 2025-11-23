# 🔍 Debugging Heidi API 500 Error

## What We Know:
- Test endpoint `/api/heidi/test-transcript/:sessionId` returns 500
- This means either:
  1. JWT authentication is failing
  2. The Heidi API endpoint doesn't exist
  3. The endpoint structure is wrong

## Enhanced Error Logging Added:

The backend now logs:
- Full URL being called
- Complete error responses from Heidi API
- JWT token status

## Next Steps:

1. **Restart Backend** (to load new error logging):
   ```bash
   # Stop current backend (Ctrl+C in terminal)
   cd backend
   npm run dev
   ```

2. **Test Again**:
   - Visit: `http://localhost:3000/api/heidi/test-transcript/193446575975466635802392797547761115743`
   - Check the **backend console** for detailed logs:
     - `[Heidi] Making request to: ...`
     - `[Heidi] API Error Response: ...`
     - `[Heidi Test] Full error: ...`

3. **Check Backend Console Output**:
   The backend terminal should now show:
   - The exact URL being called
   - The HTTP status code from Heidi API
   - The error message from Heidi API
   - Whether JWT was obtained successfully

## Possible Issues:

### Issue 1: Wrong Endpoint Structure
The endpoint `/sessions/{sessionId}/transcript` might not exist in Heidi API.
- **Solution**: We may need to use a different endpoint structure
- **Check**: Backend logs will show the exact error from Heidi API

### Issue 2: JWT Authentication Failing
JWT might not be obtained or might be invalid.
- **Test**: Visit `http://localhost:3000/api/heidi/test-jwt`
- **Check**: Should return JWT preview if working

### Issue 3: API Key Invalid
The Heidi API key might be wrong or expired.
- **Check**: Verify `HEIDI_API_KEY` in `.env` file

## What to Share:

After restarting backend and testing, share:
1. **Backend console output** - Look for `[Heidi]` logs
2. **Response from test endpoint** - The JSON error response
3. **Response from JWT test** - `http://localhost:3000/api/heidi/test-jwt`

This will help identify the exact issue!


