# 🔐 How to Add AWS Comprehend Medical Permissions

## Step-by-Step Guide:

### Option 1: Attach Pre-built Policy (Easiest)

1. **Go to AWS Console**:
   - Visit: https://console.aws.amazon.com/iam/
   - Sign in with your AWS account

2. **Navigate to Users**:
   - Click **"Users"** in the left sidebar
   - Find the user with access key `AKIA2D4O4F3PFGCNH6VG`
   - Click on the username

3. **Add Permissions**:
   - Click the **"Add permissions"** button (top right)
   - Select **"Attach policies directly"**
   - In the search box, type: `ComprehendMedical`
   - Check the box for **"ComprehendMedicalFullAccess"**
   - Click **"Next"** → **"Add permissions"**

4. **Done!** The user now has full access to Comprehend Medical.

---

### Option 2: Create Custom Policy (More Secure)

If you want to give only the minimum required permissions:

1. **Go to IAM → Policies**:
   - Click **"Policies"** in left sidebar
   - Click **"Create policy"**

2. **Use JSON Editor**:
   - Click **"JSON"** tab
   - Paste this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "comprehendmedical:DetectEntitiesV2",
        "comprehendmedical:DetectPHI",
        "comprehendmedical:InferICD10CM"
      ],
      "Resource": "*"
    }
  ]
}
```

3. **Name the Policy**:
   - Policy name: `TemporalOS-ComprehendMedical`
   - Description: `Permissions for TemporalOS to use Comprehend Medical`
   - Click **"Create policy"**

4. **Attach to User**:
   - Go back to **Users**
   - Click on your user
   - Click **"Add permissions"**
   - Select **"Attach policies directly"**
   - Search for `TemporalOS-ComprehendMedical`
   - Check the box and click **"Add permissions"**

---

## Quick Check:

After adding permissions, test if it works:

1. **Restart your backend** (if running)
2. **Test the endpoint**: `http://localhost:3000/api/nlp/test-credentials`
3. **Should return**: `"AWS credentials are valid and working!"`

---

## Troubleshooting:

### If you can't find the user:
- The access key might be from a different AWS account
- Check which AWS account you're logged into
- The credentials might be root credentials (not recommended)

### If policy doesn't appear:
- Make sure you're in the correct AWS region
- Some policies are region-specific
- Try searching for just "Comprehend" to see all related policies

### If still getting errors:
- Wait 1-2 minutes for permissions to propagate
- Try the test endpoint again
- Check AWS CloudTrail for detailed error logs

---

## Security Note:

**⚠️ Root Credentials**: If these are root account credentials (from rootkey.csv), you should:
1. Create an IAM user instead
2. Give that user only the permissions needed
3. Use those credentials instead of root credentials

Root credentials have full access to everything - not recommended for applications!


