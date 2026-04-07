import "fastify";

import type { AuthenticatedUser } from "./types";

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthenticatedUser;
  }
}
