import Stripe from "stripe";
export interface PaymentConfig {
    secretKey: string;
    webhookSecret?: string;
}
export interface InvoiceDetails {
    customerEmail: string;
    customerName: string;
    description: string;
    amount: number;
    currency: string;
    dueDate?: Date;
    metadata?: Record<string, string>;
}
export interface InvoiceResult {
    invoiceId: string;
    status: string;
    hostedInvoiceUrl?: string;
    invoicePdf?: string;
    amountDue: number;
    currency: string;
}
export declare class PaymentService {
    private stripe;
    constructor(config: PaymentConfig);
    createCustomer(email: string, name: string): Promise<string>;
    getOrCreateCustomer(email: string, name: string): Promise<string>;
    createInvoice(details: InvoiceDetails): Promise<InvoiceResult>;
    sendInvoice(invoiceId: string): Promise<InvoiceResult>;
    getInvoiceStatus(invoiceId: string): Promise<InvoiceResult>;
    createRentalPaymentInvoice(tenantEmail: string, tenantName: string, propertyTitle: string, monthlyRent: number, deposit: number, currency: string): Promise<InvoiceResult>;
    constructEvent(payload: string | Buffer, signature: string, secret: string): Stripe.Event;
}
export declare function createPaymentService(secretKey: string): PaymentService;
//# sourceMappingURL=stripe.d.ts.map