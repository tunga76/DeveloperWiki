import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { assertCsrf } from "../../plugins/auth.js";
import { notFound, workspaceContext } from "../content-access.js";
import {
  dashboardData,
  listFavorites,
  listRecents,
  searchDocuments,
} from "./discovery.repository.js";

const paramsSchema = z.object({
  workspaceId: z.uuid(),
  documentId: z.uuid().optional(),
});
const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export async function registerDiscoveryRoutes(app: FastifyInstance) {
  app.get(
    "/:workspaceId/dashboard",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const params = paramsSchema.safeParse(request.params);
      if (!params.success)
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Workspace adresi geçersiz.",
          },
        });
      const context = await workspaceContext(
        app,
        request,
        params.data.workspaceId,
      );
      if (!context) return notFound(reply);
      return {
        role: context.role,
        ...(await dashboardData(
          app,
          context.workspaceId,
          request.authUser!.id,
        )),
      };
    },
  );

  app.get(
    "/:workspaceId/search",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const params = paramsSchema.safeParse(request.params);
      const query = z
        .object({
          q: z.string().trim().min(2).max(100),
          limit: z.coerce.number().int().min(1).max(50).default(20),
        })
        .safeParse(request.query);
      if (!params.success || !query.success)
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Arama en az 2, en fazla 100 karakter olmalı.",
          },
        });
      const context = await workspaceContext(
        app,
        request,
        params.data.workspaceId,
      );
      if (!context) return notFound(reply);
      const results = await searchDocuments(
        app,
        context.workspaceId,
        query.data.q,
        query.data.limit,
      );
      return { query: query.data.q, results };
    },
  );

  app.get(
    "/:workspaceId/favorites",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const params = paramsSchema.safeParse(request.params);
      const page = pageSchema.safeParse(request.query);
      if (!params.success || !page.success)
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Liste filtrelerini kontrol edin.",
          },
        });
      const context = await workspaceContext(
        app,
        request,
        params.data.workspaceId,
      );
      if (!context) return notFound(reply);
      const { favorites, total } = await listFavorites(
        app,
        request.authUser!.id,
        context.workspaceId,
        (page.data.page - 1) * page.data.pageSize,
        page.data.pageSize,
      );
      return {
        favorites,
        pagination: {
          page: page.data.page,
          pageSize: page.data.pageSize,
          total,
          pages: Math.ceil(total / page.data.pageSize),
        },
      };
    },
  );

  app.post(
    "/:workspaceId/documents/:documentId/favorite",
    { preHandler: app.authenticate },
    async (request, reply) => {
      assertCsrf(request);
      const params = paramsSchema.safeParse(request.params);
      if (!params.success || !params.data.documentId)
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Doküman adresi geçersiz.",
          },
        });
      const context = await workspaceContext(
        app,
        request,
        params.data.workspaceId,
      );
      if (!context) return notFound(reply);
      const document = await app.prisma.document.findFirst({
        where: {
          id: params.data.documentId,
          workspaceId: context.workspaceId,
          deletedAt: null,
          category: { deletedAt: null },
        },
        select: { id: true },
      });
      if (!document) return notFound(reply);
      const favorite = await app.prisma.favorite.upsert({
        where: {
          userId_documentId: {
            userId: request.authUser!.id,
            documentId: document.id,
          },
        },
        create: {
          userId: request.authUser!.id,
          documentId: document.id,
          workspaceId: context.workspaceId,
        },
        update: {},
      });
      return reply.code(201).send({ favorite });
    },
  );

  app.get(
    "/:workspaceId/documents/:documentId/favorite",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const params = paramsSchema.safeParse(request.params);
      if (!params.success || !params.data.documentId)
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Doküman adresi geçersiz.",
          },
        });
      const context = await workspaceContext(
        app,
        request,
        params.data.workspaceId,
      );
      if (!context) return notFound(reply);
      const favorite = await app.prisma.favorite.findUnique({
        where: {
          userId_documentId: {
            userId: request.authUser!.id,
            documentId: params.data.documentId,
          },
        },
        select: { documentId: true, workspaceId: true },
      });
      return { isFavorite: favorite?.workspaceId === context.workspaceId };
    },
  );

  app.delete(
    "/:workspaceId/documents/:documentId/favorite",
    { preHandler: app.authenticate },
    async (request, reply) => {
      assertCsrf(request);
      const params = paramsSchema.safeParse(request.params);
      if (!params.success || !params.data.documentId)
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Doküman adresi geçersiz.",
          },
        });
      const context = await workspaceContext(
        app,
        request,
        params.data.workspaceId,
      );
      if (!context) return notFound(reply);
      await app.prisma.favorite.deleteMany({
        where: {
          userId: request.authUser!.id,
          documentId: params.data.documentId,
          workspaceId: context.workspaceId,
        },
      });
      return reply.code(204).send();
    },
  );

  app.get(
    "/:workspaceId/recents",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const params = paramsSchema.safeParse(request.params);
      const query = z
        .object({ limit: z.coerce.number().int().min(1).max(50).default(20) })
        .safeParse(request.query);
      if (!params.success || !query.success)
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Liste sınırını kontrol edin.",
          },
        });
      const context = await workspaceContext(
        app,
        request,
        params.data.workspaceId,
      );
      if (!context) return notFound(reply);
      return {
        documents: await listRecents(
          app,
          request.authUser!.id,
          context.workspaceId,
          query.data.limit,
        ),
      };
    },
  );

  app.post(
    "/:workspaceId/documents/:documentId/recent",
    { preHandler: app.authenticate },
    async (request, reply) => {
      assertCsrf(request);
      const params = paramsSchema.safeParse(request.params);
      if (!params.success || !params.data.documentId)
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Doküman adresi geçersiz.",
          },
        });
      const context = await workspaceContext(
        app,
        request,
        params.data.workspaceId,
      );
      if (!context) return notFound(reply);
      const document = await app.prisma.document.findFirst({
        where: {
          id: params.data.documentId,
          workspaceId: context.workspaceId,
          deletedAt: null,
          category: { deletedAt: null },
        },
        select: { id: true },
      });
      if (!document) return notFound(reply);
      const recent = await app.prisma.recentDocument.upsert({
        where: {
          userId_documentId: {
            userId: request.authUser!.id,
            documentId: document.id,
          },
        },
        create: {
          userId: request.authUser!.id,
          documentId: document.id,
          workspaceId: context.workspaceId,
        },
        update: { lastViewedAt: new Date() },
      });
      return { recent };
    },
  );
}
