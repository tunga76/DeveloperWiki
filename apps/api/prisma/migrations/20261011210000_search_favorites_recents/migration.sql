CREATE TABLE "Favorite" (
  "userId" UUID NOT NULL,
  "documentId" UUID NOT NULL,
  "workspaceId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId", "documentId")
);
CREATE TABLE "RecentDocument" (
  "userId" UUID NOT NULL,
  "documentId" UUID NOT NULL,
  "workspaceId" UUID NOT NULL,
  "lastViewedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecentDocument_pkey" PRIMARY KEY ("userId", "documentId")
);
CREATE UNIQUE INDEX "Document_id_workspaceId_key" ON "Document"("id", "workspaceId");
CREATE INDEX "Favorite_userId_workspaceId_createdAt_idx" ON "Favorite"("userId", "workspaceId", "createdAt");
CREATE INDEX "RecentDocument_userId_workspaceId_lastViewedAt_idx" ON "RecentDocument"("userId", "workspaceId", "lastViewedAt");
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_documentId_workspaceId_fkey" FOREIGN KEY ("documentId", "workspaceId") REFERENCES "Document"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecentDocument" ADD CONSTRAINT "RecentDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecentDocument" ADD CONSTRAINT "RecentDocument_documentId_workspaceId_fkey" FOREIGN KEY ("documentId", "workspaceId") REFERENCES "Document"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Document_search_vector_idx" ON "Document" USING GIN (
  (setweight(to_tsvector('simple', coalesce("title", '')), 'A') || setweight(to_tsvector('simple', coalesce("content", '')), 'B'))
) WHERE "deletedAt" IS NULL;
