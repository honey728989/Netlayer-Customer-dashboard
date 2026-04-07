import { FastifyPluginAsync } from "fastify";

import {
  EventBus,
  ServiceEnv,
  createServiceApp,
  query,
  requireAuth
} from "@netlayer/platform";

import { enqueueWebhookJob, startWebhookWorker } from "./reliability";
import { syncCustomerInvoices } from "./sync";
import { ZohoBooksClient } from "./zoho";

const routes: FastifyPluginAsync = async (app) => {
  const zoho = new ZohoBooksClient();
  const eventBus = new EventBus(process.env.REDIS_URL!);
  const queueConfig = {
    redisUrl: process.env.REDIS_URL!,
    serviceName: "billing-service",
    attempts: Number(process.env.QUEUE_DEFAULT_ATTEMPTS ?? 5),
    backoffMs: Number(process.env.QUEUE_BACKOFF_MS ?? 10000)
  };
  await startWebhookWorker(queueConfig);

  app.get("/finance/summary", { preHandler: [requireAuth] }, async () => {
    const [invoiceStats, paymentStats] = await Promise.all([
      query<{
        total_outstanding: string;
        paid_invoices: string;
        overdue_invoices: string;
      }>(
        process.env.DATABASE_URL!,
        `
          SELECT
            COALESCE(SUM((payload ->> 'total')::numeric), 0) FILTER (WHERE COALESCE(payment_status, status) <> 'paid')::text AS total_outstanding,
            COUNT(*) FILTER (WHERE COALESCE(payment_status, status) = 'paid')::text AS paid_invoices,
            COUNT(*) FILTER (WHERE status IN ('overdue', 'sent'))::text AS overdue_invoices
          FROM billing_invoices
        `
      ),
      query<{
        pending_payments: string;
        collected_amount: string;
      }>(
        process.env.DATABASE_URL!,
        `
          SELECT
            COUNT(*) FILTER (WHERE status IN ('PENDING', 'REQUESTED'))::text AS pending_payments,
            COALESCE(SUM(amount) FILTER (WHERE status = 'PAID'), 0)::text AS collected_amount
          FROM payments
        `
      )
    ]);

    return {
      invoices: {
        totalOutstanding: Number(invoiceStats.rows[0]?.total_outstanding ?? 0),
        paidInvoices: Number(invoiceStats.rows[0]?.paid_invoices ?? 0),
        overdueInvoices: Number(invoiceStats.rows[0]?.overdue_invoices ?? 0)
      },
      payments: {
        pending: Number(paymentStats.rows[0]?.pending_payments ?? 0),
        collectedAmount: Number(paymentStats.rows[0]?.collected_amount ?? 0)
      }
    };
  });

  app.get("/customers/:id/billing", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };

    const customer = await query<{
      id: string;
      zoho_customer_id: string;
    }>(
      process.env.DATABASE_URL!,
      `
        SELECT id, zoho_customer_id
        FROM customers
        WHERE id = $1
      `,
      [params.id]
    );

    if (!customer.rows[0]) {
      return reply.code(404).send({ message: "Customer not found" });
    }

    const invoices = await zoho.listInvoices(customer.rows[0].zoho_customer_id);
    return invoices.invoices;
  });

  app.get("/customers/:id/ledger", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const customer = await query<{ id: string }>(
      process.env.DATABASE_URL!,
      `SELECT id FROM customers WHERE id = $1`,
      [params.id]
    );

    if (!customer.rows[0]) {
      return reply.code(404).send({ message: "Customer not found" });
    }

    const [invoiceStats, paymentStats] = await Promise.all([
      query<{
        total_invoiced: string;
        outstanding: string;
        overdue_count: string;
      }>(
        process.env.DATABASE_URL!,
        `
          SELECT
            COALESCE(SUM((payload ->> 'total')::numeric), 0)::text AS total_invoiced,
            COALESCE(SUM((payload ->> 'balance')::numeric), 0)::text AS outstanding,
            COUNT(*) FILTER (WHERE status = 'overdue')::text AS overdue_count
          FROM billing_invoices
          WHERE customer_id = $1
        `,
        [params.id]
      ),
      query<{
        collected: string;
        pending_links: string;
      }>(
        process.env.DATABASE_URL!,
        `
          SELECT
            COALESCE(SUM(amount) FILTER (WHERE status = 'PAID'), 0)::text AS collected,
            COUNT(*) FILTER (WHERE status IN ('PENDING', 'REQUESTED'))::text AS pending_links
          FROM payments
          WHERE customer_id = $1
        `,
        [params.id]
      )
    ]);

    return {
      invoicedAmount: Number(invoiceStats.rows[0]?.total_invoiced ?? 0),
      outstandingAmount: Number(invoiceStats.rows[0]?.outstanding ?? 0),
      overdueInvoices: Number(invoiceStats.rows[0]?.overdue_count ?? 0),
      collectedAmount: Number(paymentStats.rows[0]?.collected ?? 0),
      pendingPaymentLinks: Number(paymentStats.rows[0]?.pending_links ?? 0)
    };
  });

  app.get("/customers/:id/payments", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT *
        FROM payments
        WHERE customer_id = $1
        ORDER BY created_at DESC
      `,
      [params.id]
    );

    return result.rows;
  });

  app.post("/customers/:id/payment-links", { preHandler: [requireAuth] }, async (request) => {
    const params = request.params as { id: string };
    const body = request.body as { amount: number; invoiceId?: string; description?: string };

    const paymentLink = `https://payments.example.test/customer/${params.id}/${Date.now()}`;
    const result = await query(
      process.env.DATABASE_URL!,
      `
        INSERT INTO payments (
          customer_id,
          invoice_id,
          amount,
          status,
          payment_method,
          payment_link,
          payload
        )
        VALUES ($1, $2, $3, 'REQUESTED', 'ZOHO_PAYMENT_LINK', $4, $5::jsonb)
        RETURNING *
      `,
      [
        params.id,
        body.invoiceId ?? null,
        body.amount,
        paymentLink,
        JSON.stringify({ description: body.description ?? "Customer initiated payment link" })
      ]
    );

    return result.rows[0];
  });

  app.post("/billing/invoices", { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as {
      customerId: string;
      lineItems: Array<Record<string, unknown>>;
      dueDate: string;
    };

    const customer = await query<{
      id: string;
      name: string;
      zoho_customer_id: string;
    }>(
      process.env.DATABASE_URL!,
      "SELECT id, name, zoho_customer_id FROM customers WHERE id = $1",
      [body.customerId]
    );

    if (!customer.rows[0]) {
      return reply.code(400).send({ message: "Customer not found" });
    }

    const invoice = await zoho.createInvoice({
      customer_id: customer.rows[0].zoho_customer_id,
      line_items: body.lineItems,
      due_date: body.dueDate
    });

    const saved = await query(
      process.env.DATABASE_URL!,
      `
        INSERT INTO billing_invoices (customer_id, zoho_invoice_id, status, payload)
        VALUES ($1, $2, $3, $4::jsonb)
        RETURNING *
      `,
      [
        body.customerId,
        invoice.invoice.invoice_id,
        invoice.invoice.status,
        JSON.stringify(invoice.invoice)
      ]
    );

    await eventBus.publish("alerts", {
      type: "billing.invoice.created",
      payload: saved.rows[0]
    });

    reply.code(201);
    return saved.rows[0];
  });

  app.post("/billing/customers/:id/sync", { preHandler: [requireAuth] }, async (request) => {
    const params = request.params as { id: string };
    const invoices = await syncCustomerInvoices(params.id);
    return { synced: invoices.length };
  });

  app.post("/billing/payments/webhook", async (request, reply) => {
    const signature = request.headers["x-zoho-signature"];
    if (signature !== process.env.ZOHO_WEBHOOK_SECRET) {
      return reply.code(401).send({ message: "Invalid webhook signature" });
    }

    const body = request.body as {
      event_id?: string;
      invoice_id: string;
      status: string;
      payment_status?: string;
      customer_id?: string;
    };

    const eventId = body.event_id ?? `${body.invoice_id}:${Date.now()}`;
    await query(
      process.env.DATABASE_URL!,
      `
        INSERT INTO zoho_webhook_events (event_id, invoice_id, payload, processing_status)
        VALUES ($1, $2, $3::jsonb, 'QUEUED')
        ON CONFLICT (event_id) DO NOTHING
      `,
      [eventId, body.invoice_id, JSON.stringify(body)]
    );

    await enqueueWebhookJob(queueConfig, {
      eventId,
      invoiceId: body.invoice_id,
      status: body.status,
      paymentStatus: body.payment_status,
      customerId: body.customer_id
    });

    reply.code(202);
    return { accepted: true };
  });
};

export async function buildBillingApp(env: ServiceEnv) {
  process.env.DATABASE_URL = env.postgresUrl;
  process.env.REDIS_URL = env.redisUrl;
  return createServiceApp(env, routes, {
    healthIndicators: [
      {
        name: "zoho-books",
        check: async () => {
          if (!process.env.ZOHO_BOOKS_BASE_URL || !process.env.ZOHO_BOOKS_ORGANIZATION_ID) {
            return { status: "degraded", detail: "Zoho Books not configured" };
          }

          const zoho = new ZohoBooksClient();
          await zoho.authenticate();
          return { status: "ok" as const };
        }
      }
    ]
  });
}
