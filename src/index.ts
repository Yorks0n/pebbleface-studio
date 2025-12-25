export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    // API: health check
    if (url.pathname === "/api/healthz" && request.method === "GET") {
      return new Response("ok", { status: 200 });
    }

    // API: build proxy
    if (url.pathname === "/api/build" && request.method === "POST") {
      const runnerOrigin = env.RUNNER_ORIGIN || "https://build.pebbleface.com";
      const upstreamUrl = runnerOrigin.replace(/\/$/, "") + "/build";

      const upstream = await fetch(upstreamUrl, {
        method: "POST",
        headers: env.RUNNER_TOKEN ? { "X-Runner-Token": env.RUNNER_TOKEN } : {},
        // 关键：直接透传 body（multipart/json 都可）
        body: request.body,
      });

      const headers = new Headers(upstream.headers);
      // 让前端可读这些头（同域其实也能读，但保留更稳）
      headers.set(
        "Access-Control-Expose-Headers",
        "Content-Disposition,X-Job-Id,X-Build-Log-Base64,Retry-After"
      );
      return new Response(upstream.body, { status: upstream.status, headers });
    }

    // 其它路径：交给静态 assets（你配置了 assets.directory）
    // 注意：Workers 新版 assets 会把静态资源暴露到 env.ASSETS.fetch
    return env.ASSETS.fetch(request);
  },
};
