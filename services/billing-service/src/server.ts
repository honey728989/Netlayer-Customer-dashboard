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
