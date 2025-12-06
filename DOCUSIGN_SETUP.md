# DocuSign Integration Setup Guide

This guide walks you through setting up DocuSign for rental contract signing.

## Overview

The integration creates rental contracts and generates signing URLs that customers can use to sign documents online. The signing happens on DocuSign's platform (embedded signing), and URLs expire after 5 minutes for security.

## Prerequisites

- DocuSign Developer Account (free): https://developers.docusign.com/
- Node.js installed
- OpenSSL (for generating RSA keypair)

## Setup Steps

### 1. Create DocuSign Developer Account

1. Go to https://developers.docusign.com/
2. Click "Sign Up" and create a free developer account
3. Verify your email

### 2. Create Integration Key (JWT OAuth Application)

1. Log in to https://admindemo.docusign.com/
2. Navigate to **Settings > Apps and Keys**
3. Click **Add App and Integration Key**
4. Give it a name (e.g., "InstaRent Contracts")
5. Copy the **Integration Key** (you'll need this for `DOCUSIGN_INTEGRATION_KEY`)

### 3. Generate RSA Keypair

```bash
# Navigate to your project directory
cd /Users/fabo/instarent

# Generate private key
openssl genrsa -out docusign_private_key.pem 2048

# Generate public key from private key
openssl rsa -in docusign_private_key.pem -pubout -out docusign_public_key.pem

# Display public key (you'll need to copy this)
cat docusign_public_key.pem
```

### 4. Add Public Key to DocuSign

1. Go back to **Settings > Apps and Keys**
2. Find your app and click **Edit**
3. Under **Service Integration**, click **Add RSA Keypair**
4. Paste the contents of `docusign_public_key.pem`
5. Click **Save**

### 5. Add Redirect URI

1. Still in **Edit App** screen
2. Under **Redirect URIs**, click **Add URI**
3. Add: `https://www.docusign.com/deferred-link`
4. Click **Save**

### 6. Get User ID and Account ID

1. In DocuSign admin, go to **Settings > Apps and Keys**
2. Scroll down to **API Account ID** - copy this for `DOCUSIGN_ACCOUNT_ID`
3. Click on your name in the top right > **My Profile**
4. Copy the **User ID** for `DOCUSIGN_USER_ID`

### 7. Grant Consent for Impersonation

**IMPORTANT:** You must grant consent before the integration will work.

1. Open this URL in your browser (replace `{INTEGRATION_KEY}` with your Integration Key):

```
https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id={INTEGRATION_KEY}&redirect_uri=https://www.docusign.com/deferred-link
```

Example:
```
https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=12345678-abcd-1234-abcd-123456789012&redirect_uri=https://www.docusign.com/deferred-link
```

2. Log in if prompted
3. Click **Allow Access**
4. You'll be redirected to a page - this is normal, consent is now granted

### 8. Configure Environment Variables

Add these to your `.env` file:

```bash
# DocuSign Configuration
DOCUSIGN_INTEGRATION_KEY=your-integration-key-here
DOCUSIGN_USER_ID=your-user-id-here
DOCUSIGN_ACCOUNT_ID=your-account-id-here
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi
DOCUSIGN_PRIVATE_KEY_PATH=./docusign_private_key.pem
DOCUSIGN_RETURN_URL=https://www.docusign.com/deferred-link
```

### 9. Verify Setup

Start your application:

```bash
npm run dev
```

You should see:
```
✅ DocuSign contract signing enabled
```

If you see an error, check:
- All environment variables are set correctly
- Private key file path is correct
- You granted consent (Step 7)
- Integration key matches exactly

## Usage

### Creating a Contract with Signing URL

```typescript
import { createContractAndGetSigningUrl } from "./src/contracts";

const result = await createContractAndGetSigningUrl(convex, docusignService, {
  conversationId: "conversation123",
  listingId: "listing456",
  propertyAddress: "123 Main St, Chiang Mai, Thailand",
  monthlyRent: 15000,
  currency: "THB",
  startDate: "2024-02-01",
  endDate: "2025-01-31",
  depositAmount: 15000,
  tenantName: "John Doe",
  tenantEmail: "[email protected]",
  landlordName: "Jane Smith",
  landlordEmail: "[email protected]",
});

console.log("Signing URL:", result.signingUrl);
// Send this URL to the tenant via Telegram
```

### Refreshing an Expired Signing URL

Since DocuSign signing URLs expire after 5 minutes, generate fresh URLs on demand:

```typescript
import { refreshSigningUrl } from "./src/contracts";

const freshUrl = await refreshSigningUrl(
  docusignService,
  envelopeId,
  "[email protected]",
  "John Doe",
  conversationId
);
```

### Checking Contract Status

```typescript
import { checkContractStatus } from "./src/contracts";

const status = await checkContractStatus(docusignService, envelopeId);
console.log("Contract status:", status);
// Possible values: "sent", "delivered", "completed", "declined", "voided"
```

## Important Notes

### Security

- **Private Key**: Never commit `docusign_private_key.pem` to version control (it's in `.gitignore`)
- **Signing URLs**: Expire after 5 minutes - generate fresh ones when the user is ready to sign
- **Embedded Signing**: Users sign on DocuSign's platform, not yours

### Production Deployment

For production, change the base path to the production API:

```bash
DOCUSIGN_BASE_PATH=https://www.docusign.net/restapi
```

And use your production DocuSign account credentials.

### Webhook Setup (Optional)

To receive real-time updates when contracts are signed:

1. Go to **Settings > Connect** in DocuSign
2. Add a webhook URL pointing to your server
3. Handle webhook events in your application

## Troubleshooting

### Error: "consent_required"

**Solution:** Complete Step 7 (Grant Consent for Impersonation)

### Error: "The access token provided is expired, revoked or malformed"

**Solution:** 
- Check that your Integration Key is correct
- Ensure you granted consent
- Try regenerating the RSA keypair

### Error: "Cannot read private key"

**Solution:** 
- Check that `DOCUSIGN_PRIVATE_KEY_PATH` points to the correct file
- Ensure the file has proper permissions: `chmod 400 docusign_private_key.pem`

### Signing URL Expired

**Solution:** This is normal - DocuSign URLs expire after 5 minutes for security. Use `refreshSigningUrl()` to generate a new URL when the user is ready to sign.

## API Rate Limits

DocuSign Demo Account:
- 1000 API calls per hour
- 100 envelopes per hour

This should be more than enough for testing and moderate usage.

## Support

- DocuSign Developer Documentation: https://developers.docusign.com/docs/
- DocuSign Support: https://support.docusign.com/
- JWT Authentication Guide: https://developers.docusign.com/platform/auth/jwt/

## Next Steps

To integrate into your bot workflow:

1. After scheduling is complete (conversation status: "scheduling")
2. Move conversation to "contracting" status
3. Create contract using `createContractAndGetSigningUrl()`
4. Send signing URL to user via Telegram
5. Periodically check status with `checkContractStatus()`
6. When status is "completed", move to "payment" status
