import { FastifyPluginAsync } from "fastify";

import { ServiceEnv, createServiceApp } from "@netlayer/platform";
import { sendEmail, sendSms, sendWhatsapp } from "./providers";

const routes: FastifyPluginAsync = async (app) => {
  app.post("/internal/notifications/send", async (request, reply) => {
    const token = request.headers["x-internal-token"];
    if (token !== process.env.INTERNAL_SERVICE_TOKEN) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const body = request.body as {
      channel: "email" | "sms" | "whatsapp";
      recipient: string;
      subject?: string;
      message: string;
    };

    if (body.channel === "email") {
      await sendEmail(body.recipient, body.subject ?? "Netlayer Notification", body.message);
    }

    if (body.channel === "sms") {
      await sendSms(body.recipient, body.message);
    }

    if (body.channel === "whatsapp") {
      await sendWhatsapp(body.recipient, body.message);
    }

    reply.code(202);
    return { delivered: true };
  });
};

export async function buildNotificationApp(env: ServiceEnv) {
  process.env.INTERNAL_SERVICE_TOKEN = env.internalServiceToken;
  return createServiceApp(env, routes, { disableAuth: true });
}
