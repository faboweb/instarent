/**
 * Example: Creating a DocuSign contract and generating a signing URL
 * 
 * This example demonstrates how to:
 * 1. Create a rental contract in DocuSign
 * 2. Generate a signing URL for the tenant
 * 3. Store the contract in your database
 */

import { ConvexHttpClient } from "convex/browser";
import { createDocuSignService } from "../src/contracts/docusign";
import { createContractAndGetSigningUrl } from "../src/contracts";
import "dotenv/config";

async function exampleCreateContract() {
  // Initialize Convex client
  const convex = new ConvexHttpClient(process.env.CONVEX_URL!);

  // Initialize DocuSign service
  const docusignService = createDocuSignService({
    integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY!,
    userId: process.env.DOCUSIGN_USER_ID!,
    accountId: process.env.DOCUSIGN_ACCOUNT_ID!,
    basePath: process.env.DOCUSIGN_BASE_PATH!,
    privateKeyPath: process.env.DOCUSIGN_PRIVATE_KEY_PATH!,
    returnUrl: process.env.DOCUSIGN_RETURN_URL,
  });

  console.log("Creating rental contract...\n");

  // Create contract with signing URL
  const result = await createContractAndGetSigningUrl(convex, docusignService, {
    conversationId: "conversation_example_123" as any,
    listingId: "listing_example_456" as any,
    propertyAddress: "123 Nimmanhaemin Road, Chiang Mai, Thailand 50200",
    monthlyRent: 15000,
    currency: "THB",
    startDate: "2024-03-01",
    endDate: "2025-02-28",
    depositAmount: 15000,
    tenantName: "John Doe",
    tenantEmail: "[email protected]",
    landlordName: "Property Owner",
    landlordEmail: "[email protected]",
  });

  console.log("\n✅ Contract created successfully!\n");
  console.log("Envelope ID:", result.envelopeId);
  console.log("Signing URL:", result.signingUrl);
  console.log("\n📧 Send this URL to the tenant to sign the contract.");
  console.log("⚠️  Note: URL expires in 5 minutes - generate fresh URL when tenant is ready to sign.");
}

// Run example
if (require.main === module) {
  exampleCreateContract()
    .then(() => {
      console.log("\n✅ Example completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Error:", error.message);
      process.exit(1);
    });
}

export { exampleCreateContract };
