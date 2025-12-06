import { ConvexHttpClient } from "convex/browser";
import { DocuSignService } from "./docusign";
export interface ContractCreationParams {
    conversationId: any;
    listingId: any;
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
export declare function createContractAndGetSigningUrl(convex: ConvexHttpClient, docusignService: DocuSignService, params: ContractCreationParams): Promise<{
    envelopeId: string;
    signingUrl: string;
    documentUrl?: string;
}>;
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
export declare function refreshSigningUrl(docusignService: DocuSignService, envelopeId: string, recipientEmail: string, recipientName: string, conversationId: any): Promise<string>;
/**
 * Checks the status of a contract envelope
 *
 * @param docusignService - DocuSign service instance
 * @param envelopeId - DocuSign envelope ID
 * @returns Envelope status (e.g., "sent", "delivered", "completed", "declined")
 */
export declare function checkContractStatus(docusignService: DocuSignService, envelopeId: string): Promise<string>;
//# sourceMappingURL=index.d.ts.map