import { afterEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";
import authPlugin from "../../plugins/auth.js";
import { registerCategoryRoutes } from "./category.routes.js";
import { registerDocumentRoutes } from "../documents/document.routes.js";

const workspaceA = "00000000-0000-4000-8000-000000000001";
const workspaceB = "00000000-0000-4000-8000-000000000002";
const categoryId = "00000000-0000-4000-8000-000000000003";
const documentId = "00000000-0000-4000-8000-000000000004";
const userId = "00000000-0000-4000-8000-000000000005";
const currentUpdatedAt = new Date("2026-10-11T12:00:00.000Z");

describe("category and document authorization", () => {
  const apps: ReturnType<typeof Fastify>[] = [];

  async function makeApp(role: "ADMIN" | "EDITOR" | "READER" | null) {
    const fakePrisma = {
      user: {
        findFirst: vi.fn(async () => ({
          id: userId,
          email: "member@example.test",
          name: "Member",
        })),
      },
      workspaceMember: {
        findFirst: vi.fn(
          async ({ where }: { where: { workspaceId: string } }) =>
            where.workspaceId === workspaceA && role ? { role } : null,
        ),
      },
      category: {
        findFirst: vi.fn(
          async ({
            where,
          }: {
            where: { workspaceId: string; id?: string; deletedAt?: null };
          }) =>
            where.workspaceId === workspaceA &&
            (where.id === undefined || where.id === categoryId)
              ? {
                  id: categoryId,
                  workspaceId: workspaceA,
                  name: "Platform",
                  deletedAt: null,
                }
              : null,
        ),
        findMany: vi.fn(async () => []),
        create: vi.fn(async ({ data }: { data: unknown }) => data),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      document: {
        findMany: vi.fn(async () => []),
        count: vi.fn(async () => 0),
        findFirst: vi.fn(
          async ({ where }: { where: { workspaceId: string } }) =>
            where.workspaceId === workspaceA
              ? {
                  id: documentId,
                  workspaceId: workspaceA,
                  categoryId,
                  title: "Runbook",
                  content: "old",
                  updatedAt: currentUpdatedAt,
                  deletedAt: null,
                }
              : null,
        ),
        create: vi.fn(async ({ data }: { data: unknown }) => data),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      documentVersion: {
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
        create: vi.fn(async ({ data }: { data: unknown }) => data),
      },
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(fakePrisma as never),
      ),
    };
    const app = Fastify();
    app.decorate("prisma", fakePrisma as never);
    app.register(authPlugin);
    app.register(
      async (api) => {
        await registerCategoryRoutes(api);
        await registerDocumentRoutes(api);
      },
      { prefix: "/api/v1/workspaces" },
    );
    await app.ready();
    apps.push(app);
    const token = app.jwt.sign({ sub: userId, email: "member@example.test" });
    return {
      app,
      fakePrisma,
      headers: {
        origin: "http://localhost:3000",
        cookie: `dw_access=${token}; dw_csrf=csrf-token`,
        "x-csrf-token": "csrf-token",
        "content-type": "application/json",
      },
    };
  }
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it("allows editors to create a category within their workspace", async () => {
    const { app, fakePrisma, headers } = await makeApp("EDITOR");
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/workspaces/${workspaceA}/categories`,
      headers,
      payload: { name: "Platform" },
    });
    expect(response.statusCode).toBe(201);
    expect(fakePrisma.category.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId: workspaceA,
          createdById: userId,
        }),
      }),
    );
  });

  it("rejects reader writes", async () => {
    const { app, headers } = await makeApp("READER");
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/workspaces/${workspaceA}/categories`,
      headers,
      payload: { name: "Platform" },
    });
    expect(response.statusCode).toBe(403);
  });

  it("hides another tenant and never looks up categories across workspaces", async () => {
    const { app, fakePrisma, headers } = await makeApp("EDITOR");
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/workspaces/${workspaceB}/documents`,
      headers,
      payload: { title: "Secret", categoryId },
    });
    expect(response.statusCode).toBe(404);
    expect(fakePrisma.category.findFirst).not.toHaveBeenCalled();
  });

  it("rejects a category from another workspace when creating a document", async () => {
    const { app, fakePrisma, headers } = await makeApp("EDITOR");
    fakePrisma.category.findFirst.mockResolvedValue(null as never);
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/workspaces/${workspaceA}/documents`,
      headers,
      payload: { title: "Secret", categoryId },
    });
    expect(response.statusCode).toBe(404);
    expect(fakePrisma.category.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspaceId: workspaceA,
          deletedAt: null,
        }),
      }),
    );
  });

  it("returns only the active tenant scope when listing documents", async () => {
    const { app, fakePrisma, headers } = await makeApp("READER");
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/workspaces/${workspaceA}/documents?page=2&pageSize=5`,
      headers,
    });
    expect(response.statusCode).toBe(200);
    expect(fakePrisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          workspaceId: workspaceA,
          deletedAt: null,
          category: { deletedAt: null },
        },
        skip: 5,
        take: 5,
      }),
    );
  });

  it("creates one immutable version when content changes", async () => {
    const { app, fakePrisma, headers } = await makeApp("EDITOR");
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/workspaces/${workspaceA}/documents/${documentId}`,
      headers,
      payload: {
        content: "new content",
        expectedUpdatedAt: currentUpdatedAt.toISOString(),
      },
    });
    expect(response.statusCode).toBe(200);
    expect(fakePrisma.$transaction).toHaveBeenCalledOnce();
    expect(fakePrisma.documentVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        documentId,
        version: 1,
        content: "new content",
        createdById: userId,
      }),
    });
  });

  it("does not create a version when content is unchanged", async () => {
    const { app, fakePrisma, headers } = await makeApp("EDITOR");
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/workspaces/${workspaceA}/documents/${documentId}`,
      headers,
      payload: {
        content: "old",
        expectedUpdatedAt: currentUpdatedAt.toISOString(),
      },
    });
    expect(response.statusCode).toBe(200);
    expect(fakePrisma.documentVersion.create).not.toHaveBeenCalled();
  });

  it("rejects a stale editor update without writing a version", async () => {
    const { app, fakePrisma, headers } = await makeApp("EDITOR");
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/workspaces/${workspaceA}/documents/${documentId}`,
      headers,
      payload: {
        content: "overwritten",
        expectedUpdatedAt: "2026-10-10T12:00:00.000Z",
      },
    });
    expect(response.statusCode).toBe(409);
    expect(fakePrisma.document.updateMany).not.toHaveBeenCalled();
    expect(fakePrisma.documentVersion.create).not.toHaveBeenCalled();
  });
});
