import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { assertCsrf } from "../plugins/auth.js";
import { slugify } from "../lib/security.js";

const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(80).optional(),
});

export async function registerWorkspaceRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: app.authenticate }, async (request) => {
    const memberships = await app.prisma.workspaceMember.findMany({
      where: { userId: request.authUser!.id, workspace: { deletedAt: null } },
      orderBy: { createdAt: "asc" },
      select: {
        role: true,
        workspace: {
          select: { id: true, name: true, slug: true, createdAt: true },
        },
      },
    });
    return {
      workspaces: memberships.map(({ workspace, role }) => ({
        ...workspace,
        role,
      })),
    };
  });

  app.post(
    "/",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      assertCsrf(request);
      const parsed = createSchema.safeParse(request.body);
      if (!parsed.success)
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Workspace bilgilerini kontrol edin.",
            fields: z.flattenError(parsed.error).fieldErrors,
          },
        });
      const slug = slugify(parsed.data.slug ?? parsed.data.name);
      if (slug.length < 2)
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Geçerli bir workspace adı veya slug girin.",
          },
        });
      try {
        const workspace = await app.prisma.$transaction(async (tx) => {
          const created = await tx.workspace.create({
            data: { name: parsed.data.name, slug },
          });
          await tx.workspaceMember.create({
            data: {
              workspaceId: created.id,
              userId: request.authUser!.id,
              role: "ADMIN",
            },
          });
          return created;
        });
        return reply
          .code(201)
          .send({ workspace: { ...workspace, role: "ADMIN" } });
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002"
        ) {
          return reply.code(409).send({
            error: {
              code: "SLUG_IN_USE",
              message: "Bu workspace adresi zaten kullanılıyor.",
              fields: { slug: ["Başka bir adres deneyin."] },
            },
          });
        }
        throw error;
      }
    },
  );

  app.patch(
    "/:workspaceId",
    { preHandler: app.authenticate },
    async (request, reply) => {
      assertCsrf(request);
      const params = z
        .object({ workspaceId: z.uuid() })
        .safeParse(request.params);
      const parsed = createSchema.partial().safeParse(request.body);
      if (
        !params.success ||
        !parsed.success ||
        Object.keys(parsed.data).length === 0
      ) {
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Workspace bilgilerini kontrol edin.",
          },
        });
      }
      const membership = await app.prisma.workspaceMember.findFirst({
        where: {
          workspaceId: params.data.workspaceId,
          userId: request.authUser!.id,
          workspace: { deletedAt: null },
        },
      });
      if (!membership || membership.role !== "ADMIN")
        return reply.code(404).send({
          error: { code: "NOT_FOUND", message: "Workspace bulunamadı." },
        });
      const data: { name?: string; slug?: string } = {};
      if (parsed.data.name) data.name = parsed.data.name;
      if (parsed.data.slug) {
        data.slug = slugify(parsed.data.slug);
        if (data.slug.length < 2)
          return reply.code(400).send({
            error: {
              code: "VALIDATION_ERROR",
              message: "Geçerli bir workspace adresi girin.",
            },
          });
      }
      try {
        const workspace = await app.prisma.workspace.update({
          where: { id: params.data.workspaceId },
          data,
        });
        return { workspace: { ...workspace, role: membership.role } };
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002"
        ) {
          return reply.code(409).send({
            error: {
              code: "SLUG_IN_USE",
              message: "Bu workspace adresi zaten kullanılıyor.",
            },
          });
        }
        throw error;
      }
    },
  );
}
