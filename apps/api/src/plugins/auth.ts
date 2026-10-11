import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import fp from "fastify-plugin";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config.js";
import { safeEqual } from "../lib/security.js";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
};

declare module "fastify" {
  interface FastifyRequest {
    authUser: AuthenticatedUser | null;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; email: string };
    user: { sub: string; email: string };
  }
}

export const ACCESS_COOKIE = "dw_access";
export const REFRESH_COOKIE = "dw_refresh";
export const CSRF_COOKIE = "dw_csrf";

export function setCsrfCookie(reply: FastifyReply, token: string) {
  reply.setCookie(CSRF_COOKIE, token, {
    path: "/",
    sameSite: "lax",
    secure: config.cookieSecure,
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function setAuthCookies(
  reply: FastifyReply,
  access: string,
  refresh: string,
) {
  reply.setCookie(ACCESS_COOKIE, access, {
    path: "/",
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    maxAge: 15 * 60,
  });
  reply.setCookie(REFRESH_COOKIE, refresh, {
    path: "/api/v1/auth",
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie(ACCESS_COOKIE, { path: "/" });
  reply.clearCookie(REFRESH_COOKIE, { path: "/api/v1/auth" });
}

export function assertOrigin(request: FastifyRequest) {
  const origin = request.headers.origin;
  if (origin && origin !== config.WEB_ORIGIN) {
    const error = new Error("Origin not allowed");
    Object.assign(error, { statusCode: 403, code: "ORIGIN_FORBIDDEN" });
    throw error;
  }
}

export function assertCsrf(request: FastifyRequest) {
  assertOrigin(request);
  const cookieToken = request.cookies[CSRF_COOKIE];
  const headerToken = request.headers["x-csrf-token"];
  if (
    !cookieToken ||
    typeof headerToken !== "string" ||
    !safeEqual(cookieToken, headerToken)
  ) {
    const error = new Error("CSRF validation failed");
    Object.assign(error, { statusCode: 403, code: "CSRF_INVALID" });
    throw error;
  }
}

export default fp(async (app) => {
  await app.register(cookie);
  await app.register(jwt, {
    secret: config.JWT_SECRET,
    cookie: { cookieName: ACCESS_COOKIE, signed: false },
    sign: { expiresIn: "15m" },
  });
  app.decorateRequest("authUser", null);
  app.addHook("onRequest", async (request) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method))
      assertOrigin(request);
  });
  app.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
        const user = await app.prisma.user.findFirst({
          where: { id: request.user.sub, deletedAt: null },
          select: { id: true, email: true, name: true },
        });
        if (!user)
          return reply.code(401).send({
            error: { code: "UNAUTHENTICATED", message: "Oturum gerekli." },
          });
        request.authUser = user;
      } catch {
        return reply.code(401).send({
          error: { code: "UNAUTHENTICATED", message: "Oturum gerekli." },
        });
      }
    },
  );
});

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<unknown>;
  }
}
