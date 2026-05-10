import { describe, expect, it } from "vitest";
import { createDaemonApp } from "../src/bootstrap/createDaemonApp.js";

describe("daemon HTTP routes", () => {
  it("returns health status", async () => {
    const app = await createDaemonApp({
      workspaceDir: process.cwd(),
      startedAt: "2026-05-09T00:00:00.000Z"
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      service: "lingshu-runtime",
      status: "ok",
      version: "0.1.0",
      startedAt: "2026-05-09T00:00:00.000Z"
    });
  });

  it("returns configured model profiles", async () => {
    const app = await createDaemonApp({
      workspaceDir: process.cwd(),
      startedAt: "2026-05-09T00:00:00.000Z"
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/models/profiles"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      defaultProfile: "local",
      profiles: [
        {
          id: "local",
          provider: "ollama_local",
          model: "llama3.2",
          label: "本地模型",
          source: "config"
        }
      ]
    });
  });
});
