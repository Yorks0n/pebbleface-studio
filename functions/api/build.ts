export async function onRequest(context: any) {
    const { request, env } = context;

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const runnerOrigin = env.RUNNER_ORIGIN;
    if (!runnerOrigin) {
      return new Response("Missing RUNNER_ORIGIN", { status: 500 });
    }

    const upstreamUrl = runnerOrigin.replace(/\/$/, "") + "/build";

    try {
      const headers = new Headers(request.headers);
      if (env.RUNNER_TOKEN) headers.set("X-Runner-Token", env.RUNNER_TOKEN);

      const upstream = await fetch(upstreamUrl, {
        method: "POST",
        headers,
        body: request.body,
      });

      const responseHeaders = new Headers(upstream.headers);
      responseHeaders.set(
        "Access-Control-Expose-Headers",
        "Content-Disposition,X-Job-Id,X-Build-Log-Base64,Retry-After"
      );

      return new Response(upstream.body, {
        status: upstream.status,
        headers: responseHeaders,
      });
    } catch (err: any) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Upstream connection failed",
          detail: err.message,
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }