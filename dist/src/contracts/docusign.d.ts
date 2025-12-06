export interface DocuSignConfig {
    integrationKey: string;
    userId: string;
    accountId: string;
    basePath: string;
    privateKey?: string;
    privateKeyPath?: string;
    returnUrl?: string;
}
export interface ContractDetails {
    propertyAddress: string;
    monthlyRent: number;
    currency: string;
    startDate: string;
    endDate: string;
    depositAmount: number;
    tenantName: string;
    tenantEmail: string;
    landlordName: string;
    landlordEmail: string;
}
export interface SigningUrlResult {
    envelopeId: string;
    signingUrl: string;
}
export declare class DocuSignService {
    private config;
    private apiClient;
    private accessToken;
    private tokenExpiresAt;
    constructor(config: DocuSignConfig);
    private getAccessToken;
    createContractAndGetSigningUrl(details: ContractDetails, clientUserId: string): Promise<SigningUrlResult>;
    getSigningUrl(envelopeId: string, recipientEmail: string, recipientName: string, clientUserId: string): Promise<string>;
    getEnvelopeStatus(envelopeId: string): Promise<string>;
    private generateContractHtml;
}
export declare function createDocuSignService(config: DocuSignConfig): DocuSignService;
//# sourceMappingURL=docusign.d.ts.map