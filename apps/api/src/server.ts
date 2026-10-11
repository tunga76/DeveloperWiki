import { buildApp } from "./app.js";
import { config } from "./config.js";

const app = buildApp();
const port = config.API_PORT;
const host = config.API_HOST;

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error, "API failed to start");
  process.exitCode = 1;
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
}
