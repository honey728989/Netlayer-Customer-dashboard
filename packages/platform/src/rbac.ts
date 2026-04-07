import { FastifyReply, FastifyRequest } from "fastify";

import { AuthenticatedUser, RoleName } from "./types";

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthenticatedUser;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!request.auth) {
    return reply.code(401).send({ message: "Authentication required" });
  }
}

export function requireRoles(allowed: RoleName[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.auth) {
      return reply.code(401).send({ message: "Authentication required" });
    }

    if (!request.auth.roles.some((role) => allowed.includes(role))) {
      return reply.code(403).send({ message: "Insufficient role" });
    }
  };
}
