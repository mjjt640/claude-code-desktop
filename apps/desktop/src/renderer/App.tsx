import type { HealthResponse, ModelProfileSummary, RuntimeEvent } from "@lingshu/shared";
import { useEffect, useMemo, useState } from "react";
import { fetchHealth, fetchModelProfiles, subscribeRuntimeEvents } from "./api/runtimeClient";
import "./styles.css";

declare global {
  interface Window {
    lingshu?: {
      platform: string;
    };
  }
}

type RuntimeStatus = "checking" | "connected" | "disconnected";

const platformName = window.lingshu?.platform ?? "unknown";

function formatStartedAt(health: HealthResponse | null): string {
  if (!health) {
    return "等待 Runtime 响应";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "medium"
  }).format(new Date(health.startedAt));
}

function describeEvent(event: RuntimeEvent): string {
  if (event.type === "runtime.ready") {
    return `Runtime 已就绪，启动时间 ${formatStartedAt({
      service: event.service,
      status: "ok",
      version: "",
      startedAt: event.startedAt
    })}`;
  }

  if (event.type === "model.profiles_loaded") {
    return `模型 profile 已加载：${event.count} 个`;
  }

  return event.message;
}

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [profiles, setProfiles] = useState<ModelProfileSummary[]>([]);
  const [defaultProfile, setDefaultProfile] = useState<string | null>(null);
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [status, setStatus] = useState<RuntimeStatus>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadRuntimeState(): Promise<void> {
      setStatus("checking");

      try {
        const [healthResponse, profileResponse] = await Promise.all([fetchHealth(), fetchModelProfiles()]);
        if (!active) {
          return;
        }

        setHealth(healthResponse);
        setProfiles(profileResponse.profiles);
        setDefaultProfile(profileResponse.defaultProfile);
        setStatus("connected");
        setError(null);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setStatus("disconnected");
        setError(loadError instanceof Error ? loadError.message : "Runtime 连接失败");
      }
    }

    void loadRuntimeState();

    const unsubscribe = subscribeRuntimeEvents(
      (event) => {
        setEvents((current) => [event, ...current].slice(0, 20));
        if (event.type === "runtime.ready") {
          setStatus("connected");
        }
      },
      (message) => {
        setError(message);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const statusText = useMemo(() => {
    if (status === "connected") {
      return "已连接";
    }

    if (status === "checking") {
      return "检查中";
    }

    return "未连接";
  }, [status]);

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brandBlock">
            <span className="brandMark">灵</span>
          <div>
            <h1>灵枢</h1>
            <p>本地 Runtime 控制台</p>
          </div>
        </div>

        <section className="runtimePanel" aria-label="Runtime 连接状态">
          <div className="sectionTitle">
            <h2>Runtime</h2>
            <span className={`statusBadge ${status}`}>{statusText}</span>
          </div>
          <dl className="runtimeFacts">
            <div>
              <dt>服务</dt>
              <dd>{health?.service ?? "lingshu-runtime"}</dd>
            </div>
            <div>
              <dt>版本</dt>
              <dd>{health?.version ?? "未知"}</dd>
            </div>
            <div>
              <dt>启动时间</dt>
              <dd>{formatStartedAt(health)}</dd>
            </div>
            <div>
              <dt>平台</dt>
              <dd>{platformName}</dd>
            </div>
          </dl>
          {error ? <p className="errorText">{error}</p> : null}
        </section>
      </aside>

      <section className="workspace">
        <header className="workspaceHeader">
          <div>
            <p className="eyebrow">第一阶段</p>
            <h2>模型 Profile</h2>
          </div>
          <div className="summaryStrip">
            <span>{profiles.length} 个 profile</span>
            <span>默认：{defaultProfile ?? "未设置"}</span>
          </div>
        </header>

        <section className="profileGrid" aria-label="模型 profile 列表">
          {profiles.length === 0 ? (
            <div className="emptyState">
              <strong>还没有读取到模型 profile</strong>
              <p>确认 Runtime daemon 已在 127.0.0.1:4317 运行后，桌面端会自动显示配置。</p>
            </div>
          ) : null}

          {profiles.map((profile) => (
            <article className="profileCard" key={profile.id}>
              <div>
                <strong>{profile.label}</strong>
                {defaultProfile === profile.id ? <span className="defaultTag">默认</span> : null}
              </div>
              <dl>
                <div>
                  <dt>提供方</dt>
                  <dd>{profile.provider}</dd>
                </div>
                <div>
                  <dt>模型</dt>
                  <dd>
                    <code>{profile.model}</code>
                  </dd>
                </div>
                <div>
                  <dt>来源</dt>
                  <dd>{profile.source}</dd>
                </div>
              </dl>
            </article>
          ))}
        </section>

        <section className="eventPanel" aria-label="Runtime 事件列表">
          <div className="sectionTitle">
            <h2>Runtime 事件</h2>
            <span>{events.length}/20</span>
          </div>
          <div className="eventList">
            {events.length === 0 ? <p className="muted">暂无事件</p> : null}
            {events.map((event, index) => (
              <article className="eventItem" key={`${event.type}-${index}`}>
                <span>{event.type}</span>
                <p>{describeEvent(event)}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
