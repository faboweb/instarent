# DocuSign Environment Variable Options

You can now provide the private key in **two ways**:

## Option 1: Direct Key Content (Recommended for Production/Railway)

Set `DOCUSIGN_PRIVATE_KEY` to the full private key content:

```bash
DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA6ucks8v+LGVHliLPRF2ek5ae2o31ICgkZOdG3Sq2Dsf6oF+A
... (your full key here) ...
-----END RSA PRIVATE KEY-----"
```

**To get the key content:**
```bash
cat docusign_private_key.pem
```

Then copy the entire output (including the BEGIN/END lines) and set it as the env variable.

**For Railway/Production:** Just paste the multiline key content directly in the environment variable field.

## Option 2: File Path (For Local Development)

Set `DOCUSIGN_PRIVATE_KEY_PATH` to the file path:

```bash
DOCUSIGN_PRIVATE_KEY_PATH=./docusign_private_key.pem
```

## Your Current .env Should Have:

```bash
DOCUSIGN_INTEGRATION_KEY=5e5176ca-c948-4620-9377-707081216f92
DOCUSIGN_USER_ID=934c8de6-ac96-4f40-8edb-1c3d4fc92bd7
DOCUSIGN_ACCOUNT_ID=0cb386d9-d662-4ba4-a2c4-aea020d5cf3e
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi

# Use ONE of these two options:
# Option 1 (Production):
# DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..."

# Option 2 (Local):
DOCUSIGN_PRIVATE_KEY_PATH=./docusign_private_key.pem

DOCUSIGN_RETURN_URL=https://www.docusign.com/deferred-link
```

## Quick Command to Add Key Content to .env:

```bash
echo "" >> .env
echo "# DocuSign Private Key (full content)" >> .env
echo "DOCUSIGN_PRIVATE_KEY=\"$(cat docusign_private_key.pem)\"" >> .env
```

This will let you choose which method works best for your deployment!
