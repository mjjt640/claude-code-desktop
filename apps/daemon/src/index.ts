import { createServer } from "node:http";
import { createDaemonApp } from "./bootstrap/createDaemonApp.js";
import { attachEventSocket } from "./control-api/eventSocket.js";

const port = Number(process.env.LINGSHU_RUNTIME_PORT ?? 4317);
const host = "127.0.0.1";
const workspaceDir = process.env.LINGSHU_WORKSPACE_DIR ?? process.cwd();

const app = await createDaemonApp({ workspaceDir });
const server = createServer((request, response) => {
  app.server.emit("request", request, response);
});

attachEventSocket(server, app.eventBus);

server.listen(port, host, () => {
  console.log(`lingshu-runtime listening on http://${host}:${port}`);
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
