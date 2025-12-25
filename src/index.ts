export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    // /api/healthz
    if (url.pathname === "/api/healthz" && request.method === "GET") {
      return new Response("ok", { status: 200 });
    }

    // /api/build -> RUNNER_ORIGIN/build
    if (url.pathname === "/api/build") {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }

      const runnerOrigin = env.RUNNER_ORIGIN as string | undefined;
      if (!runnerOrigin) return new Response("Missing RUNNER_ORIGIN", { status: 500 });

      const upstreamUrl = runnerOrigin.replace(/\/$/, "") + "/build";

      try {
        const upstream = await fetch(upstreamUrl, {
          method: "POST",
          headers: {
            ...(env.RUNNER_TOKEN ? { "X-Runner-Token": env.RUNNER_TOKEN } : {}),
          },
          body: request.body, // 透传 multipart/json
        });

        const headers = new Headers(upstream.headers);
        headers.set(
          "Access-Control-Expose-Headers",
          "Content-Disposition,X-Job-Id,X-Build-Log-Base64,Retry-After"
        );
        return new Response(upstream.body, { status: upstream.status, headers });
      } catch (err: any) {
        return new Response(
          JSON.stringify({ ok: false, error: "Upstream connection failed", detail: err?.message ?? String(err) }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 其它路径：静态站点
    return env.ASSETS.fetch(request);
  },
};
