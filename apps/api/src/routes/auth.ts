import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  CSRF_COOKIE,
  REFRESH_COOKIE,
  assertCsrf,
  clearAuthCookies,
  setAuthCookies,
  setCsrfCookie,
} from "../plugins/auth.js";
import {
  createCsrfToken,
  createOpaqueToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "../lib/security.js";

const credentialsSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(12).max(128),
  name: z.string().trim().min(2).max(120).optional(),
});
const profileSchema = z.object({
  name: z.string().trim().min(2).max(120).nullable(),
});
const refreshLifetimeMs = 30 * 24 * 60 * 60 * 1000;

async function issueSession(
  app: FastifyInstance,
  reply: FastifyReply,
  user: { id: string; email: string },
  familyId: string = randomUUID(),
  previousHash?: string,
) {
  const refreshToken = createOpaqueToken();
  const expiresAt = new Date(Date.now() + refreshLifetimeMs);
  if (previousHash) {
    const rotated = await app.prisma.$transaction(async (tx) => {
      const old = await tx.refreshSession.findUnique({
        where: { tokenHash: previousHash },
      });
      if (!old || old.expiresAt <= new Date()) return false;
      if (old.revokedAt) {
        await tx.refreshSession.updateMany({
          where: { familyId: old.familyId },
          data: { revokedAt: new Date() },
        });
        return false;
      }
      const result = await tx.refreshSession.updateMany({
        where: { id: old.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (result.count !== 1) {
        await tx.refreshSession.updateMany({
          where: { familyId: old.familyId },
          data: { revokedAt: new Date() },
        });
        return false;
      }
      await tx.refreshSession.create({
        data: {
          userId: user.id,
          familyId: old.familyId,
          tokenHash: hashToken(refreshToken),
          expiresAt,
        },
      });
      return true;
    });
    if (!rotated) return false;
  } else {
    await app.prisma.refreshSession.create({
      data: {
        userId: user.id,
        familyId,
        tokenHash: hashToken(refreshToken),
        expiresAt,
      },
    });
  }
  const accessToken = app.jwt.sign({ sub: user.id, email: user.email });
  setAuthCookies(reply, accessToken, refreshToken);
  setCsrfCookie(reply, createCsrfToken());
  return true;
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.get("/csrf", async (_request, reply) => {
    const token = createCsrfToken();
    setCsrfCookie(reply, token);
    return { csrfToken: token };
  });

  app.post(
    "/register",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      assertCsrf(request);
      const parsed = credentialsSchema.safeParse(request.body);
      if (!parsed.success)
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Bilgileri kontrol edin.",
            fields: z.flattenError(parsed.error).fieldErrors,
          },
        });
      const email = parsed.data.email.trim().toLowerCase();
      const existing = await app.prisma.user.findUnique({ where: { email } });
      if (existing)
        return reply.code(409).send({
          error: {
            code: "EMAIL_IN_USE",
            message: "Bu e-posta adresi kullanılıyor.",
          },
        });
      let user;
      try {
        user = await app.prisma.user.create({
          data: {
            email,
            ...(parsed.data.name ? { name: parsed.data.name } : {}),
            passwordHash: await hashPassword(parsed.data.password),
          },
          select: { id: true, email: true, name: true },
        });
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002"
        ) {
          return reply.code(409).send({
            error: {
              code: "EMAIL_IN_USE",
              message: "Bu e-posta adresi kullanılıyor.",
            },
          });
        }
        throw error;
      }
      await issueSession(app, reply, user);
      return reply.code(201).send({ user });
    },
  );

  app.post(
    "/login",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      assertCsrf(request);
      const parsed = z
        .object({
          email: z.email().max(320),
          password: z.string().min(1).max(128),
        })
        .safeParse(request.body);
      if (!parsed.success)
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "E-posta ve parola gerekli.",
          },
        });
      const email = parsed.data.email.trim().toLowerCase();
      const user = await app.prisma.user.findFirst({
        where: { email, deletedAt: null },
      });
      const passwordOk = user
        ? await verifyPassword(user.passwordHash, parsed.data.password)
        : false;
      if (!user || !passwordOk)
        return reply.code(401).send({
          error: {
            code: "INVALID_CREDENTIALS",
            message: "E-posta veya parola hatalı.",
          },
        });
      await issueSession(app, reply, user);
      return { user: { id: user.id, email: user.email, name: user.name } };
    },
  );

  app.post(
    "/refresh",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (request, reply) => {
      assertCsrf(request);
      const oldToken = request.cookies[REFRESH_COOKIE];
      if (!oldToken)
        return reply.code(401).send({
          error: { code: "UNAUTHENTICATED", message: "Oturum yenilenemedi." },
        });
      const tokenHash = hashToken(oldToken);
      const session = await app.prisma.refreshSession.findUnique({
        where: { tokenHash },
        include: { user: true },
      });
      if (
        !session ||
        session.expiresAt <= new Date() ||
        session.user.deletedAt
      ) {
        return reply.code(401).send({
          error: { code: "UNAUTHENTICATED", message: "Oturum yenilenemedi." },
        });
      }
      const rotated = await issueSession(
        app,
        reply,
        session.user,
        session.familyId,
        tokenHash,
      );
      if (!rotated) {
        clearAuthCookies(reply);
        return reply.code(401).send({
          error: {
            code: "REFRESH_REUSED",
            message:
              "Oturum güvenlik nedeniyle kapatıldı. Yeniden giriş yapın.",
          },
        });
      }
      return {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        },
      };
    },
  );

  app.post("/logout", async (request, reply) => {
    assertCsrf(request);
    const token = request.cookies[REFRESH_COOKIE];
    if (token)
      await app.prisma.refreshSession.updateMany({
        where: { tokenHash: hashToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    clearAuthCookies(reply);
    reply.clearCookie(CSRF_COOKIE, { path: "/" });
    return reply.code(204).send();
  });

  app.get("/me", { preHandler: app.authenticate }, async (request) => ({
    user: request.authUser,
  }));

  app.patch("/me", { preHandler: app.authenticate }, async (request) => {
    assertCsrf(request);
    const parsed = profileSchema.safeParse(request.body);
    if (!parsed.success) {
      const error = new Error("Profil bilgileri geçersiz.");
      Object.assign(error, {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        fields: parsed.error.flatten().fieldErrors,
      });
      throw error;
    }
    const user = await app.prisma.user.update({
      where: { id: request.authUser!.id },
      data: { name: parsed.data.name },
      select: { id: true, email: true, name: true },
    });
    return { user };
  });
}
