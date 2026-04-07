import { query } from "@netlayer/platform";

import { ZohoBooksClient } from "./zoho";

export async function syncCustomerInvoices(customerId: string) {
  const customer = await query<{
    zoho_customer_id: string;
  }>(
    process.env.DATABASE_URL!,
    "SELECT zoho_customer_id FROM customers WHERE id = $1",
    [customerId]
  );

  if (!customer.rows[0]) {
    throw new Error("Customer not found");
  }

  const zoho = new ZohoBooksClient();
  const invoices = await zoho.listInvoices(customer.rows[0].zoho_customer_id);

  for (const invoice of invoices.invoices) {
    const typedInvoice = invoice as Record<string, unknown>;
    await query(
      process.env.DATABASE_URL!,
      `
        INSERT INTO billing_invoices (
          customer_id,
          zoho_invoice_id,
          status,
          payment_status,
          payload
        )
        VALUES ($1, $2, $3, $4, $5::jsonb)
        ON CONFLICT (zoho_invoice_id) DO UPDATE
        SET
          status = EXCLUDED.status,
          payment_status = EXCLUDED.payment_status,
          payload = EXCLUDED.payload,
          updated_at = NOW()
      `,
      [
        customerId,
        String(typedInvoice.invoice_id),
        String(typedInvoice.status ?? "unknown"),
        String(typedInvoice.payment_status ?? typedInvoice.status ?? "unknown"),
        JSON.stringify(typedInvoice)
      ]
    );
  }

  return invoices.invoices;
}
