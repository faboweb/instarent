import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { DocuSignService } from "./docusign";

export interface ContractCreationParams {
  conversationId: any; // Convex Id type
  listingId: any; // Convex Id type
  propertyAddress: string;
  monthlyRent: number;
  currency: string;
  startDate: string;
  endDate: string;
  depositAmount: number;
  tenantName: string;
  tenantEmail: string;
  landlordName?: string;
  landlordEmail?: string;
}

/**
 * Creates a rental contract and generates a signing URL for the tenant
 * 
 * @param convex - Convex HTTP client
 * @param docusignService - DocuSign service instance
 * @param params - Contract parameters
 * @returns Object containing envelopeId, signingUrl, and documentUrl
 */
export async function createContractAndGetSigningUrl(
  convex: ConvexHttpClient,
  docusignService: DocuSignService,
  params: ContractCreationParams
): Promise<{ envelopeId: string; signingUrl: string; documentUrl?: string }> {
  console.log(`📝 Creating contract for ${params.propertyAddress}`);

  // Generate unique client user ID for embedded signing
  const clientUserId = `${params.conversationId}_${Date.now()}`;

  // Create envelope and get signing URL from DocuSign
  const result = await docusignService.createContractAndGetSigningUrl(
    {
      propertyAddress: params.propertyAddress,
      monthlyRent: params.monthlyRent,
      currency: params.currency,
      startDate: params.startDate,
      endDate: params.endDate,
      depositAmount: params.depositAmount,
      tenantName: params.tenantEmail,
      tenantEmail: params.tenantEmail,
      landlordName: params.landlordName || "Property Owner",
      landlordEmail: params.landlordEmail || "[email protected]",
    },
    clientUserId
  );

  // Store contract in database
  const contractId = await convex.mutation(api.contracts.create, {
    conversationId: params.conversationId,
    listingId: params.listingId,
    docusignEnvelopeId: result.envelopeId,
    documentUrl: result.signingUrl, // Store signing URL initially
  });

  console.log(`✅ Contract created: ${contractId}`);
  console.log(`🔗 Signing URL: ${result.signingUrl}`);

  return {
    envelopeId: result.envelopeId,
    signingUrl: result.signingUrl,
    documentUrl: result.signingUrl,
  };
}

/**
 * Refreshes the signing URL for an existing contract
 * (DocuSign URLs expire after 5 minutes, so generate fresh ones on demand)
 * 
 * @param docusignService - DocuSign service instance
 * @param envelopeId - DocuSign envelope ID
 * @param recipientEmail - Signer's email
 * @param recipientName - Signer's name
 * @param conversationId - Conversation ID (used for clientUserId)
 * @returns Fresh signing URL
 */
export async function refreshSigningUrl(
  docusignService: DocuSignService,
  envelopeId: string,
  recipientEmail: string,
  recipientName: string,
  conversationId: any // Convex Id type
): Promise<string> {
  const clientUserId = `${conversationId}_refresh_${Date.now()}`;

  return await docusignService.getSigningUrl(
    envelopeId,
    recipientEmail,
    recipientName,
    clientUserId
  );
}

/**
 * Checks the status of a contract envelope
 * 
 * @param docusignService - DocuSign service instance
 * @param envelopeId - DocuSign envelope ID
 * @returns Envelope status (e.g., "sent", "delivered", "completed", "declined")
 */
export async function checkContractStatus(
  docusignService: DocuSignService,
  envelopeId: string
): Promise<string> {
  return await docusignService.getEnvelopeStatus(envelopeId);
}
