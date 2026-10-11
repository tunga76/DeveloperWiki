import type { FastifyInstance } from "fastify";
import { assertCsrf } from "../../plugins/auth.js";
import { z } from "zod";
import { categoryInput, categoryParams } from "./category.schema.js";
import {
  createCategory,
  deleteCategory,
  findCategory,
  listCategories,
  updateCategory,
} from "./category.repository.js";
import {
  canWrite,
  conflict,
  forbidden,
  isUniqueConflict,
  notFound,
  workspaceContext,
} from "../content-access.js";

export async function registerCategoryRoutes(app: FastifyInstance) {
  app.get(
    "/:workspaceId/categories",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const params = categoryParams.safeParse(request.params);
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
      return { categories: await listCategories(app, context.workspaceId) };
    },
  );
  app.post(
    "/:workspaceId/categories",
    { preHandler: app.authenticate },
    async (request, reply) => {
      assertCsrf(request);
      const params = categoryParams.safeParse(request.params);
      const body = categoryInput.safeParse(request.body);
      if (!params.success || !body.success)
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Kategori bilgilerini kontrol edin.",
          },
        });
      const context = await workspaceContext(
        app,
        request,
        params.data.workspaceId,
      );
      if (!context) return notFound(reply);
      if (!canWrite(context.role)) return forbidden(reply);
      try {
        return reply.code(201).send({
          category: await createCategory(
            app,
            context.workspaceId,
            request.authUser!.id,
            {
              name: body.data.name,
              ...(body.data.slug ? { slug: body.data.slug } : {}),
              ...(body.data.description !== undefined
                ? { description: body.data.description }
                : {}),
              ...(body.data.color !== undefined
                ? { color: body.data.color }
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
  app.patch(
    "/:workspaceId/categories/:categoryId",
    { preHandler: app.authenticate },
    async (request, reply) => {
      assertCsrf(request);
      const params = categoryParams.safeParse(request.params);
      const body = categoryInput.partial().safeParse(request.body);
      if (
        !params.success ||
        !params.data.categoryId ||
        !body.success ||
        Object.keys(body.data).length === 0
      )
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Kategori bilgilerini kontrol edin.",
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
        !(await findCategory(app, context.workspaceId, params.data.categoryId))
      )
        return notFound(reply);
      try {
        const input = {
          ...(body.data.name !== undefined ? { name: body.data.name } : {}),
          ...(body.data.slug !== undefined ? { slug: body.data.slug } : {}),
          ...(body.data.description !== undefined
            ? { description: body.data.description }
            : {}),
          ...(body.data.color !== undefined ? { color: body.data.color } : {}),
        };
        const result = await updateCategory(
          app,
          context.workspaceId,
          params.data.categoryId,
          request.authUser!.id,
          input,
        );
        return result.count
          ? {
              category: await findCategory(
                app,
                context.workspaceId,
                params.data.categoryId,
              ),
            }
          : notFound(reply);
      } catch (error) {
        if (isUniqueConflict(error)) return conflict(reply);
        throw error;
      }
    },
  );
  app.delete(
    "/:workspaceId/categories/:categoryId",
    { preHandler: app.authenticate },
    async (request, reply) => {
      assertCsrf(request);
      const params = categoryParams.safeParse(request.params);
      if (!params.success || !params.data.categoryId)
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Kategori adresi geçersiz.",
          },
        });
      const context = await workspaceContext(
        app,
        request,
        params.data.workspaceId,
      );
      if (!context) return notFound(reply);
      if (!canWrite(context.role)) return forbidden(reply);
      const result = await deleteCategory(
        app,
        context.workspaceId,
        params.data.categoryId,
      );
      return result.count ? reply.code(204).send() : notFound(reply);
    },
  );
}
