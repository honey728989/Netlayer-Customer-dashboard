import jwt from "jsonwebtoken";

import { AuthenticatedUser, JwtPayload } from "./types";

interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  issuer: string;
  audience: string;
}

export function signAccessToken(user: AuthenticatedUser, config: JwtConfig) {
  return jwt.sign(
    { ...user, type: "access" satisfies JwtPayload["type"] },
    config.accessSecret,
    {
      expiresIn: "15m",
      issuer: config.issuer,
      audience: config.audience,
      subject: user.userId
    }
  );
}

export function signRefreshToken(user: AuthenticatedUser, config: JwtConfig) {
  return jwt.sign(
    { ...user, type: "refresh" satisfies JwtPayload["type"] },
    config.refreshSecret,
    {
      expiresIn: "7d",
      issuer: config.issuer,
      audience: config.audience,
      subject: user.userId
    }
  );
}

export function verifyAccessToken(token: string, config: JwtConfig) {
  return jwt.verify(token, config.accessSecret, {
    issuer: config.issuer,
    audience: config.audience
  }) as JwtPayload;
}
