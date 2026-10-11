-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "color" VARCHAR(7),
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Document" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),
    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Category_id_workspaceId_key" ON "Category"("id", "workspaceId");
CREATE INDEX "Category_workspaceId_deletedAt_name_idx" ON "Category"("workspaceId", "deletedAt", "name");
CREATE INDEX "Document_workspaceId_deletedAt_updatedAt_idx" ON "Document"("workspaceId", "deletedAt", "updatedAt");
CREATE INDEX "Document_categoryId_workspaceId_deletedAt_idx" ON "Document"("categoryId", "workspaceId", "deletedAt");
CREATE UNIQUE INDEX "Category_active_workspace_slug_key" ON "Category"("workspaceId", "slug") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "Document_active_workspace_slug_key" ON "Document"("workspaceId", "slug") WHERE "deletedAt" IS NULL;
ALTER TABLE "Category" ADD CONSTRAINT "Category_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_categoryId_workspaceId_fkey" FOREIGN KEY ("categoryId", "workspaceId") REFERENCES "Category"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;
