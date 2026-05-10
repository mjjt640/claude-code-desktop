import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/modules/config/loadConfig.js";

async function makeTempDir(prefix: string): Promise<string> {
  return await fsTemp(path.join(os.tmpdir(), prefix));
}

async function fsTemp(prefix: string): Promise<string> {
  const { mkdtemp } = await import("node:fs/promises");
  return mkdtemp(prefix);
}

describe("loadConfig", () => {
  it("loads the built-in default config when no files exist", async () => {
    const homeDir = await makeTempDir("lingshu-home-");
    const workspaceDir = await makeTempDir("lingshu-workspace-");

    const result = await loadConfig({ homeDir, workspaceDir });

    expect(result.config.app.default_profile).toBe("local");
    expect(result.config.profiles.local.provider).toBe("ollama_local");
    expect(result.sources).toContain("built-in defaults");
  });

  it("merges user config and workspace local override by key", async () => {
    const homeDir = await makeTempDir("lingshu-home-");
    const workspaceDir = await makeTempDir("lingshu-workspace-");
    await mkdir(path.join(homeDir, ".lingshu"), { recursive: true });

    await writeFile(
      path.join(homeDir, ".lingshu", "config.toml"),
      `
version = 1

[app]
default_profile = "fast"

[providers.openai_main]
type = "openai"
base_url = "https://api.openai.com/v1"
auth = { source = "env", env = "OPENAI_API_KEY" }

[profiles.fast]
provider = "openai_main"
model = "gpt-test"
label = "快速模型"
`
    );

    await writeFile(
      path.join(workspaceDir, ".lingshu.local.toml"),
      `
version = 1

[profiles.fast]
provider = "openai_main"
model = "gpt-workspace"
label = "工作区快速模型"
`
    );

    const result = await loadConfig({ homeDir, workspaceDir });

    expect(result.config.app.default_profile).toBe("fast");
    expect(result.config.providers.openai_main.type).toBe("openai");
    expect(result.config.profiles.fast.model).toBe("gpt-workspace");
    expect(result.sources).toEqual([
      "built-in defaults",
      path.join(homeDir, ".lingshu", "config.toml"),
      path.join(workspaceDir, ".lingshu.local.toml")
    ]);
  });
});
