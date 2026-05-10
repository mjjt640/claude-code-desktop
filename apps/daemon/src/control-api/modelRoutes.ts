import type { ModelProfilesResponse } from "@lingshu/shared";
import type { FastifyInstance } from "fastify";
import type { LingshuConfig } from "../modules/config/configSchema.js";

export async function registerModelRoutes(app: FastifyInstance, config: LingshuConfig): Promise<void> {
  app.get("/v1/models/profiles", async (): Promise<ModelProfilesResponse> => {
    return {
      defaultProfile: config.app.default_profile,
      profiles: Object.entries(config.profiles).map(([id, profile]) => ({
        id,
        provider: profile.provider,
        model: profile.model,
        label: profile.label ?? id,
        source: "config"
      }))
    };
  });
}
