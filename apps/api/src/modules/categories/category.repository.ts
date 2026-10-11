import { slugify } from "../../lib/security.js";
import type { FastifyInstance } from "fastify";

export async function listCategories(
  app: FastifyInstance,
  workspaceId: string,
) {
  return app.prisma.category.findMany({
    where: { workspaceId, deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          documents: {
            where: { deletedAt: null, category: { deletedAt: null } },
          },
        },
      },
    },
  });
}
export async function createCategory(
  app: FastifyInstance,
  workspaceId: string,
  userId: string,
  input: {
    name: string;
    slug?: string;
    description?: string | null;
    color?: string | null;
  },
) {
  const slug = slugify(input.slug ?? input.name);
  return app.prisma.category.create({
    data: {
      workspaceId,
      name: input.name,
      slug,
      description: input.description ?? null,
      color: input.color ?? null,
      createdById: userId,
      updatedById: userId,
    },
  });
}
export async function findCategory(
  app: FastifyInstance,
  workspaceId: string,
  id: string,
) {
  return app.prisma.category.findFirst({
    where: { id, workspaceId, deletedAt: null },
  });
}
export async function updateCategory(
  app: FastifyInstance,
  workspaceId: string,
  id: string,
  userId: string,
  input: {
    name?: string;
    slug?: string;
    description?: string | null;
    color?: string | null;
  },
) {
  const { slug, ...rest } = input;
  return app.prisma.category.updateMany({
    where: { id, workspaceId, deletedAt: null },
    data: {
      ...rest,
      ...(slug ? { slug: slugify(slug) } : {}),
      updatedById: userId,
    },
  });
}
export async function deleteCategory(
  app: FastifyInstance,
  workspaceId: string,
  id: string,
) {
  return app.prisma.category.updateMany({
    where: { id, workspaceId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
}
