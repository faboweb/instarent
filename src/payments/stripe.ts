import Stripe from "stripe";

export interface PaymentConfig {
  secretKey: string;
  webhookSecret?: string;
}

export interface InvoiceDetails {
  customerEmail: string;
  customerName: string;
  description: string;
  amount: number; // in cents
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

export class PaymentService {
  private stripe: Stripe;

  constructor(config: PaymentConfig) {
    this.stripe = new Stripe(config.secretKey);
  }

  async createCustomer(email: string, name: string): Promise<string> {
    const customer = await this.stripe.customers.create({
      email,
      name,
    });
    return customer.id;
  }

  async getOrCreateCustomer(email: string, name: string): Promise<string> {
    // Check if customer exists
    const existing = await this.stripe.customers.list({
      email,
      limit: 1,
    });

    if (existing.data.length > 0) {
      return existing.data[0].id;
    }

    return this.createCustomer(email, name);
  }

  async createInvoice(details: InvoiceDetails): Promise<InvoiceResult> {
    console.log(`💳 Creating invoice for ${details.customerEmail}`);

    // Get or create customer
    const customerId = await this.getOrCreateCustomer(
      details.customerEmail,
      details.customerName
    );

    // Create invoice item
    await this.stripe.invoiceItems.create({
      customer: customerId,
      amount: details.amount,
      currency: details.currency.toLowerCase(),
      description: details.description,
    });

    // Create invoice
    const invoice = await this.stripe.invoices.create({
      customer: customerId,
      collection_method: "send_invoice",
      days_until_due: details.dueDate
        ? Math.ceil(
          (details.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
        : 7,
      metadata: details.metadata,
    });

    // Finalize invoice to get the hosted URL
    const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(
      invoice.id
    );

    console.log(`✅ Invoice created: ${finalizedInvoice.id}`);

    return {
      invoiceId: finalizedInvoice.id,
      status: finalizedInvoice.status || "draft",
      hostedInvoiceUrl: finalizedInvoice.hosted_invoice_url || undefined,
      invoicePdf: finalizedInvoice.invoice_pdf || undefined,
      amountDue: finalizedInvoice.amount_due,
      currency: finalizedInvoice.currency,
    };
  }

  async sendInvoice(invoiceId: string): Promise<InvoiceResult> {
    const invoice = await this.stripe.invoices.sendInvoice(invoiceId);

    return {
      invoiceId: invoice.id,
      status: invoice.status || "sent",
      hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
      invoicePdf: invoice.invoice_pdf || undefined,
      amountDue: invoice.amount_due,
      currency: invoice.currency,
    };
  }

  async getInvoiceStatus(invoiceId: string): Promise<InvoiceResult> {
    const invoice = await this.stripe.invoices.retrieve(invoiceId);

    return {
      invoiceId: invoice.id,
      status: invoice.status || "unknown",
      hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
      invoicePdf: invoice.invoice_pdf || undefined,
      amountDue: invoice.amount_due,
      currency: invoice.currency,
    };
  }

  async createRentalPaymentInvoice(
    tenantEmail: string,
    tenantName: string,
    propertyTitle: string,
    monthlyRent: number,
    deposit: number,
    currency: string
  ): Promise<InvoiceResult> {
    const totalAmount = (monthlyRent + deposit) * 100; // Convert to cents

    return this.createInvoice({
      customerEmail: tenantEmail,
      customerName: tenantName,
      description: `Rental Payment for ${propertyTitle} - First Month + Deposit`,
      amount: totalAmount,
      currency,
      metadata: {
        type: "rental_payment",
        property: propertyTitle,
        monthly_rent: monthlyRent.toString(),
        deposit: deposit.toString(),
      },
    });
  }

  // Webhook handler for payment events
  constructEvent(payload: string | Buffer, signature: string, secret: string) {
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }
}

export function createPaymentService(secretKey: string): PaymentService {
  return new PaymentService({ secretKey });
}
