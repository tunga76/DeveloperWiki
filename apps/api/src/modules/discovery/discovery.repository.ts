import type { FastifyInstance } from "fastify";

type SearchRow = {
  id: string;
  title: string;
  slug: string;
  updatedAt: Date;
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  snippet: string;
  rank: number;
};

export async function searchDocuments(
  app: FastifyInstance,
  workspaceId: string,
  query: string,
  limit = 20,
) {
  return app.prisma.$queryRaw<SearchRow[]>`
    WITH q AS (SELECT websearch_to_tsquery('simple', ${query}) AS value),
    ranked AS (
      SELECT d."id", d."title", d."slug", d."updatedAt", c."id" AS "categoryId", c."name" AS "categoryName", c."color" AS "categoryColor",
        ts_rank((setweight(to_tsvector('simple', coalesce(d."title", '')), 'A') || setweight(to_tsvector('simple', coalesce(d."content", '')), 'B')), q.value) AS rank,
        ts_headline('simple', coalesce(d."content", d."title"), q.value, 'MaxWords=28,MinWords=12,ShortWord=2') AS snippet
      FROM "Document" d
      JOIN "Category" c ON c."id" = d."categoryId" AND c."workspaceId" = d."workspaceId"
      CROSS JOIN q
      WHERE d."workspaceId" = ${workspaceId}::uuid AND d."deletedAt" IS NULL AND c."deletedAt" IS NULL
        AND (setweight(to_tsvector('simple', coalesce(d."title", '')), 'A') || setweight(to_tsvector('simple', coalesce(d."content", '')), 'B')) @@ q.value
    )
    SELECT id, title, slug, "updatedAt", "categoryId", "categoryName", "categoryColor", snippet, rank
    FROM ranked ORDER BY rank DESC, "updatedAt" DESC LIMIT ${limit}
  `;
}

export async function dashboardData(
  app: FastifyInstance,
  workspaceId: string,
  userId: string,
) {
  const activeDocument = {
    workspaceId,
    deletedAt: null,
    category: { deletedAt: null },
  };
  const [
    documents,
    categories,
    members,
    latestDocuments,
    favoriteCount,
    recentDocuments,
  ] = await Promise.all([
    app.prisma.document.count({ where: activeDocument }),
    app.prisma.category.count({ where: { workspaceId, deletedAt: null } }),
    app.prisma.workspaceMember.count({ where: { workspaceId } }),
    app.prisma.document.findMany({
      where: activeDocument,
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        slug: true,
        updatedAt: true,
        category: { select: { id: true, name: true, color: true } },
      },
    }),
    app.prisma.favorite.count({
      where: {
        userId,
        workspaceId,
        document: { deletedAt: null, category: { deletedAt: null } },
      },
    }),
    app.prisma.recentDocument.findMany({
      where: {
        userId,
        workspaceId,
        document: { deletedAt: null, category: { deletedAt: null } },
      },
      orderBy: { lastViewedAt: "desc" },
      take: 8,
      include: {
        document: {
          select: {
            id: true,
            title: true,
            slug: true,
            updatedAt: true,
            category: { select: { id: true, name: true, color: true } },
          },
        },
      },
    }),
  ]);
  return {
    counts: { documents, categories, members, favorites: favoriteCount },
    latestDocuments,
    recentDocuments: recentDocuments.map((recent) => ({
      ...recent.document,
      lastViewedAt: recent.lastViewedAt,
    })),
  };
}

export async function listFavorites(
  app: FastifyInstance,
  userId: string,
  workspaceId: string,
  skip: number,
  take: number,
) {
  const where = {
    userId,
    workspaceId,
    document: { deletedAt: null, category: { deletedAt: null } },
  };
  const [items, total] = await Promise.all([
    app.prisma.favorite.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        document: {
          select: {
            id: true,
            title: true,
            slug: true,
            updatedAt: true,
            category: { select: { id: true, name: true, color: true } },
          },
        },
      },
    }),
    app.prisma.favorite.count({ where }),
  ]);
  return {
    favorites: items.map(({ document, createdAt }) => ({
      ...document,
      favoritedAt: createdAt,
    })),
    total,
  };
}

export async function listRecents(
  app: FastifyInstance,
  userId: string,
  workspaceId: string,
  take: number,
) {
  const items = await app.prisma.recentDocument.findMany({
    where: {
      userId,
      workspaceId,
      document: { deletedAt: null, category: { deletedAt: null } },
    },
    orderBy: { lastViewedAt: "desc" },
    take,
    include: {
      document: {
        select: {
          id: true,
          title: true,
          slug: true,
          updatedAt: true,
          category: { select: { id: true, name: true, color: true } },
        },
      },
    },
  });
  return items.map(({ document, lastViewedAt }) => ({
    ...document,
    lastViewedAt,
  }));
}
