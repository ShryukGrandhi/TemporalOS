# VAPI Integration Setup

## 📞 Schedule Follow-up Call Feature

The "Schedule Follow-up Call" button on the FUTURE tab uses **VAPI** (Voice AI) to automatically call patients for follow-up appointments.

---

## 🔑 Getting Your VAPI API Key

1. **Go to** [https://vapi.ai](https://vapi.ai)
2. **Sign up** for a free account
3. **Navigate to** Dashboard → API Keys
4. **Copy** your API key

---

## ⚙️ Configuration

### **Add VAPI Key to .env file:**

```bash
# backend/.env
VAPI_API_KEY=your_vapi_api_key_here
```

### **Restart Backend:**

```bash
cd backend
npm run dev
```

---

## 🎯 How It Works

### **1. User Flow:**
- User reviews medication recommendation in FUTURE tab
- Clicks **"📞 Schedule Follow-up Call"** button
- System calls demo number: **+1 (858) 210-8648**

### **2. VAPI Call:**
- AI voice agent introduces itself
- Mentions the medication recommendation
- Schedules follow-up appointment
- Confirms details with patient

### **3. Backend API:**

**Endpoint:** `POST /api/vapi/call/outbound`

**Request:**
```json
{
  "phoneNumber": "+18582108648",
  "patientName": "Demo Patient",
  "purpose": "Follow-up for Lisinopril 10mg daily prescription"
}
```

**Response:**
```json
{
  "success": true,
  "callId": "call_abc123",
  "status": "queued",
  "message": "Call initiated to +18582108648"
}
```

---

## 🧪 Testing

1. **Ensure backend is running:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Load extension in Chrome**

3. **Navigate to FUTURE tab**

4. **Click "Schedule Follow-up Call"**

5. **Check console for:**
   ```
   [VAPI] 📞 Outbound call request received
   [VAPI] Making call to: +18582108648
   [VAPI] ✅ Call initiated successfully: call_abc123
   ```

---

## 🎨 Button Features

- **Loading State:** Shows "📞 Calling..." while processing
- **Success Message:** Green notification with call ID
- **Error Handling:** Red notification with error details
- **Auto-dismiss:** Status clears after 5 seconds

---

## 🔧 Customization

### **Change Demo Phone Number:**

Edit `extension/ui/ConfirmationPanel.tsx`:

```typescript
phoneNumber: '+18582108648', // Change this
```

### **Customize AI Voice:**

Edit `backend/src/routes/vapi.ts`:

```typescript
voice: {
  provider: 'elevenlabs',
  voiceId: 'rachel' // Options: rachel, bella, josh, etc.
}
```

### **Modify First Message:**

```typescript
firstMessage: `Your custom greeting here...`
```

---

## 📊 Call Status

Check call status using:

```bash
GET /api/vapi/call/:callId
```

Returns call details, duration, transcript, and recording URL.

---

## 💰 Pricing

VAPI charges per minute of call time:
- **Free tier:** $10 credit
- **Pro plan:** $0.09/min for AI calls
- **Enterprise:** Custom pricing

---

## 🚨 Troubleshooting

### **❌ "VAPI API key not configured"**
- Check `.env` file has `VAPI_API_KEY`
- Restart backend after adding key

### **❌ "Failed to initiate call"**
- Verify API key is valid
- Check VAPI account has credits
- Ensure phone number format is correct: `+1XXXXXXXXXX`

### **❌ Call not connecting**
- VAPI requires verified phone numbers in development
- Upgrade to production for unverified numbers

---

## 📚 Resources

- **VAPI Docs:** [https://docs.vapi.ai](https://docs.vapi.ai)
- **API Reference:** [https://docs.vapi.ai/api-reference](https://docs.vapi.ai/api-reference)
- **Voice Samples:** [https://elevenlabs.io/voice-library](https://elevenlabs.io/voice-library)

---

## ✅ Checklist

- [ ] VAPI account created
- [ ] API key added to `.env`
- [ ] Backend restarted
- [ ] Extension reloaded
- [ ] Test call successful
- [ ] Status messages working

