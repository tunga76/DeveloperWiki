import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import rateLimit from "@fastify/rate-limit";
import databasePlugin from "./plugins/database.js";
import authPlugin from "./plugins/auth.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerWorkspaceRoutes } from "./routes/workspaces.js";
import { registerCategoryRoutes } from "./modules/categories/category.routes.js";
import { registerDocumentRoutes } from "./modules/documents/document.routes.js";
import { registerDiscoveryRoutes } from "./modules/discovery/discovery.routes.js";
import { config } from "./config.js";

type MetricKey = `${string}\u0000${string}\u0000${string}`;

const requestStartedAt = new WeakMap<FastifyRequest, bigint>();
const requestCounts = new Map<MetricKey, number>();
const requestDurations = new Map<
  string,
  { count: number; sumSeconds: number }
>();

function escapeLabel(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n");
}

function renderMetrics(): string {
  const lines = [
    "# HELP developer_wiki_api_up Whether the API process is accepting requests.",
    "# TYPE developer_wiki_api_up gauge",
    "developer_wiki_api_up 1",
    "# HELP developer_wiki_http_requests_total HTTP responses returned by the API.",
    "# TYPE developer_wiki_http_requests_total counter",
  ];

  for (const [key, count] of requestCounts) {
    const [method, route, statusCode] = key.split("\u0000");
    lines.push(
      `developer_wiki_http_requests_total{method="${escapeLabel(method ?? "unknown")}",route="${escapeLabel(route ?? "unknown")}",status_code="${escapeLabel(statusCode ?? "0")}"} ${count}`,
    );
  }

  lines.push(
    "# HELP developer_wiki_http_request_duration_seconds HTTP response duration summary.",
    "# TYPE developer_wiki_http_request_duration_seconds summary",
  );

  for (const [route, duration] of requestDurations) {
    const label = `route="${escapeLabel(route)}"`;
    lines.push(
      `developer_wiki_http_request_duration_seconds_count{${label}} ${duration.count}`,
      `developer_wiki_http_request_duration_seconds_sum{${label}} ${duration.sumSeconds}`,
    );
  }

  return `${lines.join("\n")}\n`;
}

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      redact: ["req.headers.cookie", "req.headers.authorization"],
    },
  });

  app.register(databasePlugin);
  app.register(authPlugin);
  app.register(rateLimit, { global: true, max: 300, timeWindow: "1 minute" });

  app.setErrorHandler((error, _request, reply) => {
    const candidate =
      typeof error === "object" && error !== null
        ? (error as { statusCode?: unknown; code?: unknown; message?: unknown })
        : {};
    const statusCode =
      typeof candidate.statusCode === "number" ? candidate.statusCode : 500;
    if (statusCode >= 500) app.log.error(error);
    return reply.code(statusCode).send({
      error: {
        code:
          typeof candidate.code === "string"
            ? candidate.code
            : "INTERNAL_ERROR",
        message:
          statusCode >= 500
            ? "Beklenmeyen bir hata oluştu."
            : typeof candidate.message === "string"
              ? candidate.message
              : "İstek tamamlanamadı.",
      },
    });
  });

  app.register(
    async (api) => {
      await registerAuthRoutes(api);
    },
    { prefix: "/api/v1/auth" },
  );
  app.register(
    async (api) => {
      await registerWorkspaceRoutes(api);
      await registerCategoryRoutes(api);
      await registerDocumentRoutes(api);
      await registerDiscoveryRoutes(api);
    },
    { prefix: "/api/v1/workspaces" },
  );

  app.addHook("onRequest", async (request) => {
    requestStartedAt.set(request, process.hrtime.bigint());
  });

  app.addHook("onResponse", async (request, reply) => {
    const startedAt = requestStartedAt.get(request);
    if (startedAt === undefined) return;

    const route = request.routeOptions.url ?? "unmatched";
    const method = request.method;
    const key = `${method}\u0000${route}\u0000${reply.statusCode}` as MetricKey;
    requestCounts.set(key, (requestCounts.get(key) ?? 0) + 1);

    const elapsedSeconds =
      Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
    const duration = requestDurations.get(route) ?? { count: 0, sumSeconds: 0 };
    duration.count += 1;
    duration.sumSeconds += elapsedSeconds;
    requestDurations.set(route, duration);
  });

  app.get("/health", async () => ({ status: "ok", service: "api" }));

  app.get("/ready", async (_request, reply) => {
    await app.prisma.$queryRaw`SELECT 1`;
    return reply.send({ status: "ready", service: "api" });
  });

  app.get("/metrics", async (_request, reply) => {
    return reply
      .type("text/plain; version=0.0.4; charset=utf-8")
      .send(renderMetrics());
  });

  return app;
}
