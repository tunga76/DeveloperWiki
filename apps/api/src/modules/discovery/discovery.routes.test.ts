import { afterEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";
import authPlugin from "../../plugins/auth.js";
import { registerDiscoveryRoutes } from "./discovery.routes.js";

const workspaceId = "00000000-0000-4000-8000-000000000001";
const otherWorkspaceId = "00000000-0000-4000-8000-000000000002";
const documentId = "00000000-0000-4000-8000-000000000003";
const userId = "00000000-0000-4000-8000-000000000004";

describe("workspace discovery and personal documents", () => {
  const apps: ReturnType<typeof Fastify>[] = [];
  async function makeApp() {
    const fakePrisma = {
      user: {
        findFirst: vi.fn(async () => ({
          id: userId,
          email: "reader@example.test",
          name: "Reader",
        })),
      },
      workspaceMember: {
        findFirst: vi.fn(
          async ({ where }: { where: { workspaceId: string } }) =>
            where.workspaceId === workspaceId ? { role: "READER" } : null,
        ),
        count: vi.fn(async () => 1),
      },
      $queryRaw: vi.fn(
        async (_query: TemplateStringsArray, ..._values: unknown[]) => [
          {
            id: documentId,
            title: "Deployment guide",
            snippet: "deploy safely",
            rank: 0.8,
          },
        ],
      ),
      favorite: {
        findMany: vi.fn(async () => []),
        count: vi.fn(async () => 0),
        findUnique: vi.fn(async () => null),
        upsert: vi.fn(async ({ create }: { create: unknown }) => create),
        deleteMany: vi.fn(async () => ({ count: 1 })),
      },
      recentDocument: {
        findMany: vi.fn(async () => []),
        upsert: vi.fn(async ({ create }: { create: unknown }) => create),
      },
      document: {
        findFirst: vi.fn(
          async ({ where }: { where: { workspaceId: string } }) =>
            where.workspaceId === workspaceId ? { id: documentId } : null,
        ),
        count: vi.fn(async () => 0),
        findMany: vi.fn(async () => []),
      },
      category: { count: vi.fn(async () => 0) },
    };
    const app = Fastify();
    app.decorate("prisma", fakePrisma as never);
    app.register(authPlugin);
    app.register(async (api) => registerDiscoveryRoutes(api), {
      prefix: "/api/v1/workspaces",
    });
    await app.ready();
    apps.push(app);
    const token = app.jwt.sign({ sub: userId, email: "reader@example.test" });
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

  it("requires membership and keeps full text search scoped to the workspace", async () => {
    const { app, fakePrisma, headers } = await makeApp();
    const denied = await app.inject({
      method: "GET",
      url: `/api/v1/workspaces/${otherWorkspaceId}/search?q=deploy`,
      headers,
    });
    expect(denied.statusCode).toBe(404);
    expect(fakePrisma.$queryRaw).not.toHaveBeenCalled();
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/workspaces/${workspaceId}/search?q=deploy`,
      headers,
    });
    expect(response.statusCode).toBe(200);
    expect(fakePrisma.$queryRaw).toHaveBeenCalledOnce();
    expect(fakePrisma.$queryRaw.mock.calls[0]?.[1]).toBe("deploy");
    expect(fakePrisma.$queryRaw.mock.calls[0]?.[2]).toBe(workspaceId);
  });

  it("rejects queries shorter than two characters", async () => {
    const { app, fakePrisma, headers } = await makeApp();
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/workspaces/${workspaceId}/search?q=a`,
      headers,
    });
    expect(response.statusCode).toBe(400);
    expect(fakePrisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("allows a reader to favorite a workspace document idempotently", async () => {
    const { app, fakePrisma, headers } = await makeApp();
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/workspaces/${workspaceId}/documents/${documentId}/favorite`,
      headers,
      payload: {},
    });
    expect(response.statusCode, response.body).toBe(201);
    expect(fakePrisma.favorite.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_documentId: { userId, documentId } },
        create: { userId, documentId, workspaceId },
      }),
    );
  });

  it("lists favorites for only the signed-in user and requested workspace", async () => {
    const { app, fakePrisma, headers } = await makeApp();
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/workspaces/${workspaceId}/favorites?page=1&pageSize=10`,
      headers,
    });
    expect(response.statusCode).toBe(200);
    expect(fakePrisma.favorite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId, workspaceId }),
        skip: 0,
        take: 10,
      }),
    );
  });

  it("records recent views only after a scoped active document lookup", async () => {
    const { app, fakePrisma, headers } = await makeApp();
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/workspaces/${workspaceId}/documents/${documentId}/recent`,
      headers,
      payload: {},
    });
    expect(response.statusCode, response.body).toBe(200);
    expect(fakePrisma.recentDocument.upsert).toHaveBeenCalledOnce();
    const hidden = await app.inject({
      method: "POST",
      url: `/api/v1/workspaces/${workspaceId}/documents/${documentId}/favorite`,
      headers,
      payload: {},
    });
    expect(hidden.statusCode).toBe(201);
  });
});
