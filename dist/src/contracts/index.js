import { api } from "../../convex/_generated/api";
/**
 * Creates a rental contract and generates a signing URL for the tenant
 *
 * @param convex - Convex HTTP client
 * @param docusignService - DocuSign service instance
 * @param params - Contract parameters
 * @returns Object containing envelopeId, signingUrl, and documentUrl
 */
export async function createContractAndGetSigningUrl(convex, docusignService, params) {
    console.log(`📝 Creating contract for ${params.propertyAddress}`);
    // Generate unique client user ID for embedded signing
    const clientUserId = `${params.conversationId}_${Date.now()}`;
    // Create envelope and get signing URL from DocuSign
    const result = await docusignService.createContractAndGetSigningUrl({
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
    }, clientUserId);
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
export async function refreshSigningUrl(docusignService, envelopeId, recipientEmail, recipientName, conversationId // Convex Id type
) {
    const clientUserId = `${conversationId}_refresh_${Date.now()}`;
    return await docusignService.getSigningUrl(envelopeId, recipientEmail, recipientName, clientUserId);
}
/**
 * Checks the status of a contract envelope
 *
 * @param docusignService - DocuSign service instance
 * @param envelopeId - DocuSign envelope ID
 * @returns Envelope status (e.g., "sent", "delivered", "completed", "declined")
 */
export async function checkContractStatus(docusignService, envelopeId) {
    return await docusignService.getEnvelopeStatus(envelopeId);
}
//# sourceMappingURL=index.js.map