import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import authPlugin from "../plugins/auth.js";
import { registerWorkspaceRoutes } from "./workspaces.js";

describe("workspace authorization", () => {
  const apps: ReturnType<typeof Fastify>[] = [];

  async function makeApp() {
    const app = Fastify();
    const fakePrisma = {
      user: {
        findFirst: vi.fn(async ({ where }: { where: { id: string } }) => ({
          id: where.id,
          email: "member@example.test",
          name: "Member",
        })),
      },
      workspaceMember: {
        findMany: vi.fn(async () => []),
        findFirst: vi.fn(async () => null),
      },
    };
    app.decorate("prisma", fakePrisma as never);
    app.register(authPlugin);
    app.register(async (api) => registerWorkspaceRoutes(api), {
      prefix: "/api/v1/workspaces",
    });
    await app.ready();
    apps.push(app);
    return { app, fakePrisma };
  }

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it("rejects anonymous workspace reads", async () => {
    const { app } = await makeApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/workspaces",
    });
    expect(response.statusCode).toBe(401);
  });

  it("hides a workspace from authenticated users who are not members", async () => {
    const { app, fakePrisma } = await makeApp();
    const accessToken = app.jwt.sign({
      sub: "user-b",
      email: "member@example.test",
    });
    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/workspaces/00000000-0000-4000-8000-000000000001",
      headers: {
        origin: "http://localhost:3000",
        cookie: `dw_access=${accessToken}; dw_csrf=csrf-token`,
        "x-csrf-token": "csrf-token",
        "content-type": "application/json",
      },
      payload: { name: "Unauthorized rename" },
    });
    expect(response.statusCode).toBe(404);
    expect(fakePrisma.workspaceMember.findFirst).toHaveBeenCalledWith({
      where: {
        workspaceId: "00000000-0000-4000-8000-000000000001",
        userId: "user-b",
        workspace: { deletedAt: null },
      },
    });
  });
});
