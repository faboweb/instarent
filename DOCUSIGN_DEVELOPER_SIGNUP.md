# DocuSign Developer Account Setup

## The Problem
Regular DocuSign accounts don't support API integrations. You need a **Developer Account** (free).

## Solution: Sign Up for Developer Account

### Step 1: Create Developer Account
1. Go to: https://go.docusign.com/o/sandbox/
2. Click **"Get a Free Developer Account"** or **"Create Free Account"**
3. Fill in your details:
   - Email (can be the same as your regular DocuSign account)
   - Password
   - Company name (can be anything)
4. Verify your email

### Step 2: Access Developer Admin
Once verified, log in to:
- **Developer Admin Console**: https://admindemo.docusign.com/

### Step 3: Get Your API Account ID
1. In https://admindemo.docusign.com/
2. Go to **Settings > Apps and Keys**
3. Look for **"API Account ID"** at the top - copy this
4. This is your `DOCUSIGN_ACCOUNT_ID`

### Step 4: Create Integration Key
1. In **Settings > Apps and Keys**
2. Click **"Add App and Integration Key"**
3. Give it a name: "InstaRent"
4. Copy the **Integration Key** - this is your `DOCUSIGN_INTEGRATION_KEY`

### Step 5: Add RSA Key
1. In the app you just created, click **Edit**
2. Under **Service Integration**, click **"+ ADD RSA KEYPAIR"**
3. Paste your public key (from `docusign_public_key.pem`)
4. Click **Save**

### Step 6: Add Redirect URI
1. Still in **Edit App** screen
2. Under **Redirect URIs**, click **"+ ADD URI"**
3. Add: `https://www.docusign.com/deferred-link`
4. Click **Save**

### Step 7: Get User ID
1. Click your name in the top right
2. Go to **My Profile**
3. Copy your **User ID** - this is your `DOCUSIGN_USER_ID`

### Step 8: Grant Consent
Open this URL in your browser (replace with YOUR integration key):
```
https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=YOUR_INTEGRATION_KEY&redirect_uri=https://www.docusign.com/deferred-link
```

Example:
```
https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=5e5176ca-c948-4620-9377-707081216f92&redirect_uri=https://www.docusign.com/deferred-link
```

Click **"Allow Access"**

## Important Notes
- Developer accounts are **100% FREE** forever
- They have full API access
- They work in the Demo/Sandbox environment
- Perfect for development and testing
- You can send real test envelopes

## Your Configuration
After setup, your `.env` should have:
```bash
DOCUSIGN_INTEGRATION_KEY=<from step 4>
DOCUSIGN_USER_ID=<from step 7>
DOCUSIGN_ACCOUNT_ID=<from step 3>
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi
DOCUSIGN_PRIVATE_KEY_PATH=./docusign_private_key.pem
```
