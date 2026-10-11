import type { FastifyInstance } from "fastify";
import { slugify } from "../../lib/security.js";

export async function listDocuments(
  app: FastifyInstance,
  workspaceId: string,
  categoryId: string | undefined,
  skip: number,
  take: number,
) {
  const where = {
    workspaceId,
    deletedAt: null,
    category: { deletedAt: null },
    ...(categoryId ? { categoryId } : {}),
  };
  const [documents, total] = await Promise.all([
    app.prisma.document.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      include: { category: { select: { id: true, name: true, color: true } } },
    }),
    app.prisma.document.count({ where }),
  ]);
  return { documents, total };
}
export async function createDocument(
  app: FastifyInstance,
  workspaceId: string,
  categoryId: string,
  userId: string,
  input: { title: string; slug?: string; content?: string },
) {
  return app.prisma.document.create({
    data: {
      workspaceId,
      categoryId,
      title: input.title,
      slug: slugify(input.slug ?? input.title),
      content: input.content ?? "",
      createdById: userId,
      updatedById: userId,
    },
  });
}
export async function findDocument(
  app: FastifyInstance,
  workspaceId: string,
  id: string,
) {
  return app.prisma.document.findFirst({
    where: { id, workspaceId, deletedAt: null, category: { deletedAt: null } },
    include: { category: { select: { id: true, name: true } } },
  });
}
export async function updateDocument(
  app: FastifyInstance,
  workspaceId: string,
  id: string,
  userId: string,
  input: {
    title?: string;
    slug?: string;
    categoryId?: string;
    content?: string;
    expectedUpdatedAt: Date;
  },
) {
  const { slug, expectedUpdatedAt, ...rest } = input;
  return app.prisma.$transaction(async (tx) => {
    const current = await tx.document.findFirst({
      where: {
        id,
        workspaceId,
        deletedAt: null,
        category: { deletedAt: null },
      },
    });
    if (!current) return { kind: "not-found" as const };
    if (current.updatedAt.getTime() !== expectedUpdatedAt.getTime())
      return { kind: "conflict" as const, current };

    const contentChanged =
      rest.content !== undefined && rest.content !== current.content;
    const update = await tx.document.updateMany({
      where: {
        id,
        workspaceId,
        deletedAt: null,
        updatedAt: expectedUpdatedAt,
        category: { deletedAt: null },
      },
      data: {
        ...rest,
        ...(slug ? { slug: slugify(slug) } : {}),
        updatedById: userId,
      },
    });
    if (update.count !== 1) return { kind: "conflict" as const };

    if (contentChanged) {
      const latest = await tx.documentVersion.findFirst({
        where: { documentId: id },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      await tx.documentVersion.create({
        data: {
          documentId: id,
          version: (latest?.version ?? 0) + 1,
          title: rest.title ?? current.title,
          content: rest.content!,
          createdById: userId,
        },
      });
    }
    const updated = await tx.document.findFirst({
      where: {
        id,
        workspaceId,
        deletedAt: null,
        category: { deletedAt: null },
      },
      include: { category: { select: { id: true, name: true } } },
    });
    return { kind: "updated" as const, document: updated };
  });
}

export async function listDocumentVersions(
  app: FastifyInstance,
  workspaceId: string,
  documentId: string,
) {
  const document = await app.prisma.document.findFirst({
    where: {
      id: documentId,
      workspaceId,
      deletedAt: null,
      category: { deletedAt: null },
    },
    select: { id: true },
  });
  if (!document) return null;
  return app.prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      title: true,
      content: true,
      createdById: true,
      createdAt: true,
    },
  });
}
export async function deleteDocument(
  app: FastifyInstance,
  workspaceId: string,
  id: string,
) {
  return app.prisma.document.updateMany({
    where: { id, workspaceId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
}
