// @ts-ignore - docusign-esign has type issues
import docusign from "docusign-esign";
import fs from "fs";
export class DocuSignService {
    constructor(config) {
        this.config = config;
        this.apiClient = new docusign.ApiClient();
        this.apiClient.setBasePath(config.basePath);
    }
    async getAccessToken() {
        // Check if we have a valid token
        if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
            return this.accessToken;
        }
        console.log("🔐 Requesting DocuSign access token via JWT...");
        // Read private key from file
        const privateKeyBuffer = fs.readFileSync(this.config.privateKeyPath);
        // Request JWT token
        const results = await this.apiClient.requestJWTUserToken(this.config.integrationKey, this.config.userId, ["signature", "impersonation"], privateKeyBuffer, 3600 // Token expires in 1 hour
        );
        this.accessToken = results.body.access_token;
        this.tokenExpiresAt = Date.now() + (results.body.expires_in * 1000) - 60000; // Refresh 1 min before expiry
        console.log("✅ DocuSign access token obtained");
        return this.accessToken;
    }
    async createContractAndGetSigningUrl(details, clientUserId) {
        console.log(`📝 Creating rental contract for ${details.propertyAddress}`);
        const accessToken = await this.getAccessToken();
        this.apiClient.addDefaultHeader("Authorization", `Bearer ${accessToken}`);
        // Generate contract HTML
        const contractHtml = this.generateContractHtml(details);
        const contractBase64 = Buffer.from(contractHtml).toString("base64");
        // Create envelope definition
        const envelopeDefinition = new docusign.EnvelopeDefinition();
        envelopeDefinition.emailSubject = `Rental Agreement - ${details.propertyAddress}`;
        envelopeDefinition.status = "sent";
        // Add document
        const document = new docusign.Document();
        document.documentBase64 = contractBase64;
        document.name = "Rental Agreement";
        document.fileExtension = "html";
        document.documentId = "1";
        envelopeDefinition.documents = [document];
        // Add tenant as signer with clientUserId for embedded signing
        const signer = new docusign.Signer();
        signer.email = details.tenantEmail;
        signer.name = details.tenantName;
        signer.recipientId = "1";
        signer.clientUserId = clientUserId; // This enables embedded signing
        // Add signature tab
        const signHere = new docusign.SignHere();
        signHere.documentId = "1";
        signHere.pageNumber = "1";
        signHere.recipientId = "1";
        signHere.tabLabel = "TenantSignature";
        signHere.xPosition = "100";
        signHere.yPosition = "500";
        const tabs = new docusign.Tabs();
        tabs.signHereTabs = [signHere];
        signer.tabs = tabs;
        envelopeDefinition.recipients = new docusign.Recipients();
        envelopeDefinition.recipients.signers = [signer];
        // Create envelope
        const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
        const envelopeResult = await envelopesApi.createEnvelope(this.config.accountId, { envelopeDefinition });
        const envelopeId = envelopeResult.envelopeId;
        console.log(`✅ Envelope created: ${envelopeId}`);
        // Generate signing URL
        const signingUrl = await this.getSigningUrl(envelopeId, details.tenantEmail, details.tenantName, clientUserId);
        return {
            envelopeId,
            signingUrl,
        };
    }
    async getSigningUrl(envelopeId, recipientEmail, recipientName, clientUserId) {
        console.log(`🔗 Generating signing URL for envelope ${envelopeId}`);
        const accessToken = await this.getAccessToken();
        this.apiClient.addDefaultHeader("Authorization", `Bearer ${accessToken}`);
        const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
        const viewRequest = new docusign.RecipientViewRequest();
        viewRequest.returnUrl = this.config.returnUrl || "https://www.docusign.com/deferred-link";
        viewRequest.authenticationMethod = "none";
        viewRequest.email = recipientEmail;
        viewRequest.userName = recipientName;
        viewRequest.clientUserId = clientUserId;
        const viewResult = await envelopesApi.createRecipientView(this.config.accountId, envelopeId, { recipientViewRequest: viewRequest });
        console.log(`✅ Signing URL generated`);
        return viewResult.url;
    }
    async getEnvelopeStatus(envelopeId) {
        const accessToken = await this.getAccessToken();
        this.apiClient.addDefaultHeader("Authorization", `Bearer ${accessToken}`);
        const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
        const envelope = await envelopesApi.getEnvelope(this.config.accountId, envelopeId);
        return envelope.status;
    }
    generateContractHtml(details) {
        const today = new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Rental Agreement</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { text-align: center; color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
    .section { margin: 20px 0; }
    .party { margin: 10px 0; }
    .signature { margin-top: 60px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    td { padding: 8px; border: 1px solid #ddd; }
    .label { font-weight: bold; width: 40%; background-color: #f5f5f5; }
  </style>
</head>
<body>
  <h1>RESIDENTIAL LEASE AGREEMENT</h1>
  
  <div class="section">
    <p><strong>This Rental Agreement is entered into on ${today}</strong></p>
  </div>

  <h2>PARTIES</h2>
  <div class="section">
    <div class="party">
      <strong>LANDLORD:</strong><br>
      Name: ${details.landlordName}<br>
      Email: ${details.landlordEmail}
    </div>
    <div class="party">
      <strong>TENANT:</strong><br>
      Name: ${details.tenantName}<br>
      Email: ${details.tenantEmail}
    </div>
  </div>

  <h2>PROPERTY</h2>
  <div class="section">
    <p><strong>Rental Property Address:</strong><br>${details.propertyAddress}</p>
  </div>

  <h2>LEASE TERM</h2>
  <div class="section">
    <table>
      <tr>
        <td class="label">Lease Start Date</td>
        <td>${details.startDate}</td>
      </tr>
      <tr>
        <td class="label">Lease End Date</td>
        <td>${details.endDate}</td>
      </tr>
    </table>
  </div>

  <h2>RENT AND PAYMENT</h2>
  <div class="section">
    <table>
      <tr>
        <td class="label">Monthly Rent</td>
        <td>${details.currency} ${details.monthlyRent.toLocaleString()}</td>
      </tr>
      <tr>
        <td class="label">Security Deposit</td>
        <td>${details.currency} ${details.depositAmount.toLocaleString()}</td>
      </tr>
      <tr>
        <td class="label">Rent Due Date</td>
        <td>First day of each month</td>
      </tr>
    </table>
  </div>

  <h2>TERMS AND CONDITIONS</h2>
  <div class="section">
    <p>1. The tenant agrees to pay rent on time and maintain the property in good condition.</p>
    <p>2. The landlord agrees to maintain the property in habitable condition and make necessary repairs.</p>
    <p>3. This lease may be terminated by either party with 30 days written notice.</p>
    <p>4. The security deposit will be returned within 30 days of lease termination, minus any deductions for damages.</p>
  </div>

  <h2>SIGNATURES</h2>
  <div class="signature">
    <p><strong>TENANT SIGNATURE:</strong></p>
    <p>(Please sign below)</p>
  </div>
</body>
</html>
    `;
    }
}
export function createDocuSignService(config) {
    return new DocuSignService(config);
}
//# sourceMappingURL=docusign.js.map