import type { FastifyInstance } from "fastify";
import { assertCsrf } from "../../plugins/auth.js";
import { z } from "zod";
import { pagination } from "../categories/category.schema.js";
import {
  createDocument,
  deleteDocument,
  findDocument,
  listDocumentVersions,
  listDocuments,
  updateDocument,
} from "./document.repository.js";
import {
  canWrite,
  conflict,
  forbidden,
  isUniqueConflict,
  notFound,
  workspaceContext,
} from "../content-access.js";

const paramsSchema = z.object({
  workspaceId: z.uuid(),
  documentId: z.uuid().optional(),
});
const inputSchema = z.object({
  title: z.string().trim().min(2).max(200),
  slug: z.string().trim().min(2).max(180).optional(),
  categoryId: z.uuid(),
  content: z.string().max(500_000).optional(),
});
const updateSchema = inputSchema
  .partial()
  .omit({ categoryId: true })
  .extend({
    categoryId: z.uuid().optional(),
    expectedUpdatedAt: z.iso.datetime().transform((value) => new Date(value)),
  });

export async function registerDocumentRoutes(app: FastifyInstance) {
  app.get(
    "/:workspaceId/documents",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const params = paramsSchema.safeParse(request.params);
      const query = pagination
        .extend({ categoryId: z.uuid().optional() })
        .safeParse(request.query);
      if (!params.success || !query.success)
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
      const { documents, total } = await listDocuments(
        app,
        context.workspaceId,
        query.data.categoryId,
        (query.data.page - 1) * query.data.pageSize,
        query.data.pageSize,
      );
      return {
        documents,
        pagination: {
          page: query.data.page,
          pageSize: query.data.pageSize,
          total,
          pages: Math.ceil(total / query.data.pageSize),
        },
      };
    },
  );
  app.post(
    "/:workspaceId/documents",
    { preHandler: app.authenticate },
    async (request, reply) => {
      assertCsrf(request);
      const params = paramsSchema.safeParse(request.params);
      const body = inputSchema.safeParse(request.body);
      if (!params.success || !body.success)
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Doküman bilgilerini kontrol edin.",
          },
        });
      const context = await workspaceContext(
        app,
        request,
        params.data.workspaceId,
      );
      if (!context) return notFound(reply);
      if (!canWrite(context.role)) return forbidden(reply);
      const category = await app.prisma.category.findFirst({
        where: {
          id: body.data.categoryId,
          workspaceId: context.workspaceId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!category) return notFound(reply);
      try {
        return reply.code(201).send({
          document: await createDocument(
            app,
            context.workspaceId,
            category.id,
            request.authUser!.id,
            {
              title: body.data.title,
              ...(body.data.slug ? { slug: body.data.slug } : {}),
              ...(body.data.content !== undefined
                ? { content: body.data.content }
                : {}),
            },
          ),
        });
      } catch (error) {
        if (isUniqueConflict(error)) return conflict(reply);
        throw error;
      }
    },
  );
  app.get(
    "/:workspaceId/documents/:documentId",
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
      const document = await findDocument(
        app,
        context.workspaceId,
        params.data.documentId,
      );
      return document ? { document } : notFound(reply);
    },
  );
  app.patch(
    "/:workspaceId/documents/:documentId",
    { preHandler: app.authenticate },
    async (request, reply) => {
      assertCsrf(request);
      const params = paramsSchema.safeParse(request.params);
      const body = updateSchema.safeParse(request.body);
      if (
        !params.success ||
        !params.data.documentId ||
        !body.success ||
        Object.keys(body.data).length === 1
      )
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Doküman bilgilerini kontrol edin.",
          },
        });
      const context = await workspaceContext(
        app,
        request,
        params.data.workspaceId,
      );
      if (!context) return notFound(reply);
      if (!canWrite(context.role)) return forbidden(reply);
      if (
        !(await findDocument(app, context.workspaceId, params.data.documentId))
      )
        return notFound(reply);
      if (body.data.categoryId) {
        const category = await app.prisma.category.findFirst({
          where: {
            id: body.data.categoryId,
            workspaceId: context.workspaceId,
            deletedAt: null,
          },
          select: { id: true },
        });
        if (!category) return notFound(reply);
      }
      try {
        const input = {
          ...(body.data.title !== undefined ? { title: body.data.title } : {}),
          ...(body.data.slug !== undefined ? { slug: body.data.slug } : {}),
          ...(body.data.content !== undefined
            ? { content: body.data.content }
            : {}),
          ...(body.data.categoryId !== undefined
            ? { categoryId: body.data.categoryId }
            : {}),
          expectedUpdatedAt: body.data.expectedUpdatedAt,
        };
        const result = await updateDocument(
          app,
          context.workspaceId,
          params.data.documentId,
          request.authUser!.id,
          input,
        );
        if (result.kind === "not-found") return notFound(reply);
        if (result.kind === "conflict")
          return reply.code(409).send({
            error: {
              code: "EDIT_CONFLICT",
              message:
                "Doküman siz düzenlerken değiştirildi. Güncel sürümü yükleyip değişikliklerinizi yeniden uygulayın.",
            },
          });
        return { document: result.document };
      } catch (error) {
        if (isUniqueConflict(error)) return conflict(reply);
        throw error;
      }
    },
  );
  app.get(
    "/:workspaceId/documents/:documentId/versions",
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
      const versions = await listDocumentVersions(
        app,
        context.workspaceId,
        params.data.documentId,
      );
      return versions ? { versions } : notFound(reply);
    },
  );
  app.delete(
    "/:workspaceId/documents/:documentId",
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
      if (!canWrite(context.role)) return forbidden(reply);
      const result = await deleteDocument(
        app,
        context.workspaceId,
        params.data.documentId,
      );
      return result.count ? reply.code(204).send() : notFound(reply);
    },
  );
}
