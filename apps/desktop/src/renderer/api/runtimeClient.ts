import {
  HealthResponseSchema,
  ModelProfilesResponseSchema,
  RuntimeEventSchema,
  type HealthResponse,
  type ModelProfilesResponse,
  type RuntimeEvent
} from "@lingshu/shared";

const runtimeBaseUrl = "http://127.0.0.1:4317";
const runtimeSocketUrl = "ws://127.0.0.1:4317/v1/ws";

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new Error(`Runtime 请求失败：HTTP ${response.status}`);
  }

  return response.json();
}

export async function fetchHealth(): Promise<HealthResponse> {
  const payload = await readJson(await fetch(`${runtimeBaseUrl}/v1/health`));
  return HealthResponseSchema.parse(payload);
}

export async function fetchModelProfiles(): Promise<ModelProfilesResponse> {
  const payload = await readJson(await fetch(`${runtimeBaseUrl}/v1/models/profiles`));
  return ModelProfilesResponseSchema.parse(payload);
}

export function subscribeRuntimeEvents(
  onEvent: (event: RuntimeEvent) => void,
  onError: (message: string) => void
): () => void {
  const socket = new WebSocket(runtimeSocketUrl);

  socket.addEventListener("message", (message) => {
    try {
      onEvent(RuntimeEventSchema.parse(JSON.parse(String(message.data))));
    } catch (error) {
      onError(error instanceof Error ? error.message : "Runtime 事件解析失败");
    }
  });

  socket.addEventListener("error", () => {
    onError("Runtime 事件连接失败");
  });

  return () => {
    socket.close();
  };
}
